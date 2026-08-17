-- CreateEnum
CREATE TYPE "ItineraryPlanStatus" AS ENUM ('DRAFT', 'READY_TO_SHARE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ItineraryEventType" AS ENUM ('ACCOMMODATION', 'ACTIVITY', 'TRANSPORTATION', 'VISA', 'MEAL', 'FLIGHT', 'LEISURE', 'CRUISE');

-- CreateTable
CREATE TABLE "itinerary_plans" (
    "id" TEXT NOT NULL,
    "refNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "leadId" TEXT,
    "destinations" TEXT[],
    "startDate" DATE,
    "endDate" DATE,
    "adultsCount" INTEGER NOT NULL DEFAULT 1,
    "childrenCount" INTEGER NOT NULL DEFAULT 0,
    "infantsCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "coverPhotoUrl" TEXT,
    "theme" TEXT,
    "status" "ItineraryPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "showOnWebsite" BOOLEAN NOT NULL DEFAULT false,
    "websitePerPersonPrice" DECIMAL(14,2),
    "websiteValidUntil" DATE,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "aboutPackage" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_plan_days" (
    "id" TEXT NOT NULL,
    "itineraryPlanId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" DATE,

    CONSTRAINT "itinerary_plan_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_plan_events" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "type" "ItineraryEventType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "destination" TEXT,
    "date" DATE,
    "startTime" TEXT,
    "endTime" TEXT,
    "showTime" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "transferType" "TransportationType",
    "netAmount" DECIMAL(14,2),
    "markupPct" DECIMAL(5,2),
    "addOns" JSONB,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_plan_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_pricing_options" (
    "id" TEXT NOT NULL,
    "itineraryPlanId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Option 1',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "baseMarkupPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "extraMarkupAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cgstPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "sgstPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "igstPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tcsPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_pricing_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_package_terms" (
    "id" TEXT NOT NULL,
    "itineraryPlanId" TEXT NOT NULL,
    "bookingAndPayment" TEXT,
    "pricingAndInclusions" TEXT,
    "cancellationsAndRefunds" TEXT,
    "liability" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_package_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_images" (
    "id" TEXT NOT NULL,
    "itineraryPlanId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itinerary_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_event_templates" (
    "id" TEXT NOT NULL,
    "type" "ItineraryEventType" NOT NULL,
    "destination" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_event_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PricingOptionAccommodations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_plans_refNo_key" ON "itinerary_plans"("refNo");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_plan_days_itineraryPlanId_dayNumber_key" ON "itinerary_plan_days"("itineraryPlanId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_package_terms_itineraryPlanId_key" ON "itinerary_package_terms"("itineraryPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "_PricingOptionAccommodations_AB_unique" ON "_PricingOptionAccommodations"("A", "B");

-- CreateIndex
CREATE INDEX "_PricingOptionAccommodations_B_index" ON "_PricingOptionAccommodations"("B");

-- AddForeignKey
ALTER TABLE "itinerary_plans" ADD CONSTRAINT "itinerary_plans_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_plans" ADD CONSTRAINT "itinerary_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_plan_days" ADD CONSTRAINT "itinerary_plan_days_itineraryPlanId_fkey" FOREIGN KEY ("itineraryPlanId") REFERENCES "itinerary_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_plan_events" ADD CONSTRAINT "itinerary_plan_events_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "itinerary_plan_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_pricing_options" ADD CONSTRAINT "itinerary_pricing_options_itineraryPlanId_fkey" FOREIGN KEY ("itineraryPlanId") REFERENCES "itinerary_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_package_terms" ADD CONSTRAINT "itinerary_package_terms_itineraryPlanId_fkey" FOREIGN KEY ("itineraryPlanId") REFERENCES "itinerary_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_images" ADD CONSTRAINT "itinerary_images_itineraryPlanId_fkey" FOREIGN KEY ("itineraryPlanId") REFERENCES "itinerary_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PricingOptionAccommodations" ADD CONSTRAINT "_PricingOptionAccommodations_A_fkey" FOREIGN KEY ("A") REFERENCES "itinerary_plan_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PricingOptionAccommodations" ADD CONSTRAINT "_PricingOptionAccommodations_B_fkey" FOREIGN KEY ("B") REFERENCES "itinerary_pricing_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
