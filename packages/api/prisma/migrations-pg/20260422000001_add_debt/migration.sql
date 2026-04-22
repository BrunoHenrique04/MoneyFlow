-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pessoa" TEXT NOT NULL,
    "dataCompra" TIMESTAMP(3),
    "descricao" TEXT NOT NULL,
    "banco" TEXT,
    "valorAPagar" DOUBLE PRECISION NOT NULL,
    "valorTotalCompra" DOUBLE PRECISION NOT NULL,
    "situacao" TEXT NOT NULL DEFAULT 'NAO_PAGO',
    "dataVencimento" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Debt_userId_idx" ON "Debt"("userId");

-- CreateIndex
CREATE INDEX "Debt_userId_pessoa_idx" ON "Debt"("userId", "pessoa");

-- CreateIndex
CREATE INDEX "Debt_userId_situacao_idx" ON "Debt"("userId", "situacao");

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
