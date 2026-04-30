import { z } from 'zod'

export const CreateGoalSchema = z.discriminatedUnion('goalMode', [
  z.object({
    goalMode: z.literal('DEADLINE_TARGET'),
    name: z.string().min(1).max(100),
    targetAmount: z.number().positive(),
    targetDate: z.string().datetime(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    savedAmount: z.number().nonnegative().default(0),
  }),
  z.object({
    goalMode: z.literal('FIXED_APORTE_TARGET'),
    name: z.string().min(1).max(100),
    targetAmount: z.number().positive(),
    fixedMonthlyAporte: z.number().positive(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    savedAmount: z.number().nonnegative().default(0),
  }),
  z.object({
    goalMode: z.literal('FIXED_APORTE_DEADLINE'),
    name: z.string().min(1).max(100),
    targetDate: z.string().datetime(),
    fixedMonthlyAporte: z.number().positive(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    savedAmount: z.number().nonnegative().default(0),
  }),
  z.object({
    goalMode: z.literal('FREE_SAVING'),
    name: z.string().min(1).max(100),
    fixedMonthlyAporte: z.number().positive(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    savedAmount: z.number().nonnegative().default(0),
  }),
])

export const UpdateGoalSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  goalMode: z.enum(['DEADLINE_TARGET', 'FIXED_APORTE_TARGET', 'FIXED_APORTE_DEADLINE', 'FREE_SAVING']).optional(),
  targetAmount: z.number().positive().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  fixedMonthlyAporte: z.number().positive().nullable().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  savedAmount: z.number().nonnegative().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED']).optional(),
})

export const GoalDepositSchema = z.object({
  amount: z.number().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  note: z.string().max(200).optional(),
})

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>
export type GoalDepositInput = z.infer<typeof GoalDepositSchema>
