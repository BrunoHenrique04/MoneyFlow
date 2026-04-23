import { z } from 'zod'

const utilityTagEnum = z.enum(['ESSENTIAL', 'NON_ESSENTIAL', 'INVESTMENT'])

const sharedFields = {
  description: z.string().min(1).max(200),
  accountId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid(),
  utilityTag: utilityTagEnum,
  notes: z.string().max(500).optional().nullable(),
  pessoa: z.string().max(100).optional().nullable(),
  situacao: z.enum(['PAGO', 'NAO_PAGO', 'RECEBER']).optional().nullable(),
}

const SingleTransactionSchema = z.object({
  type: z.literal('SINGLE'),
  amount: z.number().positive(),
  totalAmount: z.number().positive().optional().nullable(),
  dueDate: z.string().datetime(),
  ...sharedFields,
})

const InstallmentTransactionSchema = z.object({
  type: z.literal('INSTALLMENT'),
  totalAmount: z.number().positive(),
  totalInstallments: z.number().int().min(2),
  firstDueDate: z.string().datetime(),
  ...sharedFields,
})

const RecurringTransactionSchema = z.object({
  type: z.literal('RECURRING'),
  amount: z.number().positive(),
  firstDueDate: z.string().datetime(),
  recurrenceMonths: z.number().int().min(1),
  ...sharedFields,
})

const IncomeTransactionSchema = z.object({
  type: z.literal('INCOME'),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  ...sharedFields,
})

// Registro compartilhado / dívida pura — sem conta obrigatória
const SharedTransactionSchema = z.object({
  type: z.literal('SHARED'),
  amount: z.number(),
  totalAmount: z.number().positive().optional().nullable(),
  dueDate: z.string().datetime(),
  pessoa: z.string().min(1).max(100),
  situacao: z.enum(['PAGO', 'NAO_PAGO', 'RECEBER']).default('NAO_PAGO'),
  description: z.string().min(1).max(200),
  accountId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid(),
  utilityTag: utilityTagEnum.default('NON_ESSENTIAL'),
  notes: z.string().max(500).optional().nullable(),
})

export const CreateTransactionSchema = z.discriminatedUnion('type', [
  SingleTransactionSchema,
  InstallmentTransactionSchema,
  RecurringTransactionSchema,
  IncomeTransactionSchema,
  SharedTransactionSchema,
])

export const UpdateTransactionSchema = z.object({
  type: z.enum(['SINGLE', 'INSTALLMENT', 'RECURRING', 'FIXED', 'INCOME', 'SHARED']).optional(),
  description: z.string().min(1).max(200).optional(),
  amount: z.number().optional(),
  totalAmount: z.number().positive().optional().nullable(),
  categoryId: z.string().cuid().optional(),
  accountId: z.string().cuid().optional().nullable(),
  utilityTag: utilityTagEnum.optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional().nullable(),
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']).optional(),
  paidAt: z.string().datetime().optional(),
  pessoa: z.string().max(100).optional().nullable(),
  situacao: z.enum(['PAGO', 'NAO_PAGO', 'RECEBER']).optional().nullable(),
})

export const PayTransactionSchema = z.object({
  paidAt: z.string().datetime().optional(),
})

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>
export type PayTransactionInput = z.infer<typeof PayTransactionSchema>
