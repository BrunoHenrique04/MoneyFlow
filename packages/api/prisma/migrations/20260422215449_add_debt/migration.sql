-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "pessoa" TEXT NOT NULL,
    "dataCompra" DATETIME,
    "descricao" TEXT NOT NULL,
    "banco" TEXT,
    "valorAPagar" REAL NOT NULL,
    "valorTotalCompra" REAL NOT NULL,
    "situacao" TEXT NOT NULL DEFAULT 'NAO_PAGO',
    "dataVencimento" DATETIME,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Debt_userId_idx" ON "Debt"("userId");

-- CreateIndex
CREATE INDEX "Debt_userId_pessoa_idx" ON "Debt"("userId", "pessoa");

-- CreateIndex
CREATE INDEX "Debt_userId_situacao_idx" ON "Debt"("userId", "situacao");
