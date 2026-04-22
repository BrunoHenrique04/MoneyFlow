'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateTransaction } from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { Button } from '@/components/ui/button'

const schema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('SINGLE'),
    description: z.string().min(1),
    amount: z.coerce.number().positive(),
    accountId: z.string().min(1),
    categoryId: z.string().min(1),
    utilityTag: z.enum(['ESSENTIAL', 'NON_ESSENTIAL', 'INVESTMENT']),
    dueDate: z.string().min(1),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal('INSTALLMENT'),
    description: z.string().min(1),
    totalAmount: z.coerce.number().positive(),
    totalInstallments: z.coerce.number().int().min(2),
    firstDueDate: z.string().min(1),
    accountId: z.string().min(1),
    categoryId: z.string().min(1),
    utilityTag: z.enum(['ESSENTIAL', 'NON_ESSENTIAL', 'INVESTMENT']),
  }),
])

type FormData = z.infer<typeof schema>

interface Props {
  onSuccess?: () => void
}

export function TransactionForm({ onSuccess }: Props) {
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const create = useCreateTransaction()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'SINGLE' },
  })

  const type = watch('type')

  const onSubmit = (data: FormData) => {
    const payload = type === 'SINGLE'
      ? { ...data, dueDate: new Date((data as { dueDate: string }).dueDate).toISOString() }
      : { ...data, firstDueDate: new Date((data as { firstDueDate: string }).firstDueDate).toISOString() }

    create.mutate(payload as Parameters<typeof create.mutate>[0], {
      onSuccess: () => onSuccess?.(),
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 flex flex-col gap-1 text-sm">
          Tipo
          <select {...register('type')} className="border border-border rounded-md px-3 py-2 bg-background text-sm">
            <option value="SINGLE">Único</option>
            <option value="INSTALLMENT">Parcelado</option>
          </select>
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-sm">
          Descrição
          <input {...register('description')} className="border border-border rounded-md px-3 py-2 text-sm" />
          {errors.description && <span className="text-destructive text-xs">{errors.description.message}</span>}
        </label>

        {type === 'SINGLE' ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Valor (R$)
              <input type="number" step="0.01" {...register('amount')} className="border border-border rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Data de vencimento
              <input type="date" {...register('dueDate')} className="border border-border rounded-md px-3 py-2 text-sm" />
            </label>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Valor total (R$)
              <input type="number" step="0.01" {...register('totalAmount')} className="border border-border rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Nº parcelas
              <input type="number" min="2" {...register('totalInstallments')} className="border border-border rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="col-span-2 flex flex-col gap-1 text-sm">
              Primeira parcela
              <input type="date" {...register('firstDueDate')} className="border border-border rounded-md px-3 py-2 text-sm" />
            </label>
          </>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Conta
          <select {...register('accountId')} className="border border-border rounded-md px-3 py-2 bg-background text-sm">
            <option value="">Selecione...</option>
            {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Categoria
          <select {...register('categoryId')} className="border border-border rounded-md px-3 py-2 bg-background text-sm">
            <option value="">Selecione...</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-sm">
          Tag
          <select {...register('utilityTag')} className="border border-border rounded-md px-3 py-2 bg-background text-sm">
            <option value="NON_ESSENTIAL">Não essencial</option>
            <option value="ESSENTIAL">Essencial</option>
            <option value="INVESTMENT">Investimento</option>
          </select>
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={create.isPending}>
        {create.isPending ? 'Salvando...' : 'Salvar lançamento'}
      </Button>
    </form>
  )
}
