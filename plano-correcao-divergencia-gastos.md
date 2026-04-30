# Plano de Correção — Divergência Comprometido vs Total Gastos

## Problema Identificado

### Causa Raiz

Há **duas fontes de dados diferentes** com tratamentos diferentes para os mesmos itens (gastos fixos de `RecurringTemplate`):

| Onde | Como calcula | Inclui projeções? |
|---|---|---|
| Dashboard → **Comprometido** | `recommendation.essentialBudget + recommendation.installments` | **Sim** — `recalculate()` injeta previews de `RecurringTemplate` em `allTransactions` antes de calcular |
| Lançamentos → **Total Gastos** | Soma client-side de `realItems` (onde `!t.isFuture`) | **Não** — filtra fora todos os items com `isFuture === true` |

### Fluxo Detalhado

**Dashboard (Comprometido):**
1. `useRecommendation(selectedMonth)` → `/recommendations/:month`
2. Retorna `Recommendation` salva no DB
3. Essa `Recommendation` foi calculada por `recalculate()` (em `calculator.ts`)
4. `recalculate()` nas linhas 146–171 cria previews virtuais para cada `RecurringTemplate` ativo que não tem `Transaction` real no mês
5. Esses previews somam ao `fixedExpenses` → `essentialBudget` → `totalCommitted`
6. **Resultado:** Comprometido de Julho/2026 inclui Conta de Luz (R$350), Max (R$40), Google One (R$10), Recarga Celular (R$40), TV (R$50), Academia (R$110) = +R$600

**Lançamentos (Total Gastos):**
1. `useProjections(selectedMonth)` → `/transactions/projections?month=2026-07`
2. `getProjections()` em `transaction.service.ts` retorna:
   - Transactions reais do DB com `isFuture: false`
   - Previews de `RecurringTemplate` com `isFuture: true`
3. No frontend (`transactions/page.tsx` linha 669):
   ```ts
   const realItems = filtered.filter((t) => !t.isFuture)
   ```
4. `totalSpent` usa `realItems` → **exclui os R$600 de gastos fixos projetados**
5. **Resultado:** Total Gastos de Julho/2026 não conta os itens visíveis na tabela marcados como "(projeção)"

---

## Arquivos Afetados

| Arquivo | Tipo de mudança |
|---|---|
| `apps/web/src/app/transactions/page.tsx` | Principal: mudar cálculo de `totalSpent` |

Nenhum arquivo de backend precisa ser alterado — a lógica de projeção está correta, o problema é exclusivamente no cálculo do resumo no frontend.

---

## Correção Proposta

### 1. `apps/web/src/app/transactions/page.tsx`

**Localização exata:** linhas 669–677

**Antes:**
```ts
const realItems = filtered.filter((t) => !t.isFuture)
const isIncomeItem = (t: { type: string; situacao?: string | null }) =>
  t.type === 'INCOME' || t.situacao === 'RECEBER'
const totalSpent = realItems.filter((t) => t.status !== 'CANCELLED' && !isIncomeItem(t))
  .reduce((s, t) => s + t.amount, 0)
const totalIncome = realItems.filter((t) => t.type === 'INCOME' && t.status !== 'CANCELLED')
  .reduce((s, t) => s + t.amount, 0)
const totalReceivable = realItems.filter((t) => getUnifiedStatus(t) === 'RECEIVABLE' && t.status !== 'CANCELLED')
  .reduce((s, t) => s + t.amount, 0)
```

**Depois:**
```ts
const realItems = filtered.filter((t) => !t.isFuture)
const isIncomeItem = (t: { type: string; situacao?: string | null }) =>
  t.type === 'INCOME' || t.situacao === 'RECEBER'
// Total Gastos inclui itens projetados (isFuture: true) que são visíveis na tabela —
// alinha com o "Comprometido" do Dashboard que também inclui previews de RecurringTemplate
const totalSpent = filtered.filter((t) => t.status !== 'CANCELLED' && !isIncomeItem(t))
  .reduce((s, t) => s + t.amount, 0)
// Receitas e A Receber: apenas transações reais (não projetar receitas futuras)
const totalIncome = realItems.filter((t) => t.type === 'INCOME' && t.status !== 'CANCELLED')
  .reduce((s, t) => s + t.amount, 0)
const totalReceivable = realItems.filter((t) => getUnifiedStatus(t) === 'RECEIVABLE' && t.status !== 'CANCELLED')
  .reduce((s, t) => s + t.amount, 0)
```

**Mudança única:** `totalSpent` passa de `realItems.filter(...)` para `filtered.filter(...)`.

### Comportamento resultante

| Cenário | Antes | Depois |
|---|---|---|
| Mês atual com projeções visíveis | Total Gastos exclui fixos projetados | Total Gastos inclui fixos projetados ✅ |
| Mês futuro (ex: Jul/2026) | Total Gastos = 0 se só houver projeções | Total Gastos mostra total projetado ✅ |
| Projeções ocultas (toggle "Projeções" off) | Não contava | Continua não contando (já excluídas de `filtered`) ✅ |
| Mês passado | Sem projeções, sem mudança | Igual ao antes ✅ |
| Receitas / A Receber | Inalterado | Inalterado ✅ |
| Contador "Registros" | Usa `realItems.length` | Continua usando `realItems.length` ✅ |

### Por que `filtered` e não `allItems`?
`filtered` já respeita:
- O toggle "Projeções" (`showProjections`)
- Todos os filtros ativos (categoria, conta, pessoa, status, tipo)

Usar `filtered` significa que "o que aparece na tabela = o que é contado". Isso é semanticamente correto e consistente.

---

## O que NÃO muda (e por quê)

- **Backend (`calculator.ts`, `transaction.service.ts`):** Corretos. A lógica de preview já existe e funciona.
- **Endpoint `/transactions/projections`:** Correto. Retorna previews com `isFuture: true`.
- **Dashboard `BudgetOverview`:** Correto. Usa a `Recommendation` que inclui previews.
- **`totalIncome` e `totalReceivable`:** Permanecem em `realItems` — não faz sentido projetar receitas.
- **Contador "Registros":** Permanece em `realItems.length` — conta só transações reais criadas.

---

## Limitação Residual

Após a correção, **Comprometido e Total Gastos ainda não serão iguais** nos casos onde existem gastos `NON_ESSENTIAL` (não essenciais):

- **Comprometido** = fixedExpenses + healthExpenses + essentialExpenses + installments (exclui não-essenciais por design)
- **Total Gastos** = toda despesa visível (inclui não-essenciais)

Isso é **intencional e correto** — o Dashboard separa "Comprometido" (obrigações) de "Livre" (discricionário). A divergência relatada pelo usuário é especificamente a ausência dos fixos projetados, não essa diferença conceitual.

Se o usuário não tiver gastos `NON_ESSENTIAL` cadastrados, os valores serão idênticos após a correção.

---

## Escopo da Correção

- 1 arquivo modificado
- 1 linha de código alterada (`realItems` → `filtered`)
- Zero impacto em backend, banco de dados ou outras páginas
- Reversível a qualquer momento
