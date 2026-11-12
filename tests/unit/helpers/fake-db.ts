// In-memory fake database that understands the filters used by auth code:
// equality, { lt }, { gt }, { in }, orderBy (one key), take, and increments.
// Shared by tests that mock "@/lib/db" with: vi.mock("@/lib/db", async () => ({
//   db: (await import("./helpers/fake-db")).fake.db }))
export type Row = Record<string, unknown> & { id: string };
type Where = Record<string, unknown>;

function createFake() {
  let seq = 0;
  const tables: Record<string, Row[]> = { otpCode: [], session: [], user: [] };

  function matches(row: Row, where: Where = {}): boolean {
    return Object.entries(where).every(([key, cond]) => {
      const value = row[key];
      if (cond !== null && typeof cond === "object" && !(cond instanceof Date)) {
        const c = cond as { lt?: Date; gt?: Date; in?: unknown[] };
        if (c.lt !== undefined && !((value as Date).getTime() < c.lt.getTime())) return false;
        if (c.gt !== undefined && !((value as Date).getTime() > c.gt.getTime())) return false;
        if (c.in !== undefined && !c.in.includes(value)) return false;
        return true;
      }
      return value === cond;
    });
  }

  function pick(row: Row, select?: Record<string, boolean>) {
    if (!select) return { ...row };
    return Object.fromEntries(Object.keys(select).map((k) => [k, row[k]]));
  }

  function sorted(rows: Row[], orderBy?: Record<string, "asc" | "desc">) {
    if (!orderBy) return rows;
    const [key, dir] = Object.entries(orderBy)[0];
    return [...rows].sort((a, b) => {
      const d = (a[key] as Date).getTime() - (b[key] as Date).getTime();
      return dir === "asc" ? d : -d;
    });
  }

  function model(name: string) {
    const rows = () => tables[name];
    return {
      findMany: async (args: {
        where?: Where;
        select?: Record<string, boolean>;
        orderBy?: Record<string, "asc" | "desc">;
        take?: number;
      }) =>
        sorted(rows().filter((r) => matches(r, args.where)), args.orderBy)
          .slice(0, args.take ?? Infinity)
          .map((r) => pick(r, args.select)),
      findFirst: async (args: {
        where?: Where;
        select?: Record<string, boolean>;
        orderBy?: Record<string, "asc" | "desc">;
      }) => {
        const r = sorted(rows().filter((x) => matches(x, args.where)), args.orderBy)[0];
        return r ? pick(r, args.select) : null;
      },
      count: async (args: { where?: Where }) => rows().filter((r) => matches(r, args.where)).length,
      create: async (args: { data: Record<string, unknown>; select?: Record<string, boolean> }) => {
        const row: Row = { id: `${name}-${++seq}`, createdAt: new Date(), ...args.data };
        if (name === "otpCode") row.used ??= false;
        if (name === "otpCode") row.attempts ??= 0;
        rows().push(row);
        return pick(row, args.select);
      },
      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = rows().find((r) => r.id === args.where.id);
        if (!row) throw Object.assign(new Error("Record not found"), { code: "P2025" });
        for (const [k, v] of Object.entries(args.data)) {
          const inc = (v as { increment?: number } | null)?.increment;
          row[k] = typeof inc === "number" ? (row[k] as number) + inc : v;
        }
        return { ...row };
      },
      updateMany: async (args: { where: Where; data: Record<string, unknown> }) => {
        const hit = rows().filter((r) => matches(r, args.where));
        hit.forEach((r) => Object.assign(r, args.data));
        return { count: hit.length };
      },
      deleteMany: async (args: { where: Where }) => {
        const before = rows().length;
        tables[name] = rows().filter((r) => !matches(r, args.where));
        return { count: before - tables[name].length };
      },
      upsert: async (args: { where: Where; create: Record<string, unknown> }) => {
        const found = rows().find((r) => matches(r, args.where));
        if (found) return { id: found.id };
        const row: Row = { id: `${name}-${++seq}`, ...args.create };
        rows().push(row);
        return { id: row.id };
      },
    };
  }

  const db = {
    otpCode: model("otpCode"),
    session: model("session"),
    user: model("user"),
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  return {
    db,
    tables,
    reset() {
      seq = 0;
      for (const k of Object.keys(tables)) tables[k] = [];
    },
  };
}

export const fake = createFake();
