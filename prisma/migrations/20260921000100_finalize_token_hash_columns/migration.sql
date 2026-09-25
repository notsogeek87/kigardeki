-- Step 2/2 — apply only AFTER scripts/backfill-token-hashes.ts has been run
-- against this database (it fills tokenHash/tokenEncrypted for every
-- existing row from the old plaintext "token" column). Run this migration
-- if the backfill printed 0 remaining rows; otherwise the NOT NULL
-- constraints below will fail.
-- "token" was made unique via a plain unique index (not a named table
-- constraint), so it's dropped as an index, not with DROP CONSTRAINT.
DROP INDEX "ShareLink_token_key";
ALTER TABLE "ShareLink" DROP COLUMN "token";
ALTER TABLE "ShareLink" ALTER COLUMN "tokenHash" SET NOT NULL;
ALTER TABLE "ShareLink" ALTER COLUMN "tokenEncrypted" SET NOT NULL;

DROP INDEX "Invitation_token_key";
ALTER TABLE "Invitation" DROP COLUMN "token";
ALTER TABLE "Invitation" ALTER COLUMN "tokenHash" SET NOT NULL;
ALTER TABLE "Invitation" ALTER COLUMN "tokenEncrypted" SET NOT NULL;
