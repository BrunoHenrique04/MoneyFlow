import { addMonths } from 'date-fns'
import { prisma } from '../prisma'
import { recalculate } from '../brain'
import type { CreateRecurringTemplateInput, UpdateRecurringTemplateInput } from '@moneyflow/shared'

const RECALC_HORIZON = 12

function monthsFrom(startMonth: string, count: number): string[] {
  const [y, m] = startMonth.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const d = addMonths(new Date(y, m - 1, 1), i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

async function getUserId() {
  const user = await prisma.user.findFirstOrThrow()
  return user.id
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function buildDueDate(month: string, dayOfMonth: number): Date {
  const [y, m] = month.split('-').map(Number)
  const day = Math.min(dayOfMonth, new Date(y, m, 0).getDate()) // clamp to month's last day
  return new Date(y, m - 1, day)
}

export async function generateForMonth(templateId: string, month: string) {
  const template = await prisma.recurringTemplate.findFirstOrThrow({ where: { id: templateId } })

  const dueDate = buildDueDate(month, template.dayOfMonth)
  const monthStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1)
  const monthEnd = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 1)

  const existing = await prisma.transaction.findFirst({
    where: { recurringTemplateId: templateId, dueDate: { gte: monthStart, lt: monthEnd } },
  })

  if (existing) return null // idempotent

  return prisma.transaction.create({
    data: {
      userId: template.userId,
      accountId: template.accountId,
      categoryId: template.categoryId,
      recurringTemplateId: template.id,
      description: template.description,
      amount: template.amount,
      type: 'FIXED',
      utilityTag: template.utilityTag,
      status: 'PENDING',
      dueDate,
      notes: template.notes ?? null,
    },
  })
}

export async function generateAllForMonth(month: string) {
  const templates = await prisma.recurringTemplate.findMany({
    where: {
      isActive: true,
      startMonth: { lte: month },
      OR: [{ endMonth: null }, { endMonth: { gte: month } }],
    },
  })

  const created: string[] = []
  for (const tpl of templates) {
    const tx = await generateForMonth(tpl.id, month)
    if (tx) {
      created.push(tx.id)
      recalculate(tpl.userId, [month]).catch(console.error)
    }
  }

  return { generated: created.length }
}

export async function listTemplates() {
  const userId = await getUserId()
  return prisma.recurringTemplate.findMany({
    where: { userId },
    include: { account: true, category: true },
    orderBy: { description: 'asc' },
  })
}

export async function createTemplate(input: CreateRecurringTemplateInput) {
  const userId = await getUserId()
  const template = await prisma.recurringTemplate.create({
    data: { ...input, userId },
    include: { account: true, category: true },
  })

  // Generate real transactions + recalculate for all active months in the next horizon
  const today = currentMonth()
  const start = template.startMonth > today ? template.startMonth : today
  const months = monthsFrom(start, RECALC_HORIZON).filter(
    (m) => !template.endMonth || m <= template.endMonth,
  )
  for (const m of months) {
    await generateForMonth(template.id, m)
  }
  if (months.length) recalculate(userId, months).catch(console.error)

  return template
}

export async function updateTemplate(id: string, input: UpdateRecurringTemplateInput) {
  const existing = await prisma.recurringTemplate.findFirstOrThrow({ where: { id } })
  const updated = await prisma.recurringTemplate.update({
    where: { id },
    data: input,
    include: { account: true, category: true },
  })

  // Recalculate all months that this template covers so Comprometido stays fresh
  const months = monthsFrom(currentMonth(), RECALC_HORIZON).filter(
    (m) => !updated.endMonth || m <= updated.endMonth,
  )
  if (months.length) recalculate(existing.userId, months).catch(console.error)

  return updated
}

export async function deactivateTemplate(id: string) {
  const existing = await prisma.recurringTemplate.findFirstOrThrow({ where: { id } })
  const updated = await prisma.recurringTemplate.update({
    where: { id },
    data: { isActive: false },
  })

  // Recalculate future months so they no longer count this template in Comprometido
  recalculate(existing.userId, monthsFrom(currentMonth(), RECALC_HORIZON)).catch(console.error)

  return updated
}
