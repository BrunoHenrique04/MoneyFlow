# 06 — Módulo de Objetivos (Goals)

## Responsabilidade

Controlar metas financeiras do usuário com prazo, prioridade e aporte mensal sugerido. Integrado ao Brain para ajuste automático do orçamento livre.

---

## Dados de um Objetivo

| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | Ex: "Moto Honda CB 300" |
| `targetAmount` | float | Valor total da meta |
| `savedAmount` | float | Quanto já foi guardado |
| `targetDate` | date | Prazo desejado (mês/ano) |
| `priority` | HIGH / MEDIUM / LOW | Influencia ordem no Brain |
| `monthlyAporte` | float | Calculado automaticamente pelo Brain |
| `status` | ACTIVE / COMPLETED / PAUSED / CANCELLED | |

---

## Regras de Negócio

### Cálculo do Aporte Mensal (pelo Brain)

```
monthsRemaining = meses entre hoje e targetDate
remainingAmount = targetAmount - savedAmount
monthlyAporte = remainingAmount / monthsRemaining
```

O Brain distribui o orçamento de investimento entre os objetivos ativos, respeitando prioridade:

```
1. Objetivos HIGH recebem aporte integral primeiro
2. Objetivos MEDIUM recebem o que sobrar proporcional ao prazo
3. Objetivos LOW recebem o restante se houver saldo
```

Se o orçamento de investimento não cobrir todos, o Brain gera alerta informando qual objetivo ficará atrasado.

### Depósito Manual

```
POST /goals/:id/deposit { amount: 500.00 }
  → goal.savedAmount += amount
  → Se savedAmount >= targetAmount: status = COMPLETED
  → Brain recalcula (libera o aporte deste objetivo)
```

### Conclusão Automática

Quando `savedAmount >= targetAmount`, o status muda para `COMPLETED` automaticamente. O Brain então redistribui o aporte liberado para os outros objetivos ou aumenta o `freeBudget`.

### Pause e Cancelamento

- `PAUSED`: Brain não inclui no cálculo de investimento (aporte vai para `freeBudget` temporariamente)
- `CANCELLED`: Igual ao paused, mas permanente

---

## Progresso Visual

```typescript
const progressPercent = (goal.savedAmount / goal.targetAmount) * 100
const monthsRemaining = differenceInMonths(goal.targetDate, new Date())
const onTrack = goal.monthlyAporte * monthsRemaining >= (goal.targetAmount - goal.savedAmount)
```

`onTrack = true` → exibe indicador verde
`onTrack = false` → exibe alerta "Prazo em risco"

---

## Serviço: GoalService

```typescript
class GoalService {
  async list(userId: string, status?: GoalStatus): Promise<GoalWithProgress[]>
  async create(userId: string, input: CreateGoalInput): Promise<Goal>
  async update(userId: string, id: string, input: UpdateGoalInput): Promise<Goal>
  async delete(userId: string, id: string): Promise<void>
  async deposit(userId: string, id: string, amount: number): Promise<Goal>
  async pause(userId: string, id: string): Promise<Goal>
  async resume(userId: string, id: string): Promise<Goal>
}
```

Após todo `create`, `update`, `delete`, `deposit`, `pause`, `resume` → chamar `brain.recalculate(userId)`.

---

## Exemplo de Response Enriquecida

```json
{
  "id": "cuid",
  "name": "Moto Honda CB 300",
  "targetAmount": 15000.00,
  "savedAmount": 3200.00,
  "targetDate": "2026-01-01",
  "priority": "HIGH",
  "status": "ACTIVE",
  "monthlyAporte": 487.50,
  "progressPercent": 21.33,
  "monthsRemaining": 8,
  "onTrack": true,
  "estimatedCompletionDate": "2025-12-01"
}
```
