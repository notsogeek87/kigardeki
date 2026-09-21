-- Step 2/2 — apply only AFTER scripts/backfill-token-hashes.ts has been run
-- against this database (it fills tokenHash/tokenEncrypted for every
-- existing row from the old plaintext "token" column). Run this migration
-- if the backfill printed 0 remaining rows; otherwise the NOT NULL
-- constraints below will fail.
ALTER TABLE "ShareLink" DROP CONSTRAINT "ShareLink_token_key";
ALTER TABLE "ShareLink" DROP COLUMN "token";
ALTER TABLE "ShareLink" ALTER COLUMN "tokenHash" SET NOT NULL;
ALTER TABLE "ShareLink" ALTER COLUMN "tokenEncrypted" SET NOT NULL;

ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_token_key";
ALTER TABLE "Invitation" DROP COLUMN "token";
ALTER TABLE "Invitation" ALTER COLUMN "tokenHash" SET NOT NULL;
ALTER TABLE "Invitation" ALTER COLUMN "tokenEncrypted" SET NOT NULL;
