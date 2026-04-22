import { z } from 'zod'

export const MonthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
})

export const MonthsQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
})

export const CategoryLimitSchema = z.object({
  categoryId: z.string().cuid(),
  limitValue: z.number().positive(),
})

export type MonthQuery = z.infer<typeof MonthQuerySchema>
export type MonthsQuery = z.infer<typeof MonthsQuerySchema>
export type CategoryLimitInput = z.infer<typeof CategoryLimitSchema>
