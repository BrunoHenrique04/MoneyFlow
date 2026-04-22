# 09 — Telegram Bot

## Responsabilidade

Interface alternativa de entrada de dados via chat. Chama os mesmos endpoints da API REST do web app — sem lógica de negócio própria.

---

## Stack

- **Framework:** Grammy (TypeScript)
- **Modo dev:** Long polling (`bot.start()`)
- **Modo prod:** Webhook via `bot.api.setWebhook(url)`
- **Autenticação:** `telegramChatId` vinculado ao usuário no banco

---

## Vinculação de Conta

No primeiro uso, o usuário envia `/start` ao bot. O bot exibe um link com token único para vincular ao perfil no web app:

```
/start → Bot responde:
"Para vincular sua conta, acesse: https://moneyflow.app/telegram/link?token=<uuid>"
```

O web app salva o `telegramChatId` no `User.telegramChatId`.

---

## Comandos

### `/gasto [valor] [descrição] [categoria]`

```
/gasto 25.90 Uber transporte
```

Equivale a `POST /transactions` com `type=SINGLE`, `utilityTag=NON_ESSENTIAL`, `dueDate=hoje`.

**Resposta do bot:**
```
✅ Gasto registrado!
📝 Uber - R$ 25,90
📁 Transporte
💳 Nubank (conta padrão)
💸 Orçamento livre restante: R$ 686,60
```

### `/parcelado [valor] [parcelas] [descrição]`

```
/parcelado 3000 10 "Celular Samsung"
```

Equivale a `POST /transactions` com `type=INSTALLMENT`.

### `/resumo`

Retorna o relatório do mês atual.

**Resposta:**
```
📊 Resumo de Abril/2025
💰 Renda: R$ 5.000,00
💸 Gasto total: R$ 3.456,00
  🔴 Essencial: R$ 2.100,00
  🟡 Não-essencial: R$ 1.156,00
  🟢 Investimento: R$ 200,00
🎯 Orçamento livre: R$ 544,00
⚠️ Lazer acima do limite!
```

### `/saldo`

```
💳 Contas
• Nubank: R$ 1.200,00
• Inter: R$ 800,00
• Dinheiro: R$ 150,00
─────────────────
💰 Total: R$ 2.150,00
```

### `/objetivo add [nome] [valor] [prazo]`

```
/objetivo add "Moto Honda CB300" 15000 2026-01
```

### `/objetivo lista`

Lista objetivos ativos com progresso.

### `/parcelas`

Lista parcelas do mês atual e dos próximos 3 meses.

---

## Wizard de Gasto Complexo

Quando o usuário envia apenas `/gasto` sem argumentos, o bot inicia um fluxo conversacional:

```
Bot: "Qual o valor do gasto?"
User: 250
Bot: "Qual a descrição?"
User: Mercado
Bot: "Qual a categoria?"
  [Alimentação] [Transporte] [Lazer] [Outros]
User: clica em "Alimentação"
Bot: "Qual o banco?"
  [Nubank] [Inter] [Dinheiro]
User: clica em "Nubank"
Bot: "É essencial ou não-essencial?"
  [Essencial] [Não-essencial]
User: clica em "Essencial"
Bot: ✅ Gasto registrado! ...
```

Grammy usa `conversation` plugin para manter o estado do wizard.

---

## Estrutura do Bot

```
apps/bot/
├── index.ts              # inicialização, webhook setup
├── middleware/
│   └── auth.ts           # verifica telegramChatId no banco
├── commands/
│   ├── start.ts
│   ├── gasto.ts
│   ├── parcelado.ts
│   ├── resumo.ts
│   ├── saldo.ts
│   └── objetivo.ts
├── wizards/
│   ├── gasto-wizard.ts
│   └── parcelado-wizard.ts
├── formatters/
│   └── money.ts          # formata valores em BRL
└── api-client.ts         # wrapper do fetch para a API interna
```

---

## API Client interno

O bot **não acessa o banco diretamente**. Usa a API REST:

```typescript
// apps/bot/src/api-client.ts
const apiClient = {
  async createTransaction(input: CreateTransactionInput) {
    return fetch(`${API_URL}/api/v1/transactions`, {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then(r => r.json())
  },
  // ...
}
```

---

## Variáveis de Ambiente do Bot

```env
TELEGRAM_BOT_TOKEN=
API_URL=https://api.moneyflow.app
API_KEY=
WEBHOOK_URL=https://api.moneyflow.app/telegram/webhook
```

---

## Tratamento de Erros

| Situação | Resposta do bot |
|---|---|
| Usuário não vinculado | "Você ainda não vinculou sua conta. Use /start" |
| Valor inválido | "Valor inválido. Use: /gasto 25.90 descrição categoria" |
| Categoria não encontrada | Bot exibe teclado inline com categorias disponíveis |
| Erro interno da API | "Ops, algo deu errado. Tente novamente em alguns segundos." |
