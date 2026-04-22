import { z } from 'zod'

export const SituacaoEnum = z.enum(['PAGO', 'NAO_PAGO', 'RECEBER'])

export const CreateDebtSchema = z.object({
  pessoa: z.string().min(1).max(100),
  dataCompra: z.string().datetime().optional().nullable(),
  descricao: z.string().min(1).max(200),
  banco: z.string().max(100).optional().nullable(),
  valorAPagar: z.number(),
  valorTotalCompra: z.number(),
  situacao: SituacaoEnum.default('NAO_PAGO'),
  dataVencimento: z.string().datetime().optional().nullable(),
  observacoes: z.string().max(500).optional().nullable(),
})

export const UpdateDebtSchema = CreateDebtSchema.partial()

export type CreateDebtInput = z.infer<typeof CreateDebtSchema>
export type UpdateDebtInput = z.infer<typeof UpdateDebtSchema>
