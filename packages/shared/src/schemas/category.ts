import { z } from 'zod'

export const CategoryTypeEnum = z.enum([
  'FIXED',       // gastos fixos: luz, água, aluguel, internet
  'HEALTH',      // saúde: plano, farmácia, médico
  'FOOD',        // alimentação: mercado, restaurante
  'TRANSPORT',   // transporte: combustível, Uber, manutenção
  'LEISURE',     // lazer: streaming, viagem, hobby
  'EDUCATION',   // educação: cursos, livros, escola
  'INVESTMENT',  // investimentos: ações, poupança
  'INCOME',      // renda: salário, freelance, aluguel recebido
  'OTHER',       // outros
])

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6B7280'),
  icon: z.string().default('tag'),
  categoryType: CategoryTypeEnum.default('OTHER'),
})

export const UpdateCategorySchema = CreateCategorySchema.partial()

export type CategoryType = z.infer<typeof CategoryTypeEnum>
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>
