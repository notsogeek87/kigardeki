import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe subset of the NextAuth config: no providers (Credentials'
 * `authorize` needs Prisma + bcrypt, which cannot run on the Edge runtime).
 * Next.js middleware always runs on the Edge runtime, so it must only ever
 * import this file, never src/lib/auth.ts — pulling in Prisma there makes
 * the middleware silently fail to redirect unauthenticated requests
 * instead of erroring loudly, which is exactly what happened in
 * production. The full config (src/lib/auth.ts) adds the Credentials
 * provider for everything else (route handlers, server actions, RSCs),
 * which run in the Node.js runtime.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.familyId = user.familyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as "PARENT" | "VIEWER";
        session.user.familyId = token.familyId as string;
      }
      return session;
    },
  },
};
