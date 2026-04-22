# 03 — API REST

Base URL: `/api/v1`

Todas as respostas seguem o envelope:
```json
{ "data": <payload>, "error": null }
{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

---

## Autenticação (MVP Single-User)

No MVP não há login. A API usa um `API_KEY` fixo via header:
```
X-API-Key: <valor do .env>
```

---

## Módulo: Usuário

### `GET /user`
Retorna o perfil do usuário.

**Response:**
```json
{
  "id": "cuid",
  "name": "Bruno",
  "monthlyIncome": 5000.00,
  "currency": "BRL",
  "timezone": "America/Sao_Paulo",
  "telegramChatId": "123456789"
}
```

### `PATCH /user`
Atualiza perfil. Dispara Brain após atualizar renda.

**Body:**
```json
{
  "name": "Bruno",
  "monthlyIncome": 5500.00,
  "timezone": "America/Sao_Paulo"
}
```

---

## Módulo: Contas (Accounts)

### `GET /accounts`
Lista todas as contas ativas.

**Response:**
```json
[
  { "id": "...", "name": "Nubank", "color": "#8B5CF6", "icon": "credit-card", "balance": 1200.00 }
]
```

### `POST /accounts`
```json
{ "name": "Inter", "color": "#F97316", "icon": "bank", "balance": 500.00 }
```

### `PATCH /accounts/:id`
Atualiza nome, cor, ícone ou saldo.

### `DELETE /accounts/:id`
Desativa a conta (soft delete). Retorna erro se houver transações futuras pendentes.

---

## Módulo: Categorias

### `GET /categories`
Lista categorias do usuário (padrão + customizadas).

### `POST /categories`
```json
{ "name": "Pet", "color": "#F59E0B", "icon": "paw" }
```

### `PATCH /categories/:id`
### `DELETE /categories/:id`
Retorna erro se a categoria tiver transações vinculadas.

---

## Módulo: Lançamentos (Transactions)

### `GET /transactions`
Lista transações com filtros opcionais.

**Query params:**
| Param | Tipo | Exemplo |
|---|---|---|
| `month` | `YYYY-MM` | `2025-04` |
| `accountId` | string | `cuid` |
| `categoryId` | string | `cuid` |
| `type` | enum | `INSTALLMENT` |
| `status` | enum | `PENDING` |
| `utilityTag` | enum | `ESSENTIAL` |

**Response:**
```json
{
  "items": [...],
  "total": 15,
  "summary": {
    "totalAmount": 3200.00,
    "essential": 1800.00,
    "nonEssential": 1200.00,
    "investment": 200.00
  }
}
```

### `POST /transactions`
Cria lançamento único, parcelado ou recorrente.

**Body (único):**
```json
{
  "type": "SINGLE",
  "description": "Uber",
  "amount": 25.90,
  "accountId": "cuid",
  "categoryId": "cuid",
  "utilityTag": "NON_ESSENTIAL",
  "dueDate": "2025-04-15",
  "notes": ""
}
```

**Body (parcelado):**
```json
{
  "type": "INSTALLMENT",
  "description": "Celular Samsung",
  "totalAmount": 3000.00,
  "totalInstallments": 10,
  "firstDueDate": "2025-04-10",
  "accountId": "cuid",
  "categoryId": "cuid",
  "utilityTag": "NON_ESSENTIAL"
}
```
> O backend cria o `InstallmentGroup` e as 10 `Transactions` automaticamente.

**Body (recorrente):**
```json
{
  "type": "RECURRING",
  "description": "Netflix",
  "amount": 55.90,
  "accountId": "cuid",
  "categoryId": "cuid",
  "utilityTag": "NON_ESSENTIAL",
  "firstDueDate": "2025-04-01",
  "recurrenceMonths": 12
}
```
> Gera N transações mensais até o limite informado.

**Response:** `201 Created` com a transação criada (ou `InstallmentGroup` com transações).

### `PATCH /transactions/:id`
Atualiza campos de uma transação individual.

**Campos editáveis:** `description`, `amount`, `categoryId`, `utilityTag`, `dueDate`, `notes`, `status`, `paidAt`

### `DELETE /transactions/:id`
**Query param:** `?cancelFuture=true`
- Sem `cancelFuture`: cancela apenas esta parcela
- Com `cancelFuture=true`: cancela esta e todas as parcelas seguintes do mesmo grupo

### `PATCH /transactions/:id/pay`
Marca a transação como paga.
```json
{ "paidAt": "2025-04-15T10:30:00Z" }
```

---

## Módulo: Objetivos (Goals)

### `GET /goals`
**Query:** `?status=ACTIVE`

**Response:**
```json
[
  {
    "id": "cuid",
    "name": "Moto Honda CB 300",
    "targetAmount": 15000.00,
    "savedAmount": 3200.00,
    "targetDate": "2026-01-01",
    "priority": "HIGH",
    "monthlyAporte": 487.50,
    "progressPercent": 21.3,
    "monthsRemaining": 8,
    "status": "ACTIVE"
  }
]
```

### `POST /goals`
Cria objetivo e dispara Brain.
```json
{
  "name": "Moto Honda CB 300",
  "targetAmount": 15000.00,
  "targetDate": "2026-01-01",
  "priority": "HIGH",
  "savedAmount": 3200.00
}
```

### `PATCH /goals/:id`
Atualiza e dispara Brain.

### `DELETE /goals/:id`
Remove o objetivo e recalcula o Brain (libera orçamento).

### `POST /goals/:id/deposit`
Registra aporte manual na meta.
```json
{ "amount": 500.00 }
```

---

## Módulo: Recomendações (Brain)

### `GET /recommendations/current`
Retorna a recomendação calculada para o mês atual.

**Response:**
```json
{
  "referenceMonth": "2025-04",
  "essentialBudget": 2800.00,
  "investmentBudget": 987.50,
  "freeBudget": 712.50,
  "alerts": [
    "Lazer ultrapassou o limite de R$ 300"
  ],
  "suggestions": [
    "Você pode investir R$ 487/mês para a Moto. Meta atingida em 8 meses.",
    "Seu orçamento livre caiu 15% vs. mês anterior."
  ],
  "calculatedAt": "2025-04-15T08:00:00Z"
}
```

### `GET /recommendations`
**Query:** `?months=6` — retorna histórico dos últimos N meses.

### `POST /recommendations/recalculate`
Força recalculo manual (útil para debug).

---

## Módulo: Relatórios

### `GET /reports/monthly`
**Query:** `?month=2025-04`

```json
{
  "month": "2025-04",
  "totalIncome": 5000.00,
  "totalSpent": 4200.00,
  "byCategory": [
    { "categoryId": "...", "name": "Alimentação", "amount": 800.00, "percent": 19.0 }
  ],
  "byAccount": [
    { "accountId": "...", "name": "Nubank", "amount": 3100.00 }
  ],
  "byUtility": {
    "essential": 2800.00,
    "nonEssential": 1200.00,
    "investment": 200.00
  }
}
```

### `GET /reports/installment-timeline`
**Query:** `?months=6` — próximos N meses.

```json
[
  {
    "month": "2025-05",
    "installments": [
      { "description": "Celular Samsung", "amount": 300.00, "installmentNumber": 2, "of": 10 }
    ],
    "totalInstallments": 300.00
  }
]
```

### `GET /reports/cashflow`
**Query:** `?months=6`

Projeção dos próximos N meses baseada em recorrências + parcelas ativas.

### `GET /reports/comparison`
Compara mês atual vs anterior vs média dos últimos 3 meses.

---

## Módulo: Configurações

### `GET /settings/category-limits`
### `POST /settings/category-limits`
```json
{ "categoryId": "cuid", "limitValue": 300.00 }
```
### `DELETE /settings/category-limits/:categoryId`

---

## Códigos de Erro

| Código | HTTP | Descrição |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Corpo inválido (Zod) |
| `NOT_FOUND` | 404 | Recurso não encontrado |
| `CONFLICT` | 409 | Violação de unicidade |
| `ACCOUNT_HAS_TRANSACTIONS` | 409 | Tentativa de deletar conta com transações |
| `BRAIN_ERROR` | 500 | Falha no motor de recomendações |
| `UNAUTHORIZED` | 401 | API Key ausente ou inválida |
