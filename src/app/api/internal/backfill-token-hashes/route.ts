import { NextRequest, NextResponse } from "next/server";
import { createCipheriv, createHmac, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * TEMPORARY, one-off migration endpoint — removed immediately after a
 * single use (see the commit that deletes this file). Not part of the app.
 *
 * Populates ShareLink/Invitation.tokenHash + tokenEncrypted (columns added
 * by a prior additive-only SQL migration) from the existing plaintext
 * "token" column, using the real ENCRYPTION_KEY that only exists inside
 * this running deployment's environment — it never has to be read, copied,
 * or displayed anywhere to do this.
 *
 * Authorization: compares the request header against a one-off value
 * stored in a throwaway "_TmpBackfillAuth" table (created and dropped
 * directly in Postgres for this purpose only) — deliberately not a secret
 * embedded in source code or committed anywhere.
 */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes.");
  return key;
}

function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

function hashToken(token: string): string {
  return createHmac("sha256", getKey()).update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-backfill-secret");
  if (!provided) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const authRows = await prisma.$queryRawUnsafe<{ secret: string }[]>(
    `SELECT secret FROM "_TmpBackfillAuth" LIMIT 1`
  );
  const expected = authRows[0]?.secret;
  if (!expected || expected !== provided) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const results: Record<string, number> = {};

  for (const table of ["ShareLink", "Invitation"] as const) {
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
    results[table] = rows.length;
  }

  return NextResponse.json({ ok: true, backfilled: results });
}
