import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// La base, los avisos y las plataformas, simulados: aquí se prueba solo la decisión.
type Fila = { userId: string; tipo: string; clave: string; enviadoAt: Date };
const filas = new Map<string, Fila>();
const avisos: { userId: string; titulo: string }[] = [];
let legible: boolean | null | Error = true;

type Cond = { and: Cond[] } | { eq: [keyof Fila, unknown] } | { lt: [keyof Fila, Date] };
const cumple = (f: Fila, c: Cond): boolean =>
  "and" in c ? c.and.every((x) => cumple(f, x)) : "eq" in c ? f[c.eq[0]] === c.eq[1] : (f[c.lt[0]] as Date) < c.lt[1];
const clave = (v: { userId: string; tipo: string; clave: string }) => `${v.userId}|${v.tipo}|${v.clave}`;

vi.mock("@/db/schema", () => ({
  notificationLog: { userId: "userId", tipo: "tipo", clave: "clave", enviadoAt: "enviadoAt" },
}));
vi.mock("drizzle-orm", () => ({
  and: (...c: unknown[]) => ({ and: c }),
  eq: (col: unknown, v: unknown) => ({ eq: [col, v] }),
  lt: (col: unknown, v: unknown) => ({ lt: [col, v] }),
  sql: () => null,
}));
vi.mock("@/db", () => ({
  db: {
    insert: () => ({
      values: (v: Omit<Fila, "enviadoAt">) => {
        const existente = filas.get(clave(v));
        const nueva = () => {
          const f = { ...v, enviadoAt: new Date() };
          filas.set(clave(v), f);
          return f;
        };
        return {
          onConflictDoNothing: () => ({
            returning: async () => (existente ? [] : [{ clave: nueva().clave }]),
          }),
          onConflictDoUpdate: () => ({
            returning: async () => [{ desde: (existente ?? nueva()).enviadoAt }],
          }),
        };
      },
    }),
    delete: () => ({
      where: async (c: Cond) => {
        for (const [k, f] of filas) if (cumple(f, c)) filas.delete(k);
      },
    }),
  },
}));
vi.mock("@/lib/avisos", () => ({
  avisarUsuario: async (userId: string, a: { titulo: string }) => {
    avisos.push({ userId, titulo: a.titulo });
  },
}));
const comprobar = async () => {
  if (legible instanceof Error) throw legible;
  return legible;
};
vi.mock("@/lib/psn/client", () => ({ lecturaTrofeos: comprobar }));
vi.mock("@/lib/steam/client", () => ({ lecturaBiblioteca: comprobar }));
vi.mock("@/lib/xbl/client", () => ({ lecturaLogros: comprobar }));

const { vigilarLectura } = await import("@/lib/cuentaIlegible");
const steam = { platform: "steam", accountId: "7656" };
const xbox = { platform: "xbox", accountId: "2533" };
const HORA = 3600_000;
const avanzar = (ms: number) => vi.setSystemTime(Date.now() + ms);

describe("vigilarLectura", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
    filas.clear();
    avisos.length = 0;
    legible = true;
  });
  afterEach(() => vi.useRealTimers());

  it("avisa si sigue sin poder leerse en una sincronización horas después, y una sola vez", async () => {
    legible = false;
    await vigilarLectura("u1", steam, 0);
    expect(avisos).toHaveLength(0);
    avanzar(3 * HORA);
    await vigilarLectura("u1", steam, 0);
    expect(avisos).toHaveLength(0);
    avanzar(3 * HORA);
    await vigilarLectura("u1", steam, null);
    avanzar(3 * HORA);
    await vigilarLectura("u1", steam, 0);
    expect(avisos).toEqual([{ userId: "u1", titulo: "🔒 No podemos leer tu cuenta de Steam" }]);
  });

  it("no avisa si la biblioteca está vacía de verdad pero se puede leer", async () => {
    await vigilarLectura("u1", steam, 0);
    avanzar(7 * HORA);
    await vigilarLectura("u1", steam, 0);
    expect(avisos).toHaveLength(0);
  });

  it("si la plataforma no contesta, no se sabe: no avisa", async () => {
    legible = null;
    await vigilarLectura("u1", xbox, null);
    avanzar(7 * HORA);
    await vigilarLectura("u1", xbox, null);
    legible = new Error("fetch failed");
    avanzar(7 * HORA);
    await vigilarLectura("u1", xbox, null);
    expect(avisos).toHaveLength(0);
  });

  it("un fallo suelto entre sincronizaciones buenas no avisa (Xbox, 22 oct)", async () => {
    for (let i = 0; i < 6; i++) {
      legible = false;
      await vigilarLectura("u1", xbox, 0);
      avanzar(3 * HORA);
      await vigilarLectura("u1", xbox, 40);
      avanzar(3 * HORA);
    }
    expect(avisos).toHaveLength(0);
  });

  it("no repite el aviso en una semana aunque vuelva a leerse entre medias", async () => {
    legible = false;
    await vigilarLectura("u1", steam, 0);
    avanzar(7 * HORA);
    await vigilarLectura("u1", steam, 0);
    expect(avisos).toHaveLength(1);
    await vigilarLectura("u1", steam, 12);
    await vigilarLectura("u1", steam, 0);
    avanzar(7 * HORA);
    await vigilarLectura("u1", steam, 0);
    expect(avisos).toHaveLength(1);
  });

  it("pasada la semana, si se arregla y se estropea otra vez, vuelve a avisar", async () => {
    legible = false;
    await vigilarLectura("u1", steam, 0);
    avanzar(7 * HORA);
    await vigilarLectura("u1", steam, 0);
    avanzar(8 * 24 * HORA);
    await vigilarLectura("u1", steam, 12);
    await vigilarLectura("u1", steam, 0);
    avanzar(7 * HORA);
    await vigilarLectura("u1", steam, 0);
    expect(avisos).toHaveLength(2);
  });

  it("Epic y las demás no se vigilan", async () => {
    legible = false;
    await vigilarLectura("u1", { platform: "epic", accountId: "x" }, 0);
    avanzar(7 * HORA);
    await vigilarLectura("u1", { platform: "epic", accountId: "x" }, 0);
    expect(avisos).toHaveLength(0);
  });
});
