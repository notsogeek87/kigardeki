-- CreateTable
CREATE TABLE "CareNeed" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareNeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CareNeed_familyId_date_idx" ON "CareNeed"("familyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CareNeed_childId_date_key" ON "CareNeed"("childId", "date");

-- AddForeignKey
ALTER TABLE "CareNeed" ADD CONSTRAINT "CareNeed_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNeed" ADD CONSTRAINT "CareNeed_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNeed" ADD CONSTRAINT "CareNeed_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
