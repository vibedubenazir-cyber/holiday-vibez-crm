-- CreateEnum
CREATE TYPE "PettyCashType" AS ENUM ('CASH_IN', 'CASH_OUT');

-- CreateEnum
CREATE TYPE "BankTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'RECEIVED');

-- CreateTable
CREATE TABLE "petty_cash_entries" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "type" "PettyCashType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "category" TEXT,
    "description" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "petty_cash_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "budgetedAmount" DECIMAL(14,2) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "transactionDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" "BankTransactionType" NOT NULL,
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "matchedPaymentId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dmc_commissions" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "bookingId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "tdsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dmc_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budgets_branchId_category_month_year_key" ON "budgets"("branchId", "category", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_matchedPaymentId_key" ON "bank_transactions"("matchedPaymentId");

-- AddForeignKey
ALTER TABLE "petty_cash_entries" ADD CONSTRAINT "petty_cash_entries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_matchedPaymentId_fkey" FOREIGN KEY ("matchedPaymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dmc_commissions" ADD CONSTRAINT "dmc_commissions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dmc_commissions" ADD CONSTRAINT "dmc_commissions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
