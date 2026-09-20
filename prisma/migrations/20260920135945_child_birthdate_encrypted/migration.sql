-- Child.birthDate now stores an application-encrypted ISO date string
-- instead of a native timestamp (see src/lib/crypto.ts).
ALTER TABLE "Child" DROP COLUMN "birthDate";
ALTER TABLE "Child" ADD COLUMN "birthDate" TEXT;
