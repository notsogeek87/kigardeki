-- AlterTable: half-day granularity for care needs. Existing rows keep
-- meaning "all day" through the defaults.
ALTER TABLE "CareNeed" ADD COLUMN "morning" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CareNeed" ADD COLUMN "afternoon" BOOLEAN NOT NULL DEFAULT true;
