import { z } from 'zod'

export const CreateGoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive(),
  targetDate: z.string().datetime(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  savedAmount: z.number().nonnegative().default(0),
})

export const UpdateGoalSchema = CreateGoalSchema.partial()

export const GoalDepositSchema = z.object({
  amount: z.number().positive(),
})

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>
export type GoalDepositInput = z.infer<typeof GoalDepositSchema>
