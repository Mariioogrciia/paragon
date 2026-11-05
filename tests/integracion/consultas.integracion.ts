import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { crearJuego, crearUsuario, darJuego, trofeos } from "./datos";
import { platinosMasRapidos } from "@/lib/platinoRapido";
import { clasificacionEvento } from "@/lib/eventosComunidad";
import { cambiarSeguir, estadoSeguir, idsQueSigo, SeguirError } from "@/lib/seguir";
import { getMobileUserId, huellaToken } from "@/lib/mobileAuth";
import { dentroDelLimite } from "@/lib/rateLimit";
import { apuntarMiembroServidor, miembrosParagonDelServidor, titulosParaAutocompletar } from "@/lib/discordServidor";
import { registrarPago, esApoyo } from "@/lib/apoyo";
import { getLigaMensual } from "@/lib/ligas";
import type { EventoMes } from "@/lib/eventos";

afterAll(async () => {
  // Cierra la conexión compartida para que vitest termine.
  const g = globalThis as unknown as { conn?: { end: () => Promise<void> } };
  await g.conn?.end();
});

describe("platinos más rápidos", () => {
  it("ordena por duración, deja fuera las marcas de menos de 10 min y cuenta Steam al 100 %", async () => {
    const juego = await crearJuego("psn");
    const lento = await crearUsuario();
    const rapido = await crearUsuario();
    const tramposo = await crearUsuario();
    const sinPlatino = await crearUsuario();
    for (const u of [lento, rapido, tramposo]) await darJuego(u.id, juego, { earned: { platinum: 1, gold: 0, silver: 0, bronze: 0 } });
    await darJuego(sinPlatino.id, juego, { earned: { platinum: 0, gold: 0, silver: 0, bronze: 1 } });
    await trofeos(juego, lento.id, [{ id: "1", earnedAt: "2026-01-01T00:00:00Z" }, { id: "P", grade: "platinum", earnedAt: "2026-01-11T00:00:00Z" }]);
    await trofeos(juego, rapido.id, [{ id: "1", earnedAt: "2026-02-01T00:00:00Z" }, { id: "P", grade: "platinum", earnedAt: "2026-02-02T00:00:00Z" }]);
    await trofeos(juego, tramposo.id, [{ id: "1", earnedAt: "2026-03-01T00:00:00Z" }, { id: "P", grade: "platinum", earnedAt: "2026-03-01T00:01:00Z" }]);
    await trofeos(juego, sinPlatino.id, [{ id: "1", earnedAt: "2026-03-01T00:00:00Z" }]);

    const lista = await platinosMasRapidos(juego);
    expect(lista.map((p) => p.userId)).toEqual([rapido.id, lento.id]);
    expect(lista[0].duracionMs).toBe(86_400_000);

    const steam = await crearJuego("steam");
    const completo = await crearUsuario();
    await darJuego(completo.id, steam, { progressPercent: 100 });
    await trofeos(steam, completo.id, [{ id: "a", earnedAt: "2026-04-01T00:00:00Z" }, { id: "b", earnedAt: "2026-04-01T05:00:00Z" }]);
    expect((await platinosMasRapidos(steam)).map((p) => p.duracionMs)).toEqual([5 * 3_600_000]);
  });

  it("une las versiones del mismo juego por igdbId y se queda con la mejor marca", async () => {
    const igdb = Math.floor(Math.random() * 1e9);
    const ps = await crearJuego("psn", { igdbId: igdb });
    const st = await crearJuego("steam", { igdbId: igdb });
    const u = await crearUsuario();
    await darJuego(u.id, ps, { earned: { platinum: 1, gold: 0, silver: 0, bronze: 0 } });
    await darJuego(u.id, st, { progressPercent: 100 });
    await trofeos(ps, u.id, [{ id: "1", earnedAt: "2026-01-01T00:00:00Z" }, { id: "P", grade: "platinum", earnedAt: "2026-01-05T00:00:00Z" }]);
    await trofeos(st, u.id, [{ id: "a", earnedAt: "2026-01-01T00:00:00Z" }, { id: "b", earnedAt: "2026-01-02T00:00:00Z" }]);
    const lista = await platinosMasRapidos(String(igdb));
    expect(lista).toHaveLength(1);
    expect(lista[0].platform).toBe("steam");
  });
});

describe("evento del mes", () => {
  it("solo puntúan los trofeos del mes en juegos del género, y Epic no", async () => {
    const evento: EventoMes = { clave: "2030-05", categoria: "rpg", generos: ["Role-playing (RPG)"], inicio: new Date("2030-05-01T00:00:00Z"), fin: new Date("2030-06-01T00:00:00Z") };
    const rpg = await crearJuego("psn", { genres: ["Role-playing (RPG)", "Adventure"] });
    const accion = await crearJuego("psn", { genres: ["Shooter"] });
    const epic = await crearJuego("epic", { genres: ["Role-playing (RPG)"] });
    const u = await crearUsuario();
    for (const j of [rpg, accion, epic]) await darJuego(u.id, j);
    await trofeos(rpg, u.id, [{ id: "1", grade: "gold", earnedAt: "2030-05-03T00:00:00Z" }, { id: "2", earnedAt: "2030-04-30T23:00:00Z" }, { id: "P", grade: "platinum", earnedAt: "2030-05-20T00:00:00Z" }]);
    await trofeos(accion, u.id, [{ id: "1", grade: "gold", earnedAt: "2030-05-03T00:00:00Z" }]);
    await trofeos(epic, u.id, [{ id: "1", earnedAt: "2030-05-03T00:00:00Z" }]);
    const r = (await clasificacionEvento(evento)).find((p) => p.userId === u.id);
    expect(r).toMatchObject({ puntos: 150, trofeos: 2, platinos: 1 });
  });
});

describe("seguir", () => {
  it("sigue, cuenta, deja de seguir y no deja seguir perfiles privados ni a uno mismo", async () => {
    const yo = await crearUsuario();
    const otro = await crearUsuario();
    const privado = await crearUsuario({ isPublicProfile: false });
    await cambiarSeguir(yo.id, otro.id, true);
    await cambiarSeguir(yo.id, otro.id, true); // dos veces no duplica
    expect(await estadoSeguir(yo.id, otro.id)).toEqual({ sigo: true, seguidores: 1, siguiendo: 0 });
    expect(await idsQueSigo(yo.id)).toEqual([otro.id]);
    await expect(cambiarSeguir(yo.id, privado.id, true)).rejects.toBeInstanceOf(SeguirError);
    await expect(cambiarSeguir(yo.id, yo.id, true)).rejects.toBeInstanceOf(SeguirError);
    await cambiarSeguir(yo.id, otro.id, false);
    expect((await estadoSeguir(yo.id, otro.id)).sigo).toBe(false);
  });
});

describe("tokens de la app", () => {
  it("encuentra los nuevos por su huella y los antiguos guardados tal cual", async () => {
    const u = await crearUsuario();
    const manana = new Date(Date.now() + 86_400_000);
    const nuevo = `nuevo-${u.id}`;
    const viejo = `viejo-${u.id}`;
    await db.insert(sessions).values([
      { sessionToken: huellaToken(nuevo), userId: u.id, expires: manana },
      { sessionToken: viejo, userId: u.id, expires: manana },
    ]);
    const pedir = (t: string) => new Request("http://x.test", { headers: { authorization: `Bearer ${t}` } });
    expect(await getMobileUserId(pedir(nuevo))).toBe(u.id);
    expect(await getMobileUserId(pedir(viejo))).toBe(u.id);
    // La huella copiada de la base no sirve como token.
    expect(await getMobileUserId(pedir(huellaToken(nuevo)))).toBeNull();
  });
});

describe("límite de peticiones", () => {
  it("deja pasar hasta el máximo de la ventana", async () => {
    const clave = `prueba:${Math.random()}`;
    const r = [];
    for (let i = 0; i < 4; i++) r.push(await dentroDelLimite(clave, 3, 60));
    expect(r).toEqual([true, true, true, false]);
  });
});

describe("Discord: servidor y autocompletado", () => {
  it("apunta a quien usa el bot y busca títulos sin los deseados", async () => {
    const u = await crearUsuario();
    const { accounts } = await import("@/db/schema");
    const discordId = String(Math.floor(Math.random() * 1e15));
    await db.insert(accounts).values({ userId: u.id, type: "oauth", provider: "discord", providerAccountId: discordId });
    const servidor = `g${Math.random()}`;
    await apuntarMiembroServidor(servidor, discordId);
    await apuntarMiembroServidor(servidor, discordId);
    expect((await miembrosParagonDelServidor(servidor)).map((m) => m.userId)).toEqual([u.id]);

    const elden = await crearJuego("psn", { title: "Elden Ring" });
    const deseado = await crearJuego("psn", { title: "Elden Ring Nightreign" });
    await darJuego(u.id, elden);
    await darJuego(u.id, deseado, { isWishlist: true });
    expect(await titulosParaAutocompletar(u.id, "elden")).toEqual(["Elden Ring"]);
  });
});

describe("Paragon+", () => {
  it("asocia el pago por correo, no lo cuenta dos veces y da la insignia", async () => {
    const u = await crearUsuario();
    const pago = { id: `tx-${Math.random()}`, email: `${u.handle}@prueba.test`, nombre: "Ana", mensaje: null, tipo: "Donation", importe: "3.00", moneda: "EUR", suscripcion: false, publico: true, tokenVerificacion: "t" };
    expect(await registrarPago(pago)).toEqual({ nuevo: true, userId: u.id });
    expect((await registrarPago(pago)).nuevo).toBe(false);
    expect(await esApoyo(u.id)).toBe(true);
  });
});

describe("liga mensual", () => {
  it("platino 100, oro 50, plata 25 y el resto 10, solo del mes", async () => {
    const juego = await crearJuego("psn");
    const u = await crearUsuario();
    await darJuego(u.id, juego);
    await trofeos(juego, u.id, [
      { id: "P", grade: "platinum", earnedAt: "2031-03-10T12:00:00Z" },
      { id: "G", grade: "gold", earnedAt: "2031-03-11T12:00:00Z" },
      { id: "S", grade: "silver", earnedAt: "2031-03-12T12:00:00Z" },
      { id: "B", grade: "bronze", earnedAt: "2031-03-13T12:00:00Z" },
      { id: "X", grade: "gold", earnedAt: "2031-02-10T12:00:00Z" },
    ]);
    const liga = await getLigaMensual(new Date("2031-03-15T12:00:00Z"));
    expect(liga.find((l) => l.userId === u.id)?.points).toBe(185);
  });
});

describe("calendario personal", () => {
  it("lleva los objetivos con fecha y el cierre de la liga mensual", async () => {
    const { gameGoals } = await import("@/db/schema");
    const { calendarioDe } = await import("@/lib/calendarioPersonal");
    const u = await crearUsuario();
    const juego = await crearJuego("psn", { title: "Hollow Knight" });
    await darJuego(u.id, juego);
    const dentroDeUnMes = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    await db.insert(gameGoals).values({ userId: u.id, gameId: juego, fechaObjetivo: dentroDeUnMes });
    const ics = await calendarioDe(u.id);
    expect(ics).toContain("SUMMARY:Objetivo: platinar Hollow Knight");
    expect(ics).toContain(`DTSTART;VALUE=DATE:${dentroDeUnMes.replace(/-/g, "")}`);
    expect(ics).toContain("SUMMARY:Cierra la liga mensual de Paragon");
  });
});

describe("Telegram", () => {
  it("conecta con el código del enlace una sola vez y desconecta", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "prueba";
    process.env.TELEGRAM_BOT_USERNAME = "ParagonPruebaBot";
    const { estadoTelegram, vincularChat, usuarioDeChat, desvincularChat } = await import("@/lib/telegram");
    const u = await crearUsuario();
    const { enlace } = await estadoTelegram(u.id);
    const codigo = new URL(enlace!).searchParams.get("start")!;
    expect((await estadoTelegram(u.id)).enlace).toBe(enlace); // el mismo código mientras no se conecta
    const chat = String(Math.floor(Math.random() * 1e12));
    expect(await vincularChat(codigo, chat)).toBeTruthy();
    expect(await vincularChat(codigo, chat)).toBeNull(); // el código ya no vale
    expect(await usuarioDeChat(chat)).toBe(u.id);
    expect((await estadoTelegram(u.id)).vinculado).toBe(true);
    await desvincularChat(chat);
    expect(await usuarioDeChat(chat)).toBeNull();
    delete process.env.TELEGRAM_BOT_TOKEN;
  });
});

describe("correo semanal", () => {
  it("alta y baja", async () => {
    const { cambiarSuscripcion, estaSuscrito } = await import("@/lib/correo");
    const u = await crearUsuario();
    expect(await estaSuscrito(u.id)).toBe(false);
    await cambiarSuscripcion(u.id, true);
    await cambiarSuscripcion(u.id, true);
    expect(await estaSuscrito(u.id)).toBe(true);
    await cambiarSuscripcion(u.id, false);
    expect(await estaSuscrito(u.id)).toBe(false);
  });
});
