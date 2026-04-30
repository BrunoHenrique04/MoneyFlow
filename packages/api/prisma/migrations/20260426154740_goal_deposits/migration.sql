-- CreateTable
CREATE TABLE "RecurringTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "utilityTag" TEXT NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "startMonth" TEXT NOT NULL,
    "endMonth" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringTemplate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoalDeposit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "note" TEXT,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoalDeposit_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalDeposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goalMode" TEXT NOT NULL DEFAULT 'DEADLINE_TARGET',
    "targetAmount" REAL,
    "savedAmount" REAL NOT NULL DEFAULT 0,
    "targetDate" DATETIME,
    "fixedMonthlyAporte" REAL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "monthlyAporte" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Goal" ("createdAt", "id", "monthlyAporte", "name", "priority", "savedAmount", "status", "targetAmount", "targetDate", "updatedAt", "userId") SELECT "createdAt", "id", "monthlyAporte", "name", "priority", "savedAmount", "status", "targetAmount", "targetDate", "updatedAt", "userId" FROM "Goal";
DROP TABLE "Goal";
ALTER TABLE "new_Goal" RENAME TO "Goal";
CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");
CREATE TABLE "new_Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "referenceMonth" TEXT NOT NULL,
    "essentialBudget" REAL NOT NULL,
    "investmentBudget" REAL NOT NULL,
    "freeBudget" REAL NOT NULL,
    "alerts" TEXT NOT NULL DEFAULT '[]',
    "suggestions" TEXT NOT NULL DEFAULT '[]',
    "leisureAvailable" REAL NOT NULL DEFAULT 0,
    "leisureDetails" TEXT NOT NULL DEFAULT '{}',
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Recommendation" ("alerts", "calculatedAt", "essentialBudget", "freeBudget", "id", "investmentBudget", "referenceMonth", "suggestions", "userId") SELECT "alerts", "calculatedAt", "essentialBudget", "freeBudget", "id", "investmentBudget", "referenceMonth", "suggestions", "userId" FROM "Recommendation";
DROP TABLE "Recommendation";
ALTER TABLE "new_Recommendation" RENAME TO "Recommendation";
CREATE INDEX "Recommendation_userId_referenceMonth_idx" ON "Recommendation"("userId", "referenceMonth");
CREATE UNIQUE INDEX "Recommendation_userId_referenceMonth_key" ON "Recommendation"("userId", "referenceMonth");
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "categoryId" TEXT NOT NULL,
    "installmentGroupId" TEXT,
    "recurringTemplateId" TEXT,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "totalAmount" REAL,
    "pessoa" TEXT,
    "situacao" TEXT,
    "type" TEXT NOT NULL,
    "utilityTag" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" DATETIME NOT NULL,
    "paidAt" DATETIME,
    "installmentNumber" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_installmentGroupId_fkey" FOREIGN KEY ("installmentGroupId") REFERENCES "InstallmentGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "RecurringTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("accountId", "amount", "categoryId", "createdAt", "description", "dueDate", "id", "installmentGroupId", "installmentNumber", "notes", "paidAt", "status", "type", "updatedAt", "userId", "utilityTag") SELECT "accountId", "amount", "categoryId", "createdAt", "description", "dueDate", "id", "installmentGroupId", "installmentNumber", "notes", "paidAt", "status", "type", "updatedAt", "userId", "utilityTag" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_userId_dueDate_idx" ON "Transaction"("userId", "dueDate");
CREATE INDEX "Transaction_userId_status_idx" ON "Transaction"("userId", "status");
CREATE INDEX "Transaction_userId_pessoa_idx" ON "Transaction"("userId", "pessoa");
CREATE INDEX "Transaction_installmentGroupId_idx" ON "Transaction"("installmentGroupId");
CREATE INDEX "Transaction_recurringTemplateId_idx" ON "Transaction"("recurringTemplateId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RecurringTemplate_userId_idx" ON "RecurringTemplate"("userId");

-- CreateIndex
CREATE INDEX "RecurringTemplate_userId_isActive_idx" ON "RecurringTemplate"("userId", "isActive");

-- CreateIndex
CREATE INDEX "GoalDeposit_goalId_month_idx" ON "GoalDeposit"("goalId", "month");

-- CreateIndex
CREATE INDEX "GoalDeposit_userId_month_idx" ON "GoalDeposit"("userId", "month");
