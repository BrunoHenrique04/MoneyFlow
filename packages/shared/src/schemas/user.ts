import { z } from 'zod'

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  monthlyIncome: z.number().nonnegative().optional(),
  timezone: z.string().optional(),
})

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
