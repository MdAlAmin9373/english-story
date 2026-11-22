import "server-only";
import { PrismaClient } from "@prisma/client";

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Neon's free tier auto-pauses the compute endpoint when idle, so the first
// request has to wake it up. Give Prisma longer than its default 5s connect
// timeout (and 10s pool timeout) before it reports the database as unreachable.
function withWakeTimeout(url: string | undefined): string | undefined {
  if (!url) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connect_timeout=15&pool_timeout=15`;
}

const databaseUrl = withWakeTimeout(process.env.DATABASE_URL);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient(databaseUrl ? { datasourceUrl: databaseUrl } : undefined);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
