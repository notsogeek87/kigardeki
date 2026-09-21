-- Step 1/2 of moving ShareLink.token and Invitation.token off plaintext
-- (see src/lib/crypto.ts#hashToken and the doc comments on these models).
--
-- Additive only, so it is safe to run before deploying the code that
-- requires these columns: nothing reads or requires them yet. Existing rows
-- get NULL here; run `scripts/backfill-token-hashes.ts` against the target
-- database next, THEN apply
-- 20260921000100_finalize_token_hash_columns, which drops the old plaintext
-- "token" column and makes these NOT NULL.
ALTER TABLE "ShareLink" ADD COLUMN "tokenHash" TEXT;
ALTER TABLE "ShareLink" ADD COLUMN "tokenEncrypted" TEXT;
CREATE UNIQUE INDEX "ShareLink_tokenHash_key" ON "ShareLink"("tokenHash");

ALTER TABLE "Invitation" ADD COLUMN "tokenHash" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "tokenEncrypted" TEXT;
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");
