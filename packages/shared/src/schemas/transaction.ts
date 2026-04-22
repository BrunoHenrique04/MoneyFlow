import { z } from 'zod'

const utilityTagEnum = z.enum(['ESSENTIAL', 'NON_ESSENTIAL', 'INVESTMENT'])

const SingleTransactionSchema = z.object({
  type: z.literal('SINGLE'),
  description: z.string().min(1).max(100),
  amount: z.number().positive(),
  accountId: z.string().cuid(),
  categoryId: z.string().cuid(),
  utilityTag: utilityTagEnum,
  dueDate: z.string().datetime(),
  notes: z.string().max(500).optional(),
})

const InstallmentTransactionSchema = z.object({
  type: z.literal('INSTALLMENT'),
  description: z.string().min(1).max(100),
  totalAmount: z.number().positive(),
  totalInstallments: z.number().int().min(2),
  firstDueDate: z.string().datetime(),
  accountId: z.string().cuid(),
  categoryId: z.string().cuid(),
  utilityTag: utilityTagEnum,
  notes: z.string().max(500).optional(),
})

const RecurringTransactionSchema = z.object({
  type: z.literal('RECURRING'),
  description: z.string().min(1).max(100),
  amount: z.number().positive(),
  accountId: z.string().cuid(),
  categoryId: z.string().cuid(),
  utilityTag: utilityTagEnum,
  firstDueDate: z.string().datetime(),
  recurrenceMonths: z.number().int().min(1),
  notes: z.string().max(500).optional(),
})

const IncomeTransactionSchema = z.object({
  type: z.literal('INCOME'),
  description: z.string().min(1).max(100),
  amount: z.number().positive(),
  accountId: z.string().cuid(),
  categoryId: z.string().cuid(),
  utilityTag: z.literal('INVESTMENT'),
  dueDate: z.string().datetime(),
  notes: z.string().max(500).optional(),
})

export const CreateTransactionSchema = z.discriminatedUnion('type', [
  SingleTransactionSchema,
  InstallmentTransactionSchema,
  RecurringTransactionSchema,
  IncomeTransactionSchema,
])

export const UpdateTransactionSchema = z.object({
  description: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  categoryId: z.string().cuid().optional(),
  utilityTag: utilityTagEnum.optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']).optional(),
  paidAt: z.string().datetime().optional(),
})

export const PayTransactionSchema = z.object({
  paidAt: z.string().datetime().optional(),
})

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>
export type PayTransactionInput = z.infer<typeof PayTransactionSchema>
