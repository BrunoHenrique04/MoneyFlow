'use client'
import { useState } from 'react'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import type { Category, CategoryType } from '@moneyflow/shared'

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  FIXED:      'Fixo',
  HEALTH:     'Saúde',
  FOOD:       'Alimentação',
  TRANSPORT:  'Transporte',
  LEISURE:    'Lazer',
  EDUCATION:  'Educação',
  INVESTMENT: 'Investimento',
  INCOME:     'Renda',
  OTHER:      'Outro',
}

const CATEGORY_TYPE_COLORS: Record<CategoryType, string> = {
  FIXED:      'bg-purple-100 text-purple-800',
  HEALTH:     'bg-red-100 text-red-800',
  FOOD:       'bg-yellow-100 text-yellow-800',
  TRANSPORT:  'bg-blue-100 text-blue-800',
  LEISURE:    'bg-orange-100 text-orange-800',
  EDUCATION:  'bg-green-100 text-green-800',
  INVESTMENT: 'bg-emerald-100 text-emerald-800',
  INCOME:     'bg-teal-100 text-teal-800',
  OTHER:      'bg-gray-100 text-gray-700',
}

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const remove = useDeleteCategory()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [categoryType, setCategoryType] = useState<CategoryType>('OTHER')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<CategoryType>('OTHER')

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleCreate = () => {
    if (!name.trim()) return
    create.mutate(
      { name, color: '#6B7280', icon: 'tag', categoryType },
      { onSuccess: () => { setName(''); setCategoryType('OTHER'); setShowForm(false) } },
    )
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditType(cat.categoryType as CategoryType)
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = (id: string) => {
    update.mutate(
      { id, data: { name: editName, categoryType: editType } },
      { onSuccess: () => setEditingId(null) },
    )
  }

  const handleDelete = (id: string) => {
    remove.mutate(id, { onSuccess: () => setConfirmDeleteId(null) })
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
          <select
            value={categoryType}
            onChange={(e) => setCategoryType(e.target.value as CategoryType)}
            className="border border-border rounded-md px-3 py-2 text-sm w-full bg-background"
          >
            {(Object.keys(CATEGORY_TYPE_LABELS) as CategoryType[]).map((t) => (
              <option key={t} value={t}>{CATEGORY_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <Button onClick={handleCreate} disabled={create.isPending}>
            {create.isPending ? 'Salvando...' : 'Criar categoria'}
          </Button>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h2 className="font-semibold text-base">Excluir categoria?</h2>
            <p className="text-sm text-muted-foreground">
              Todos os gastos vinculados serão movidos para <strong>Não Definida</strong>. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={remove.isPending}
              >
                {remove.isPending ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {categories?.map((cat: Category) => (
          <div key={cat.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
            {editingId === cat.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border border-border rounded-md px-2 py-1 text-sm flex-1"
                  autoFocus
                />
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as CategoryType)}
                  className="border border-border rounded-md px-2 py-1 text-sm bg-background"
                >
                  {(Object.keys(CATEGORY_TYPE_LABELS) as CategoryType[]).map((t) => (
                    <option key={t} value={t}>{CATEGORY_TYPE_LABELS[t]}</option>
                  ))}
                </select>
                <Button variant="ghost" size="sm" onClick={() => saveEdit(cat.id)} disabled={update.isPending}>
                  <Check size={14} className="text-green-500" />
                </Button>
                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                  <X size={14} className="text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-sm">{cat.name}</span>
                  {cat.isDefault && <Badge variant="muted">Padrão</Badge>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_TYPE_COLORS[cat.categoryType as CategoryType] ?? CATEGORY_TYPE_COLORS.OTHER}`}>
                    {CATEGORY_TYPE_LABELS[cat.categoryType as CategoryType] ?? cat.categoryType}
                  </span>
                </div>
                {!cat.isDefault && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(cat)}
                      title="Editar"
                    >
                      <Pencil size={14} className="text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(cat.id)}
                      title="Excluir"
                    >
                      <Trash2 size={14} className="text-destructive/70" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
