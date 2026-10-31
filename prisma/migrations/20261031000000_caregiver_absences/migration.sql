-- AlterTable: absences are opt-in per caregiver.
ALTER TABLE "Caregiver" ADD COLUMN "tracksAbsences" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CaregiverAbsence" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaregiverAbsence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaregiverAbsence_familyId_endDate_idx" ON "CaregiverAbsence"("familyId", "endDate");

-- CreateIndex
CREATE INDEX "CaregiverAbsence_caregiverId_idx" ON "CaregiverAbsence"("caregiverId");

-- AddForeignKey
ALTER TABLE "CaregiverAbsence" ADD CONSTRAINT "CaregiverAbsence_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverAbsence" ADD CONSTRAINT "CaregiverAbsence_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverAbsence" ADD CONSTRAINT "CaregiverAbsence_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
