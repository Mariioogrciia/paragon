"use client";

import { useEffect, useState } from "react";
import { subscribePushAction, unsubscribePushAction, testPushAction } from "@/app/actions";

const FIELD = { border: "1px solid var(--border)", background: "var(--background)" };

/** El VAPID público llega en base64url (con "-"/"_" en vez de "+"/"/") —
 * `pushManager.subscribe` quiere un Uint8Array, no el string tal cual. */
function base64UrlAUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Estado = "sin-soporte" | "cargando" | "denegado" | "activo" | "inactivo";

/**
 * Interruptor de notificaciones push del navegador, en /ajustes.
 *
 * Nada de esto pasa por el servidor de Paragon en el sentido de "vigilar" —
 * el navegador guarda la suscripción y solo se le pide activarla una vez;
 * a partir de ahí, `lib/webPush.ts` manda directo a esa suscripción cuando
 * hay un trofeo nuevo (ver lib/sync.ts), llegue o no la pestaña abierta.
 */
export function PushToggle() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);

  useEffect(() => {
    async function comprobar() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setEstado("sin-soporte");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("denegado");
        return;
      }
      try {
        const registro = await navigator.serviceWorker.ready;
        const sub = await registro.pushManager.getSubscription();
        setEstado(sub ? "activo" : "inactivo");
      } catch {
        setEstado("inactivo");
      }
    }
    comprobar();
  }, []);

  async function activar() {
    setPendiente(true);
    setMensaje(null);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setMensaje("El servidor no tiene configuradas las notificaciones push todavía.");
        return;
      }

      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "denegado" : "inactivo");
        return;
      }

      const registro = await navigator.serviceWorker.ready;
      const sub = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlAUint8Array(vapidKey) as BufferSource,
      });

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const resultado = await subscribePushAction({ endpoint: json.endpoint, keys: json.keys });
      if (!resultado.ok) {
        await sub.unsubscribe();
        setMensaje(resultado.error ?? "No se pudo activar.");
        return;
      }

      setEstado("activo");
      setMensaje("Notificaciones activadas.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo activar.");
    } finally {
      setPendiente(false);
    }
  }

  async function desactivar() {
    setPendiente(true);
    setMensaje(null);
    try {
      const registro = await navigator.serviceWorker.ready;
      const sub = await registro.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("inactivo");
      setMensaje("Notificaciones desactivadas.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo desactivar.");
    } finally {
      setPendiente(false);
    }
  }

  async function probar() {
    setPendiente(true);
    setMensaje(null);
    const resultado = await testPushAction();
    setMensaje(resultado.ok ? "Aviso enviado — debería llegarte en unos segundos." : (resultado.error ?? "No se pudo enviar."));
    setPendiente(false);
  }

  if (estado === "sin-soporte") {
    return <p className="text-sm text-muted">Este navegador no admite notificaciones push.</p>;
  }

  if (estado === "denegado") {
    return (
      <p className="text-sm text-muted">
        Bloqueaste las notificaciones para este sitio. Actívalas desde los ajustes del navegador (el icono junto a
        la barra de direcciones) para poder encenderlas aquí.
      </p>
    );
  }

  if (estado === "cargando") {
    return <p className="text-sm text-muted">Comprobando…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        {estado === "activo" ? (
          <>
            <button
              type="button"
              onClick={desactivar}
              disabled={pendiente}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-50"
              style={FIELD}
            >
              {pendiente ? "…" : "Desactivar"}
            </button>
            <button
              type="button"
              onClick={probar}
              disabled={pendiente}
              className="text-xs font-semibold text-accent hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              Probar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={activar}
            disabled={pendiente}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-background transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
            style={{ background: "var(--accent-grad)" }}
          >
            {pendiente ? "…" : "Activar notificaciones"}
          </button>
        )}
      </div>
      {mensaje && <p className="mt-2 text-xs text-muted">{mensaje}</p>}
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Un aviso cuando consigas un trofeo nuevo, aunque no tengas Paragon abierto — llega directo del navegador, sin
        pasar por ningún tercero.
      </p>
    </div>
  );
}
