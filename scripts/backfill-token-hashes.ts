/**
 * One-off data migration: fills tokenHash/tokenEncrypted on every existing
 * ShareLink/Invitation row from the old plaintext "token" column, ahead of
 * dropping that column.
 *
 * Run this AFTER applying prisma/migrations/20260921000000_add_token_hash_columns
 * and BEFORE applying prisma/migrations/20260921000100_finalize_token_hash_columns
 * (which drops "token" and makes the new columns NOT NULL).
 *
 * Uses raw SQL because by the time this script is written the Prisma schema
 * (and therefore the generated client's types) has already moved on to the
 * new columns — the plaintext "token" column below only still exists in the
 * database, not in the schema.
 *
 * Run with: npm run backfill-token-hashes
 */
import { PrismaClient } from "@prisma/client";
import { encrypt, hashToken } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function backfill(table: "ShareLink" | "Invitation") {
  const rows = await prisma.$queryRawUnsafe<{ id: string; token: string }[]>(
    `SELECT "id", "token" FROM "${table}" WHERE "tokenHash" IS NULL`
  );

  for (const row of rows) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${table}" SET "tokenHash" = $1, "tokenEncrypted" = $2 WHERE "id" = $3`,
      hashToken(row.token),
      encrypt(row.token),
      row.id
    );
  }

  console.log(`${table}: backfilled ${rows.length} row(s).`);
}

async function main() {
  await backfill("ShareLink");
  await backfill("Invitation");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
