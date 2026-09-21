"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Onboarding");
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
        setMensaje(t("pushToggle.notConfigured"));
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
        setMensaje(resultado.error ?? t("pushToggle.activateError"));
        return;
      }

      setEstado("activo");
      setMensaje(t("pushToggle.activated"));
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : t("pushToggle.activateError"));
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
      setMensaje(t("pushToggle.deactivated"));
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : t("pushToggle.deactivateError"));
    } finally {
      setPendiente(false);
    }
  }

  async function probar() {
    setPendiente(true);
    setMensaje(null);
    const resultado = await testPushAction();
    setMensaje(resultado.ok ? t("pushToggle.testSent") : (resultado.error ?? t("pushToggle.testError")));
    setPendiente(false);
  }

  if (estado === "sin-soporte") {
    return <p className="text-sm text-muted">{t("pushToggle.notSupported")}</p>;
  }

  if (estado === "denegado") {
    return (
      <p className="text-sm text-muted">
        {t("pushToggle.denied")}
      </p>
    );
  }

  if (estado === "cargando") {
    return <p className="text-sm text-muted">{t("pushToggle.checking")}</p>;
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
              {pendiente ? "…" : t("pushToggle.deactivate")}
            </button>
            <button
              type="button"
              onClick={probar}
              disabled={pendiente}
              className="text-xs font-semibold text-accent hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              {t("pushToggle.test")}
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
            {pendiente ? "…" : t("pushToggle.activate")}
          </button>
        )}
      </div>
      {mensaje && <p className="mt-2 text-xs text-muted">{mensaje}</p>}
      <p className="mt-3 text-xs leading-relaxed text-muted">
        {t("pushToggle.hint")}
      </p>
    </div>
  );
}
