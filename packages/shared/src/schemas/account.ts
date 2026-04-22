import { z } from 'zod'

export const CreateAccountSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6B7280'),
  icon: z.string().default('bank'),
  balance: z.number().default(0),
})

export const UpdateAccountSchema = CreateAccountSchema.partial()

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>
