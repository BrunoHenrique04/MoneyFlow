'use client'
import { useRef, useState } from 'react'
import { useImportOds } from '@/hooks/useDebts'
import { Button } from '@/components/ui/button'
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react'

export function OdsImport() {
  const inputRef = useRef<HTMLInputElement>(null)
  const importOds = useImportOds()
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMessage(null)
    importOds.mutate(file, {
      onSuccess: (data) => setMessage({ type: 'ok', text: `${data.imported} registros importados com sucesso.` }),
      onError: (err) => setMessage({ type: 'err', text: err.message }),
    })
    e.target.value = ''
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center space-y-3">
      <Upload size={32} className="mx-auto text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Importe sua planilha ODS, XLSX ou CSV com as colunas:<br />
        <span className="font-mono text-xs">Pessoa · Data · Descrição · Banco · Valor a pagar · Valor Total da compra · Situação · Data Vencimento</span>
      </p>
      <Button onClick={() => inputRef.current?.click()} disabled={importOds.isPending}>
        {importOds.isPending ? 'Importando...' : 'Selecionar arquivo'}
      </Button>
      <input ref={inputRef} type="file" accept=".ods,.xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      {message && (
        <div className={`flex items-center justify-center gap-2 text-sm ${message.type === 'ok' ? 'text-green-600' : 'text-destructive'}`}>
          {message.type === 'ok' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {message.text}
        </div>
      )}
    </div>
  )
}
