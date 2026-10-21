import { beforeEach, describe, expect, it, vi } from "vitest";

// La base, los avisos y las plataformas, simulados: aquí se prueba solo la decisión.
const registro = new Set<string>();
const avisos: { userId: string; titulo: string }[] = [];
let legible: boolean | Error = true;

vi.mock("@/db/schema", () => ({ notificationLog: { userId: "userId", tipo: "tipo", clave: "clave" } }));
vi.mock("drizzle-orm", () => ({
  and: (...c: unknown[]) => c,
  eq: (_col: unknown, v: unknown) => v,
}));
vi.mock("@/db", () => ({
  db: {
    insert: () => ({
      values: (v: { userId: string; clave: string }) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            const k = `${v.userId}:${v.clave}`;
            if (registro.has(k)) return [];
            registro.add(k);
            return [{ clave: v.clave }];
          },
        }),
      }),
    }),
    delete: () => ({
      where: async (c: string[]) => {
        registro.delete(`${c[0]}:${c[2]}`);
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
vi.mock("@/lib/psn/client", () => ({ canReadTrophies: comprobar }));
vi.mock("@/lib/steam/client", () => ({ canReadLibrary: comprobar }));
vi.mock("@/lib/xbl/client", () => ({ canReadAchievements: comprobar }));

const { vigilarLectura } = await import("@/lib/cuentaIlegible");
const steam = { platform: "steam", accountId: "7656" };

describe("vigilarLectura", () => {
  beforeEach(() => {
    registro.clear();
    avisos.length = 0;
    legible = true;
  });

  it("avisa una sola vez si la cuenta no trae juegos porque ya no se puede leer", async () => {
    legible = false;
    await vigilarLectura("u1", steam, 0);
    await vigilarLectura("u1", steam, 0);
    await vigilarLectura("u1", steam, null);
    expect(avisos).toEqual([{ userId: "u1", titulo: "🔒 No podemos leer tu cuenta de Steam" }]);
  });

  it("no avisa si la biblioteca está vacía de verdad pero se puede leer", async () => {
    await vigilarLectura("u1", steam, 0);
    expect(avisos).toHaveLength(0);
  });

  it("si la comprobación misma falla (red), no se sabe: no avisa", async () => {
    legible = new Error("fetch failed");
    await vigilarLectura("u1", steam, null);
    expect(avisos).toHaveLength(0);
  });

  it("cuando vuelve a leerse lo olvida y puede avisar otra vez", async () => {
    legible = false;
    await vigilarLectura("u1", steam, 0);
    await vigilarLectura("u1", steam, 12);
    await vigilarLectura("u1", steam, 0);
    expect(avisos).toHaveLength(2);
  });

  it("Epic y las demás no se vigilan", async () => {
    legible = false;
    await vigilarLectura("u1", { platform: "epic", accountId: "x" }, 0);
    expect(avisos).toHaveLength(0);
  });
});
