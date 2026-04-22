# 04 — Módulo de Lançamentos

## Responsabilidade

Registrar, editar e cancelar qualquer movimentação financeira. É o módulo central — alimenta o Brain, os relatórios e a timeline de parcelas.

---

## Tipos de Lançamento

| Tipo | Comportamento |
|---|---|
| `SINGLE` | Uma transação única em uma data |
| `INSTALLMENT` | N transações geradas automaticamente, uma por mês |
| `RECURRING` | Igual a INSTALLMENT mas com semântica de assinatura |
| `INCOME` | Entrada (renda extra, bônus) — ainda não impacta `monthlyIncome` |

---

## Regras de Negócio

### Criação de parcelado

```
POST /transactions { type: "INSTALLMENT", totalAmount: 3000, totalInstallments: 10, firstDueDate: "2025-04-10" }

Resultado:
  InstallmentGroup criado
  Transaction #1: amount=300, dueDate=2025-04-10, installmentNumber=1
  Transaction #2: amount=300, dueDate=2025-05-10, installmentNumber=2
  ...
  Transaction #10: amount=300, dueDate=2026-01-10, installmentNumber=10

Valor por parcela = totalAmount / totalInstallments (arredondado)
Diferença de centavos vai na última parcela
```

### Cancelamento de parcela

```
DELETE /transactions/:id?cancelFuture=false
  → Cancela APENAS esta parcela (status = CANCELLED)
  → As demais permanecem

DELETE /transactions/:id?cancelFuture=true
  → Cancela esta parcela e todas com installmentNumber > atual no mesmo InstallmentGroup
  → Brain é disparado
```

### Marcar como pago

```
PATCH /transactions/:id/pay
  → status = PAID, paidAt = now()
  → Atualiza saldo da Account (balance -= amount)
  → Brain NÃO é disparado (pagamento não muda o orçamento projetado)
```

---

## Fluxo de Criação (Serviço)

```typescript
async function createTransaction(input: CreateTransactionInput) {
  // 1. Valida dados com Zod
  const validated = CreateTransactionSchema.parse(input)

  // 2. Verifica existência de Account e Category
  await assertAccountExists(validated.accountId)
  await assertCategoryExists(validated.categoryId)

  // 3. Cria no banco
  if (validated.type === 'INSTALLMENT') {
    const group = await createInstallmentGroup(validated)
    const transactions = generateInstallments(group)
    await prisma.transaction.createMany({ data: transactions })
  } else {
    await prisma.transaction.create({ data: mapToTransaction(validated) })
  }

  // 4. Dispara Brain para os meses afetados
  const affectedMonths = getAffectedMonths(validated)
  await brain.recalculate(userId, affectedMonths)

  // 5. Retorna resultado
}
```

---

## Geração de Parcelas (Algoritmo)

```typescript
function generateInstallments(group: InstallmentGroup): Transaction[] {
  const installments: Transaction[] = []
  const baseAmount = Math.floor((group.totalAmount / group.totalInstallments) * 100) / 100
  let remainder = +(group.totalAmount - baseAmount * group.totalInstallments).toFixed(2)

  for (let i = 1; i <= group.totalInstallments; i++) {
    const isLast = i === group.totalInstallments
    const amount = isLast ? baseAmount + remainder : baseAmount
    const dueDate = addMonths(group.firstDueDate, i - 1)

    installments.push({
      installmentGroupId: group.id,
      installmentNumber: i,
      amount,
      dueDate,
      status: 'PENDING',
      // ... demais campos herdados do grupo
    })
  }

  return installments
}
```

---

## Campos de uma Transação

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `description` | string | Sim | Max 100 chars |
| `amount` | float | Sim | > 0 |
| `accountId` | cuid | Sim | Deve existir |
| `categoryId` | cuid | Sim | Deve existir |
| `type` | enum | Sim | SINGLE / INSTALLMENT / RECURRING / INCOME |
| `utilityTag` | enum | Sim | ESSENTIAL / NON_ESSENTIAL / INVESTMENT |
| `dueDate` | date | Sim | ISO 8601 |
| `totalInstallments` | int | Se parcelado | ≥ 2 |
| `firstDueDate` | date | Se parcelado | ISO 8601 |
| `recurrenceMonths` | int | Se recorrente | ≥ 1 |
| `notes` | string | Não | Max 500 chars |

---

## Validação Zod (packages/shared)

```typescript
export const CreateTransactionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('SINGLE'),
    description: z.string().min(1).max(100),
    amount: z.number().positive(),
    accountId: z.string().cuid(),
    categoryId: z.string().cuid(),
    utilityTag: z.enum(['ESSENTIAL', 'NON_ESSENTIAL', 'INVESTMENT']),
    dueDate: z.string().datetime(),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal('INSTALLMENT'),
    description: z.string().min(1).max(100),
    totalAmount: z.number().positive(),
    totalInstallments: z.number().int().min(2),
    firstDueDate: z.string().datetime(),
    accountId: z.string().cuid(),
    categoryId: z.string().cuid(),
    utilityTag: z.enum(['ESSENTIAL', 'NON_ESSENTIAL', 'INVESTMENT']),
  }),
  // ... RECURRING, INCOME
])
```

---

## Impacto no Brain

| Ação | Meses recalculados |
|---|---|
| Criar lançamento único | Mês do `dueDate` |
| Criar parcelado (10x) | Os 10 meses afetados |
| Cancelar parcela futura | Mês da parcela cancelada em diante |
| Cancelar todas as futuras | Todos os meses das parcelas canceladas |
| Editar valor de transação | Mês do `dueDate` da transação |
