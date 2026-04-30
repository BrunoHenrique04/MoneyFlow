import { z } from 'zod'

const utilityTagEnum = z.enum(['ESSENTIAL', 'NON_ESSENTIAL', 'INVESTMENT'])

export const CreateRecurringTemplateSchema = z.object({
  type: z.enum(['FIXED', 'INCOME']).default('FIXED'),
  description: z.string().min(1).max(100),
  amount: z.number().positive(),
  accountId: z.string().cuid(),
  categoryId: z.string().cuid(),
  utilityTag: utilityTagEnum,
  dayOfMonth: z.number().int().min(1).max(28),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/),
  endMonth: z.string().regex(/^\d{4}-\d{2}$/).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export const UpdateRecurringTemplateSchema = CreateRecurringTemplateSchema
  .omit({ startMonth: true })
  .partial()

export type CreateRecurringTemplateInput = z.infer<typeof CreateRecurringTemplateSchema>
export type UpdateRecurringTemplateInput = z.infer<typeof UpdateRecurringTemplateSchema>
