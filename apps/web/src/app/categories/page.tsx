'use client'
import { useState } from 'react'
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useCategories'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import type { Category } from '@moneyflow/shared'

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories()
  const create = useCreateCategory()
  const remove = useDeleteCategory()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')

  const handleCreate = () => {
    if (!name.trim()) return
    create.mutate({ name, color: '#6B7280', icon: 'tag' }, { onSuccess: () => { setName(''); setShowForm(false) } })
  }

  if (isLoading) return <div className="text-muted-foreground text-sm py-8 text-center">Carregando...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorias</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Nova categoria
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <input
            placeholder="Nome da categoria"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-border rounded-md px-3 py-2 text-sm w-full"
          />
          <Button onClick={handleCreate} disabled={create.isPending}>
            {create.isPending ? 'Salvando...' : 'Criar categoria'}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {categories?.map((cat: Category) => (
          <div key={cat.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="font-medium text-sm">{cat.name}</span>
              {cat.isDefault && <Badge variant="muted">Padrão</Badge>}
            </div>
            {!cat.isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove.mutate(cat.id)}
                disabled={remove.isPending}
              >
                <Trash2 size={14} className="text-muted-foreground" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
