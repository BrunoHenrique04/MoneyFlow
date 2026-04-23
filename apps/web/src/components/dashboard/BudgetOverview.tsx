'use client'
import { useRecommendation, useUser, useMonthlyReport } from '@/hooks/useReports'
import { useUIStore } from '@/store/ui.store'
import { Card, CardTitle, CardValue } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/tooltip'
import { formatBRL } from '@/lib/utils'
import { commitmentColor, commitmentBorderColor } from '@/lib/chartColors'
import { AlertTriangle, Lightbulb } from 'lucide-react'

interface LeisureDetails {
  leisureSpent: number
  goalGap: number
  goalPressure: number
  leisureFactor: number
  riskCount: number
  totalGoals: number
  freeBudget: number
}

interface RecData {
  essentialBudget: number
  investmentBudget: number
  freeBudget: number
  leisureAvailable: number
  leisureDetails: LeisureDetails
  alerts: string[]
  suggestions: string[]
}

interface ReportTx {
  amount: number
  type: string
}

const PERSISTENT_TYPES = ['RECURRING', 'INSTALLMENT', 'FIXED']

function TooltipLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 mt-0.5">
      <span>{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

export function BudgetOverview() {
  const { selectedMonth } = useUIStore()
  const { data: rec } = useRecommendation()
  const { data: user } = useUser()
  const { data: reportRaw } = useMonthlyReport(selectedMonth)

  if (!rec || !user) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-7 bg-muted rounded w-32" />
          </Card>
        ))}
      </div>
    )
  }

  const recData = rec as RecData
  const userData = user as { monthlyIncome: number }
  const income = userData.monthlyIncome
  const ld = recData.leisureDetails ?? {} as LeisureDetails

  const reportTxs: ReportTx[] = (reportRaw as { transactions?: ReportTx[] } | undefined)?.transactions ?? []
  const expenseTxs = reportTxs.filter((t) => t.type !== 'INCOME')
  const committed = expenseTxs.reduce((s, t) => s + t.amount, 0)
  const persistentes = expenseTxs.filter((t) => PERSISTENT_TYPES.includes(t.type)).reduce((s, t) => s + t.amount, 0)
  const unicos = expenseTxs.filter((t) => !PERSISTENT_TYPES.includes(t.type)).reduce((s, t) => s + t.amount, 0)
  const commitPct = income > 0 ? Math.round((committed / income) * 100) : 0

  const leisurePct = ld.freeBudget > 0 ? Math.round(((ld.leisureSpent ?? 0) / ld.freeBudget) * 100) : 0
  const pressurePct = Math.round((ld.goalPressure ?? 0) * 100)
  const factorPct = Math.round((ld.leisureFactor ?? 1) * 100)

  return (
    <div className="space-y-4">
      {/* Main cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* Renda */}
        <Card>
          <CardTitle className="flex items-center gap-1">
            Renda
            <InfoTooltip content="Sua renda mensal cadastrada no perfil. Altere em Configurações." />
          </CardTitle>
          <CardValue className="text-foreground">{formatBRL(income)}</CardValue>
        </Card>

        {/* Comprometido */}
        <Card className={`border-2 ${commitmentBorderColor(commitPct)}`}>
          <CardTitle className="flex items-center gap-1">
            Comprometido
            <InfoTooltip content={
              <div className="space-y-1">
                <p>Total gasto no mês selecionado (fixos + parcelas + essenciais + únicos). Exclui receitas e cancelados.</p>
                <TooltipLine label="Persistentes (fixos/parcelas)" value={formatBRL(persistentes)} />
                <TooltipLine label="Únicos (avulsos)" value={formatBRL(unicos)} />
              </div>
            } />
          </CardTitle>
          <CardValue className={commitmentColor(commitPct)}>{formatBRL(committed)}</CardValue>
          {income > 0 && (
            <p className={`text-xs font-semibold mt-1 ${commitmentColor(commitPct)}`}>{commitPct}% da renda</p>
          )}
          <div className="mt-2 pt-2 border-t border-border space-y-0.5">
            <p className="text-xs text-muted-foreground flex justify-between">
              <span>Persistentes</span>
              <span className="tabular-nums font-medium">{formatBRL(persistentes)}</span>
            </p>
            <p className="text-xs text-muted-foreground flex justify-between">
              <span>Únicos</span>
              <span className="tabular-nums font-medium">{formatBRL(unicos)}</span>
            </p>
          </div>
        </Card>

        {/* Metas */}
        <Card>
          <CardTitle className="flex items-center gap-1">
            Metas
            <InfoTooltip content="Valor alocado pelo Brain para aportar nas suas metas ativas neste mês, distribuído por prioridade." />
          </CardTitle>
          <CardValue className="text-blue-500">{formatBRL(recData.investmentBudget)}</CardValue>
        </Card>

        {/* Orçamento Livre */}
        <Card>
          <CardTitle className="flex items-center gap-1">
            Orçamento Livre
            <InfoTooltip content={
              <div className="space-y-1">
                <p>Renda − Comprometido − Metas. O que sobra depois de todos os compromissos.</p>
                <TooltipLine label="Renda" value={formatBRL(income)} />
                <TooltipLine label="− Essencial" value={formatBRL(recData.essentialBudget)} />
                <TooltipLine label="− Metas" value={formatBRL(recData.investmentBudget)} />
                <TooltipLine label="= Livre" value={formatBRL(recData.freeBudget)} />
              </div>
            } />
          </CardTitle>
          <CardValue className={recData.freeBudget < 0 ? 'text-destructive' : 'text-green-500'}>
            {formatBRL(recData.freeBudget)}
          </CardValue>
          {income > 0 && recData.freeBudget >= 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((recData.freeBudget / income) * 100)}% da renda
            </p>
          )}
        </Card>
      </div>

      {/* Lazer card — full width below */}
      <LeisureCard
        leisureAvailable={recData.leisureAvailable ?? 0}
        leisureSpent={ld.leisureSpent ?? 0}
        freeBudget={ld.freeBudget ?? 0}
        goalPressure={pressurePct}
        leisureFactor={factorPct}
        riskCount={ld.riskCount ?? 0}
        totalGoals={ld.totalGoals ?? 0}
        goalGap={ld.goalGap ?? 0}
        leisurePct={leisurePct}
      />

      {/* Progress bar */}
      {income > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Distribuição da renda</span>
            <span>{formatBRL(income)}</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            <div
              className="bg-orange-400 transition-all"
              style={{ width: `${Math.min(100, income > 0 ? (recData.essentialBudget / income) * 100 : 0)}%` }}
              title="Essencial"
            />
            <div
              className="bg-blue-400 transition-all"
              style={{ width: `${Math.min(100, income > 0 ? (recData.investmentBudget / income) * 100 : 0)}%` }}
              title="Metas"
            />
            <div
              className="bg-green-400 transition-all"
              style={{ width: `${Math.min(100, income > 0 ? (recData.freeBudget / income) * 100 : 0)}%` }}
              title="Livre"
            />
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Essencial</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Metas</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Livre</span>
          </div>
        </div>
      )}

      {/* Alerts */}
      {recData.alerts.length > 0 && (
        <div className="space-y-2">
          {recData.alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {recData.suggestions?.length > 0 && (
        <div className="space-y-2">
          {recData.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
              <Lightbulb size={16} className="mt-0.5 shrink-0" />
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface LeisureCardProps {
  leisureAvailable: number
  leisureSpent: number
  freeBudget: number
  goalPressure: number
  leisureFactor: number
  riskCount: number
  totalGoals: number
  goalGap: number
  leisurePct: number
}

function LeisureCard({ leisureAvailable, leisureSpent, freeBudget, goalPressure, leisureFactor, riskCount, totalGoals, goalGap, leisurePct }: LeisureCardProps) {
  const progressWidth = freeBudget > 0 ? Math.min(100, (leisureSpent / freeBudget) * leisureFactor) * 100 : 0
  const isExhausted = leisureAvailable === 0

  const penaltyLines: { label: string; value: string; warn?: boolean }[] = []
  if (goalPressure > 0) {
    penaltyLines.push({ label: 'Pressão das metas', value: `${goalPressure}%`, warn: goalPressure > 25 })
  }
  if (riskCount > 0) {
    penaltyLines.push({ label: `Metas em risco`, value: `${riskCount}/${totalGoals}`, warn: true })
  }
  if (goalGap > 0) {
    penaltyLines.push({ label: 'Gap de aporte', value: formatBRL(goalGap), warn: true })
  }

  return (
    <Card className={isExhausted ? 'border-destructive/40' : 'border-emerald-500/30'}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm font-medium text-muted-foreground">Disponível para Lazer</span>
            <InfoTooltip
              side="bottom"
              content={
                <div className="space-y-1.5">
                  <p className="font-semibold text-foreground mb-1">Como é calculado</p>
                  <p>Orçamento livre × fator de lazer − já gasto em Lazer.</p>
                  <div className="border-t border-border pt-1.5 mt-1.5 space-y-0.5">
                    <TooltipLine label="Orçamento livre" value={formatBRL(freeBudget)} />
                    <TooltipLine label="Fator de lazer" value={`${leisureFactor}%`} />
                    <TooltipLine label="Já gasto em Lazer" value={`− ${formatBRL(leisureSpent)}`} />
                  </div>
                  {penaltyLines.length > 0 && (
                    <div className="border-t border-border pt-1.5 mt-1.5">
                      <p className="font-semibold text-foreground mb-0.5">Penalidades</p>
                      {penaltyLines.map((l) => (
                        <div key={l.label} className={`flex justify-between gap-2 ${l.warn ? 'text-orange-400' : ''}`}>
                          <span>{l.label}</span>
                          <span className="font-medium">{l.value}</span>
                        </div>
                      ))}
                      <p className="mt-1 text-[10px] leading-tight opacity-70">
                        Fator cai quando há metas atrasadas. Piso mínimo: 15% do orçamento livre.
                      </p>
                    </div>
                  )}
                </div>
              }
            />
          </div>
          <p className={`text-2xl font-bold ${isExhausted ? 'text-destructive' : 'text-emerald-500'}`}>
            {formatBRL(leisureAvailable)}
          </p>
          {leisureSpent > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{formatBRL(leisureSpent)} já gasto em lazer</p>
          )}
        </div>

        {/* Progress arc */}
        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground">Fator</p>
          <p className={`text-lg font-bold ${leisureFactor < 40 ? 'text-orange-500' : leisureFactor < 70 ? 'text-yellow-500' : 'text-emerald-500'}`}>
            {leisureFactor}%
          </p>
          {penaltyLines.length > 0 && (
            <p className="text-[10px] text-orange-400 mt-0.5">{penaltyLines.length} penalidade{penaltyLines.length > 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {/* mini progress bar: spent vs available within the free budget slice */}
      {freeBudget > 0 && (
        <div className="mt-3">
          <div className="flex h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`rounded-full transition-all ${isExhausted ? 'bg-destructive' : 'bg-emerald-400'}`}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>Gasto</span>
            <span>{leisurePct}% do disponível livre</span>
          </div>
        </div>
      )}
    </Card>
  )
}

