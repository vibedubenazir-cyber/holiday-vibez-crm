-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'QUOTATION_SENT', 'BOOKING_CONFIRMED');

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "targetLeadStatus" "LeadStatus",
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "channel" "NotificationChannel" NOT NULL,
    "templateId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_logs" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "NotificationStatus" NOT NULL DEFAULT 'SENT',

    CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "automation_logs_ruleId_leadId_key" ON "automation_logs"("ruleId", "leadId");

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "automation_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
