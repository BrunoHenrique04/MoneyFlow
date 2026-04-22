# 02 — Modelos de Dados

Schema Prisma completo. Usar como fonte da verdade para migrations.

---

## Schema Prisma

```prisma
// packages/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // trocar para "sqlite" em dev local
  url      = env("DATABASE_URL")
}

// ─── Usuário ──────────────────────────────────────────────────────────────────

model User {
  id              String   @id @default(cuid())
  name            String
  monthlyIncome   Float    @default(0)
  currency        String   @default("BRL")
  timezone        String   @default("America/Sao_Paulo")
  telegramChatId  String?  @unique
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  accounts        Account[]
  categories      Category[]
  transactions    Transaction[]
  installmentGroups InstallmentGroup[]
  goals           Goal[]
  recommendations Recommendation[]
  budgetSnapshots BudgetSnapshot[]
  categoryLimits  CategoryLimit[]
}

// ─── Conta / Banco ────────────────────────────────────────────────────────────

model Account {
  id        String   @id @default(cuid())
  userId    String
  name      String                        // "Nubank", "Inter", "Dinheiro"
  color     String   @default("#6B7280")  // hex
  icon      String   @default("bank")    // slug do ícone
  balance   Float    @default(0)          // saldo manual ou calculado
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user         User          @relation(fields: [userId], references: [id])
  transactions Transaction[]

  @@index([userId])
}

// ─── Categoria ────────────────────────────────────────────────────────────────

model Category {
  id        String   @id @default(cuid())
  userId    String
  name      String                        // "Alimentação", "Lazer"
  color     String   @default("#6B7280")
  icon      String   @default("tag")
  isDefault Boolean  @default(false)      // categorias seed do sistema
  createdAt DateTime @default(now())

  user           User            @relation(fields: [userId], references: [id])
  transactions   Transaction[]
  categoryLimits CategoryLimit[]

  @@index([userId])
}

// ─── Limite por Categoria ─────────────────────────────────────────────────────

model CategoryLimit {
  id         String @id @default(cuid())
  userId     String
  categoryId String
  limitValue Float                         // ex: 300.00

  user     User     @relation(fields: [userId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  @@unique([userId, categoryId])
}

// ─── Grupo de Parcelas ────────────────────────────────────────────────────────

model InstallmentGroup {
  id              String   @id @default(cuid())
  userId          String
  description     String
  totalAmount     Float
  totalInstallments Int
  firstDueDate    DateTime
  createdAt       DateTime @default(now())

  user         User          @relation(fields: [userId], references: [id])
  transactions Transaction[]

  @@index([userId])
}

// ─── Transação ────────────────────────────────────────────────────────────────

enum TransactionType {
  SINGLE       // gasto único
  INSTALLMENT  // parcela de compra parcelada
  RECURRING    // gasto recorrente (assinatura, etc.)
  INCOME       // entrada de dinheiro
}

enum UtilityTag {
  ESSENTIAL      // essencial
  NON_ESSENTIAL  // não-essencial
  INVESTMENT     // investimento
}

enum TransactionStatus {
  PENDING   // data futura, ainda não ocorreu
  PAID      // pago/confirmado
  CANCELLED // cancelado
}

model Transaction {
  id                 String            @id @default(cuid())
  userId             String
  accountId          String
  categoryId         String
  installmentGroupId String?           // null se não for parcelado
  description        String
  amount             Float             // valor desta parcela/transação
  type               TransactionType
  utilityTag         UtilityTag
  status             TransactionStatus @default(PENDING)
  dueDate            DateTime          // data de vencimento/ocorrência
  paidAt             DateTime?         // quando foi marcado como pago
  installmentNumber  Int?              // ex: 3 (de 10)
  notes              String?
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  user             User              @relation(fields: [userId], references: [id])
  account          Account           @relation(fields: [accountId], references: [id])
  category         Category          @relation(fields: [categoryId], references: [id])
  installmentGroup InstallmentGroup? @relation(fields: [installmentGroupId], references: [id])

  @@index([userId, dueDate])
  @@index([userId, status])
  @@index([installmentGroupId])
}

// ─── Objetivo / Meta ──────────────────────────────────────────────────────────

enum GoalPriority {
  HIGH
  MEDIUM
  LOW
}

enum GoalStatus {
  ACTIVE
  COMPLETED
  PAUSED
  CANCELLED
}

model Goal {
  id            String       @id @default(cuid())
  userId        String
  name          String                        // "Moto Honda CB 300"
  targetAmount  Float
  savedAmount   Float        @default(0)
  targetDate    DateTime                      // prazo desejado
  priority      GoalPriority @default(MEDIUM)
  status        GoalStatus   @default(ACTIVE)
  monthlyAporte Float        @default(0)     // calculado pelo Brain
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId, status])
}

// ─── Recomendação (saída do Brain) ────────────────────────────────────────────

model Recommendation {
  id                   String   @id @default(cuid())
  userId               String
  referenceMonth       String                      // "2025-04" (YYYY-MM)
  essentialBudget      Float
  investmentBudget     Float
  freeBudget           Float
  alerts               Json     @default("[]")    // string[]
  suggestions          Json     @default("[]")    // string[]
  calculatedAt         DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, referenceMonth])
  @@unique([userId, referenceMonth])              // um snapshot por mês
}

// ─── Snapshot de Orçamento ────────────────────────────────────────────────────

model BudgetSnapshot {
  id             String   @id @default(cuid())
  userId         String
  month          String                           // "2025-04" (YYYY-MM)
  totalIncome    Float
  totalEssential Float
  totalInstallments Float
  totalGoalAporte Float
  totalFree      Float
  totalSpent     Float
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, month])
}
```

---

## Diagrama de Relacionamentos

```
User
 ├── Account (1:N)
 ├── Category (1:N)
 │    └── CategoryLimit (1:1 por usuário)
 ├── InstallmentGroup (1:N)
 │    └── Transaction (1:N) ──► Account, Category
 ├── Transaction (1:N, direto) ──► Account, Category
 ├── Goal (1:N)
 ├── Recommendation (1:N, unique por mês)
 └── BudgetSnapshot (1:N, unique por mês)
```

---

## Categorias Seed (padrão)

Criadas automaticamente no primeiro acesso:

| Nome | Ícone | Cor |
|---|---|---|
| Alimentação | utensils | #F59E0B |
| Transporte | car | #3B82F6 |
| Moradia | home | #8B5CF6 |
| Saúde | heart | #EF4444 |
| Educação | book | #10B981 |
| Lazer | gamepad | #F97316 |
| Tecnologia | monitor | #6366F1 |
| Vestuário | shirt | #EC4899 |
| Outros | tag | #6B7280 |

---

## Convenções

- IDs: `cuid()` — prefixo legível, sem colisão
- Datas: sempre UTC no banco, conversão para timezone do usuário na API
- `referenceMonth` e `month`: formato `YYYY-MM` como string (fácil de indexar e exibir)
- `amount`: sempre positivo; o `type` define se é débito ou crédito
- Saldo de `Account`: atualizado manualmente ou recalculado via `SELECT SUM`
