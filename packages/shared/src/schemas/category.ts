import { z } from 'zod'

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6B7280'),
  icon: z.string().default('tag'),
})

export const UpdateCategorySchema = CreateCategorySchema.partial()

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>
