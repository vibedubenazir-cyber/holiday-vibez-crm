-- CreateTable
CREATE TABLE "marketing_occasions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "messageBody" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "audienceBranchId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_occasions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "marketing_occasions" ADD CONSTRAINT "marketing_occasions_audienceBranchId_fkey" FOREIGN KEY ("audienceBranchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
