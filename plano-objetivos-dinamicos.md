# Plano de Execução — Objetivos Dinâmicos + Aportes Mensais

> Consultar este arquivo antes de cada etapa para não perder contexto.

---

## Visão Geral

Redesenho completo do módulo de Objetivos para suportar 4 modos dinâmicos de meta, rastreamento de aportes por mês (GoalDeposit), cálculo automático do aporte pelo Brain, e UI didática no GoalCard.

---

## 4 Modos de Objetivo

| goalMode | Campos do usuário | O sistema calcula |
|---|---|---|
| `DEADLINE_TARGET` | targetAmount + targetDate | monthlyAporte = (alvo - guardado) / mesesRestantes |
| `FIXED_APORTE_TARGET` | fixedMonthlyAporte + targetAmount | estimatedDeadline dinâmico |
| `FIXED_APORTE_DEADLINE` | fixedMonthlyAporte + targetDate | projectedTotal = guardado + aporte × meses |
| `FREE_SAVING` | fixedMonthlyAporte | acumula indefinidamente, sem encerramento automático |

**Regra de detecção do modo no formulário (frontend):**
- targetAmount + targetDate preenchidos, aporte vazio → DEADLINE_TARGET
- aporte + targetAmount, sem prazo → FIXED_APORTE_TARGET
- aporte + prazo, sem targetAmount → FIXED_APORTE_DEADLINE
- só aporte → FREE_SAVING

---

## Etapa 1 — Schema Prisma

**Arquivo:** `packages/api/prisma/schema.prisma`

### Mudanças em `Goal`

```prisma
model Goal {
  // campos novos/alterados:
  targetAmount       Float?    // nullable (FREE_SAVING e FIXED_APORTE_DEADLINE não têm)
  targetDate         DateTime? // nullable (FREE_SAVING e FIXED_APORTE_TARGET não têm)
  fixedMonthlyAporte Float?    // valor por mês definido pelo usuário (null = Brain calcula)
  goalMode           String    @default("DEADLINE_TARGET")
  monthlyAporte      Float     @default(0) // sempre gravado pelo Brain após recalculate

  // relação nova:
  deposits GoalDeposit[]
}
```

### Nova tabela `GoalDeposit`

```prisma
model GoalDeposit {
  id     String   @id @default(cuid())
  goalId String
  userId String
  month  String   // "YYYY-MM"
  amount Float
  note   String?
  paidAt DateTime @default(now())

  goal Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])

  @@index([goalId, month])
  @@index([userId, month])
}
```

### `User` model — adicionar relação
```prisma
goalDeposits GoalDeposit[]
```

**Atenção:** `savedAmount` deixa de ser escrito manualmente. Após qualquer `GoalDeposit`, o serviço recalcula via `SUM`:
```typescript
savedAmount = await prisma.goalDeposit.aggregate({ _sum: { amount: true }, where: { goalId } })
```

**Após editar schema:** rodar `pnpm turbo db:migrate` (ou `prisma migrate dev --name goal-deposits`).

---

## Etapa 2 — Shared Package

**Arquivo:** `packages/shared/src/schemas/goal.ts`

### CreateGoalSchema — discriminated union por modo

```typescript
export const CreateGoalSchema = z.discriminatedUnion('goalMode', [
  // DEADLINE_TARGET
  z.object({
    goalMode: z.literal('DEADLINE_TARGET'),
    name: z.string().min(1).max(100),
    targetAmount: z.number().positive(),
    targetDate: z.string().datetime(),
    priority: z.enum(['HIGH','MEDIUM','LOW']).default('MEDIUM'),
    savedAmount: z.number().nonnegative().default(0),
  }),
  // FIXED_APORTE_TARGET
  z.object({
    goalMode: z.literal('FIXED_APORTE_TARGET'),
    name: z.string().min(1).max(100),
    targetAmount: z.number().positive(),
    fixedMonthlyAporte: z.number().positive(),
    priority: z.enum(['HIGH','MEDIUM','LOW']).default('MEDIUM'),
    savedAmount: z.number().nonnegative().default(0),
  }),
  // FIXED_APORTE_DEADLINE
  z.object({
    goalMode: z.literal('FIXED_APORTE_DEADLINE'),
    name: z.string().min(1).max(100),
    targetDate: z.string().datetime(),
    fixedMonthlyAporte: z.number().positive(),
    priority: z.enum(['HIGH','MEDIUM','LOW']).default('MEDIUM'),
    savedAmount: z.number().nonnegative().default(0),
  }),
  // FREE_SAVING
  z.object({
    goalMode: z.literal('FREE_SAVING'),
    name: z.string().min(1).max(100),
    fixedMonthlyAporte: z.number().positive(),
    priority: z.enum(['HIGH','MEDIUM','LOW']).default('MEDIUM'),
    savedAmount: z.number().nonnegative().default(0),
  }),
])

export const GoalDepositSchema = z.object({
  amount: z.number().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(), // default: mês atual
  note: z.string().max(200).optional(),
})
```

### types.ts — Goal type atualizado

```typescript
export type GoalMode = 'DEADLINE_TARGET' | 'FIXED_APORTE_TARGET' | 'FIXED_APORTE_DEADLINE' | 'FREE_SAVING'

export interface Goal {
  id: string
  userId: string
  name: string
  goalMode: GoalMode
  targetAmount: number | null
  savedAmount: number
  targetDate: string | null
  fixedMonthlyAporte: number | null
  priority: GoalPriority
  status: GoalStatus
  monthlyAporte: number
  // campos calculados no enrich:
  progressPercent: number     // null para FREE_SAVING
  monthsRemaining: number | null
  depositedThisMonth: number
  remainingThisMonth: number
  estimatedDeadline: string | null  // para FIXED_APORTE_TARGET
  projectedTotal: number | null     // para FIXED_APORTE_DEADLINE
  onTrack: boolean
  depositHistory: GoalDepositSummary[]
  createdAt: string
  updatedAt: string
}

export interface GoalDepositSummary {
  month: string
  deposited: number
  expected: number
}
```

---

## Etapa 3 — Brain

### 3a. `brain/types.ts`

`GoalWithAllocation` precisa de `goalMode`, `fixedMonthlyAporte`, `targetAmount` (nullable), `targetDate` (nullable), `depositedThisMonth`.

```typescript
export interface GoalWithAllocation {
  id: string
  name: string
  targetAmount: number | null
  savedAmount: number
  targetDate: Date | null
  priority: string
  status: string
  goalMode: string
  fixedMonthlyAporte: number | null
  monthlyAporte: number
  depositedThisMonth: number   // ← novo: carregado pelo recalculate
  allocatedAporte?: number
  onTrackWarning?: boolean
}
```

### 3b. `brain/goal-allocator.ts`

```typescript
import { differenceInMonths } from 'date-fns'

export function computeNeededAporte(goal: GoalWithAllocation): number {
  const { goalMode, targetAmount, savedAmount, targetDate, fixedMonthlyAporte } = goal
  if (goalMode === 'FREE_SAVING' || goalMode === 'FIXED_APORTE_DEADLINE' || goalMode === 'FIXED_APORTE_TARGET') {
    return fixedMonthlyAporte ?? 0
  }
  // DEADLINE_TARGET: dinâmico
  if (!targetAmount || !targetDate) return 0
  const monthsLeft = Math.max(1, differenceInMonths(targetDate, new Date()))
  return Math.max(0, (targetAmount - savedAmount) / monthsLeft)
}

export function distributeGoalAportes(goals: GoalWithAllocation[], available: number): number {
  const sorted = [...goals].sort((a, b) => (PRIORITY_WEIGHT[b.priority] ?? 1) - (PRIORITY_WEIGHT[a.priority] ?? 1))
  let remaining = available
  let total = 0

  for (const goal of sorted) {
    const needed = computeNeededAporte(goal)
    // já depositado este mês reduz a reserva
    const reservation = Math.max(0, needed - goal.depositedThisMonth)
    const allocated = Math.max(0, Math.min(reservation, remaining))
    goal.allocatedAporte = allocated
    remaining -= allocated
    total += allocated
    if (allocated < reservation) goal.onTrackWarning = true
  }

  return total
}
```

### 3c. `brain/calculator.ts` — carregar `depositedThisMonth` por goal

No `recalculate`, antes de chamar `distributeGoalAportes`, buscar os GoalDeposits do mês:

```typescript
const depositsThisMonth = await prisma.goalDeposit.findMany({
  where: { userId, month },
})
const depositsByGoal = new Map(depositsThisMonth.map(d => [d.goalId, d.amount]))

const goals: GoalWithAllocation[] = rawGoals.map(g => ({
  ...g,
  targetDate: g.targetDate ? new Date(g.targetDate) : null,
  depositedThisMonth: depositsByGoal.get(g.id) ?? 0,
}))
```

**Também:** após o loop, gravar `monthlyAporte` calculado de volta no Goal (via upsert):

```typescript
for (const goal of goals) {
  const needed = computeNeededAporte(goal)
  await prisma.goal.update({ where: { id: goal.id }, data: { monthlyAporte: needed } })
}
```

Isso mantém `monthlyAporte` no DB sempre atual para exibição no frontend sem recalcular.

---

## Etapa 4 — Serviço de Metas

**Arquivo:** `packages/api/src/services/goal.service.ts`

### `createGoal`

```typescript
export async function createGoal(data: CreateGoalInput) {
  const userId = await getUserId()

  // Derivar monthlyAporte inicial baseado no modo
  let monthlyAporte = 0
  if (data.goalMode === 'DEADLINE_TARGET') {
    const months = Math.max(1, differenceInMonths(new Date(data.targetDate), new Date()))
    monthlyAporte = (data.targetAmount - (data.savedAmount ?? 0)) / months
  } else {
    monthlyAporte = data.fixedMonthlyAporte ?? 0
  }

  const goal = await prisma.goal.create({
    data: {
      userId,
      name: data.name,
      goalMode: data.goalMode,
      targetAmount: 'targetAmount' in data ? data.targetAmount : null,
      savedAmount: data.savedAmount ?? 0,
      targetDate: 'targetDate' in data ? new Date(data.targetDate) : null,
      fixedMonthlyAporte: 'fixedMonthlyAporte' in data ? data.fixedMonthlyAporte : null,
      priority: data.priority ?? 'MEDIUM',
      monthlyAporte,
    },
  })

  recalculate(userId).catch(console.error)
  return enrichGoal(goal, userId)
}
```

### `depositGoal`

```typescript
export async function depositGoal(id: string, amount: number, month?: string, note?: string) {
  const userId = await getUserId()
  const targetMonth = month ?? currentMonth()

  // Verificar se já existe depósito neste mês para este goal
  const existing = await prisma.goalDeposit.findFirst({ where: { goalId: id, month: targetMonth } })

  if (existing) {
    // Atualiza o depósito existente (soma)
    await prisma.goalDeposit.update({
      where: { id: existing.id },
      data: { amount: existing.amount + amount, note: note ?? existing.note },
    })
  } else {
    await prisma.goalDeposit.create({
      data: { goalId: id, userId, month: targetMonth, amount, note: note ?? null },
    })
  }

  // Recalcular savedAmount como SUM de todos os depósitos
  const agg = await prisma.goalDeposit.aggregate({ _sum: { amount: true }, where: { goalId: id } })
  const newSaved = agg._sum.amount ?? 0

  const goal = await prisma.goal.findFirstOrThrow({ where: { id } })
  const isCompleted = goal.targetAmount != null && newSaved >= goal.targetAmount

  await prisma.goal.update({
    where: { id },
    data: { savedAmount: newSaved, status: isCompleted ? 'COMPLETED' : undefined },
  })

  recalculate(userId).catch(console.error)
  return enrichGoal(await prisma.goal.findFirstOrThrow({ where: { id } }), userId)
}
```

### `enrichGoal`

```typescript
async function enrichGoal(goal: GoalRaw, userId: string) {
  const now = new Date()
  const month = currentMonth()

  // Depósitos do mês atual
  const depositsThisMonth = await prisma.goalDeposit.findMany({
    where: { goalId: goal.id, month },
  })
  const depositedThisMonth = depositsThisMonth.reduce((s, d) => s + d.amount, 0)

  // Histórico últimos 6 meses
  const history = await buildDepositHistory(goal.id, 6)

  // Cálculos por modo
  const needed = computeNeededAporte({ ...goal, depositedThisMonth })
  const remainingThisMonth = Math.max(0, needed - depositedThisMonth)

  let progressPercent: number | null = null
  let monthsRemaining: number | null = null
  let estimatedDeadline: string | null = null
  let projectedTotal: number | null = null

  if (goal.targetAmount != null) {
    progressPercent = +(( goal.savedAmount / goal.targetAmount) * 100).toFixed(1)
  }
  if (goal.targetDate != null) {
    monthsRemaining = Math.max(0, differenceInMonths(goal.targetDate, now))
  }
  if (goal.goalMode === 'FIXED_APORTE_TARGET' && goal.fixedMonthlyAporte && goal.targetAmount) {
    const remaining = goal.targetAmount - goal.savedAmount
    const months = remaining > 0 ? Math.ceil(remaining / goal.fixedMonthlyAporte) : 0
    estimatedDeadline = format(addMonths(now, months), 'yyyy-MM')
  }
  if (goal.goalMode === 'FIXED_APORTE_DEADLINE' && goal.fixedMonthlyAporte && goal.targetDate) {
    const months = Math.max(0, differenceInMonths(goal.targetDate, now))
    projectedTotal = goal.savedAmount + goal.fixedMonthlyAporte * months
  }

  const onTrack = remainingThisMonth <= 0 || depositedThisMonth >= needed * 0.8

  return {
    ...goal,
    progressPercent,
    monthsRemaining,
    depositedThisMonth,
    remainingThisMonth,
    estimatedDeadline,
    projectedTotal,
    onTrack,
    depositHistory: history,
  }
}
```

---

## Etapa 5 — Rotas de Objetivos

**Arquivo:** `packages/api/src/routes/goals.ts`

- `POST /goals` — aceita novo schema discriminated union
- `GET /goals/:id/deposits` — histórico de depósitos
- `POST /goals/:id/deposit` — agora aceita `{ amount, month?, note? }`
- `PATCH /goals/:id/pause` e `PATCH /goals/:id/resume` — novos endpoints

---

## Etapa 6 — Frontend: hooks

**Arquivo:** `apps/web/src/hooks/useGoals.ts`

- `useGoals(status?)` — sem mudança
- `useGoalDeposits(goalId)` — novo, busca histórico
- `useDepositGoal` — onSuccess invalida `['goals']`, `['recommendations']`, `['reports']`
- `useCreateGoal` — aceita novo schema
- `usePauseGoal` / `useResumeGoal` — novos

---

## Etapa 7 — Frontend: formulário dinâmico (GoalsPage)

**Arquivo:** `apps/web/src/app/goals/page.tsx`

### Lógica de detecção de modo (tempo real)

```typescript
// Os 3 campos que o usuário pode preencher
const [targetAmount, setTargetAmount] = useState('')
const [monthlyAporte, setMonthlyAporte] = useState('')
const [targetDate, setTargetDate] = useState('')

const hasTarget = parseFloat(targetAmount) > 0
const hasAporte = parseFloat(monthlyAporte) > 0
const hasDate   = targetDate.length > 0

const goalMode: GoalMode | null =
  hasTarget && hasDate && !hasAporte ? 'DEADLINE_TARGET' :
  hasAporte && hasTarget && !hasDate ? 'FIXED_APORTE_TARGET' :
  hasAporte && hasDate && !hasTarget ? 'FIXED_APORTE_DEADLINE' :
  hasAporte && !hasTarget && !hasDate ? 'FREE_SAVING' :
  null  // campos insuficientes ou conflitantes

// Hint calculado em tempo real
const hint = useMemo(() => {
  if (!goalMode) return null
  const saved = parseFloat(savedAmount) || 0
  const target = parseFloat(targetAmount) || 0
  const aporte = parseFloat(monthlyAporte) || 0
  const date = targetDate ? new Date(targetDate) : null

  switch (goalMode) {
    case 'DEADLINE_TARGET': {
      const months = Math.max(1, differenceInMonths(date!, new Date()))
      const calc = (target - saved) / months
      return `Aporte necessário: ${formatBRL(calc)}/mês para atingir ${formatBRL(target)}`
    }
    case 'FIXED_APORTE_TARGET': {
      const remaining = target - saved
      const months = remaining > 0 ? Math.ceil(remaining / aporte) : 0
      const deadline = format(addMonths(new Date(), months), 'MMM/yyyy', { locale: ptBR })
      return `Você chegará em ${formatBRL(target)} em aproximadamente ${months} meses (${deadline})`
    }
    case 'FIXED_APORTE_DEADLINE': {
      const months = Math.max(0, differenceInMonths(date!, new Date()))
      const total = saved + aporte * months
      return `Você terá ${formatBRL(total)} guardados até ${format(date!, 'MMM/yyyy', { locale: ptBR })}`
    }
    case 'FREE_SAVING':
      return `Poupança livre — você acumula ${formatBRL(aporte)}/mês sem um objetivo específico`
  }
}, [goalMode, targetAmount, monthlyAporte, targetDate, savedAmount])
```

### Layout do formulário

```
[ Nome ]

[ Valor alvo (R$) ]      [ Aporte/mês (R$) ]
[ Prazo ]                [ Já guardado (R$) ]

[ Prioridade ]

┄┄┄ hint em tempo real ┄┄┄

[ Criar objetivo ]
```

---

## Etapa 8 — Frontend: GoalCard redesenhado

**Arquivo:** `apps/web/src/components/goals/GoalCard.tsx`

### Layout do card

```
┌──────────────────────────────────────────────────────┐
│ [BADGE-MODO]  Nome da Meta               [Alta] [🗑] │
│ [info contextual por modo]                           │
│                                                      │
│ Progresso geral (só se targetAmount != null)         │
│ R$3.200 [=====>              ] R$15.000  21,3%       │
│                                                      │
│ Aporte — Abril/2026                                  │
│ Esperado: R$1.250                                    │
│ [==========>           ] R$800 (64%)                 │
│ Faltam R$450,00                                      │
│                                                      │
│ [Aportar R$450,00] [Outro valor ▾] [Histórico ▾]    │
└──────────────────────────────────────────────────────┘
```

### Badges por modo

| goalMode | Label | Cor |
|---|---|---|
| FREE_SAVING | Poupança livre | emerald |
| FIXED_APORTE_TARGET | Meta com aporte fixo | blue |
| DEADLINE_TARGET | Meta com prazo | amber |
| FIXED_APORTE_DEADLINE | Compromisso por prazo | violet |

### Info contextual por modo

- DEADLINE_TARGET: "8 meses restantes · R$1.250/mês necessário"
- FIXED_APORTE_TARGET: "Prazo estimado: dez/2026 (8 meses)"
- FIXED_APORTE_DEADLINE: "Você terá ~R$13.200 em dez/2026"
- FREE_SAVING: "Acumulando R$500/mês · Sem prazo definido"

### Ações de aporte

- Botão primário: "Aportar R$X" onde X = `remainingThisMonth`
- "Outro valor": expande input inline com botão confirmar
- "Histórico": expande lista dos últimos 6 meses (month, esperado, depositado, status)
- Se `remainingThisMonth === 0`: mostra "✓ Mês concluído" em verde

---

## Etapa 9 — Dashboard: card Metas

**Arquivo:** `apps/web/src/components/dashboard/BudgetOverview.tsx`

O `investmentBudget` na Recommendation já reflete a reserva líquida (Brain usa `needed - depositedThisMonth`).

Tooltip atualizado:
- "Valor pré-reservado para suas metas ativas. Já diminuído pelo que você aportou este mês."

---

## Checklist de Implementação

- [ ] **E1** Schema Prisma — Goal nullable fields + GoalDeposit table
- [ ] **E2** Migration (`prisma migrate dev`)
- [ ] **E3** Shared package — schemas Zod + types TypeScript
- [ ] **E4** Brain — types.ts + goal-allocator.ts + calculator.ts
- [ ] **E5** goal.service.ts — createGoal + depositGoal + enrichGoal
- [ ] **E6** goals routes — novos endpoints
- [ ] **E7** useGoals.ts — hooks atualizados
- [ ] **E8** GoalsPage — formulário dinâmico
- [ ] **E9** GoalCard — redesenho completo
- [ ] **E10** BudgetOverview — tooltip Metas

---

## Regras de Negócio Críticas (não esquecer)

1. `savedAmount` é SEMPRE calculado via `SUM(GoalDeposit.amount WHERE goalId = ?)` — nunca escrito diretamente
2. Brain usa `computeNeededAporte` dinamicamente — nunca lê `monthlyAporte` do DB para calcular reserva (só grava de volta para display)
3. `depositedThisMonth` reduz a reserva do Brain — evita double-counting
4. GoalDeposits de meses passados NÃO afetam o freeBudget do mês atual (apenas afetaram no mês em que foram feitos)
5. FREE_SAVING nunca auto-completa — só PAUSED/CANCELLED manualmente
6. Após depósito: Brain recalcula → Recommendation atualiza → Dashboard frontend invalida cache `['recommendations']` e `['reports']`
