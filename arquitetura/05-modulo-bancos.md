# 05 — Módulo de Bancos & Contas

## Responsabilidade

Gerenciar as origens de pagamento do usuário (bancos, carteiras, dinheiro físico) e manter visão consolidada do saldo.

---

## Regras de Negócio

### Saldo da Conta

O campo `Account.balance` pode ser:

- **Saldo manual**: usuário informa diretamente via `PATCH /accounts/:id`
- **Saldo calculado**: `balance_inicial + sum(INCOME) - sum(PAID transactions)`

No MVP, o saldo é **sempre manual** — o usuário atualiza quando quiser. Cálculo automático entra na Fase 4.

### Saldo Total Consolidado

```
GET /accounts → frontend soma todos os balance
```

O endpoint de relatório retorna `totalBalance = sum(accounts.balance)`.

### Soft Delete

Contas não são deletadas fisicamente. `isActive = false` oculta da UI mas mantém histórico nas transações.

**Regra:** não pode desativar conta que tenha transações com `status = PENDING` no futuro.

---

## Ícones Suportados

Slug mapeia para componente de ícone no frontend (Lucide Icons):

```
bank, credit-card, wallet, coins, building, piggy-bank, landmark, smartphone
```

---

## Cores Sugeridas (por banco brasileiro)

| Banco | Cor hex |
|---|---|
| Nubank | #8B5CF6 |
| Inter | #F97316 |
| Itaú | #F59E0B |
| Bradesco | #EF4444 |
| Caixa | #1D4ED8 |
| BB | #FBBF24 |
| Sicredi | #16A34A |
| Dinheiro | #6B7280 |

---

## Serviço: AccountService

```typescript
class AccountService {
  async list(userId: string): Promise<Account[]>
  async create(userId: string, input: CreateAccountInput): Promise<Account>
  async update(userId: string, id: string, input: UpdateAccountInput): Promise<Account>
  async deactivate(userId: string, id: string): Promise<void>
  async getConsolidatedBalance(userId: string): Promise<number>
}
```

---

## Filtro de Relatório por Banco

O módulo de relatórios aceita `accountId` como filtro em todos os endpoints:

```
GET /reports/monthly?month=2025-04&accountId=cuid
```

Retorna gastos filtrando apenas as transações daquela conta.

---

## Fluxo: Criar Conta

```
POST /accounts
  → Valida input (Zod)
  → Cria Account no banco
  → Retorna Account criada
  (Brain não é disparado — conta vazia não afeta orçamento)
```

## Fluxo: Atualizar Saldo Manualmente

```
PATCH /accounts/:id { balance: 1500.00 }
  → Atualiza balance no banco
  → Atualiza BudgetSnapshot.totalBalance do mês atual
  (Brain não é disparado — saldo não afeta orçamento projetado)
```
