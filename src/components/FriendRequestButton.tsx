"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { sendFriendRequestFromProfileAction, acceptFriendRequestFromProfileAction } from "@/app/actions";
import type { FriendshipStatus } from "@/lib/profiles";

/**
 * Botón de amistad en el perfil de otra persona — antes solo se podía
 * añadir a alguien escribiendo su handle a mano en /amigos, aunque
 * estuvieras mirando su perfil. Si ya sois amigos, una etiqueta "Amigos"
 * (antes no se pintaba nada y no se sabía si lo erais). Textos en el idioma
 * de la web (PerfilPage.amistad).
 */
export function FriendRequestButton({
  handle,
  otherUserId,
  initialStatus,
  profilePath,
}: {
  handle: string;
  otherUserId: string;
  initialStatus: FriendshipStatus;
  profilePath: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("PerfilPage.amistad");

  async function enviar() {
    setLoading(true);
    setError("");
    try {
      const res = await sendFriendRequestFromProfileAction(handle, profilePath);
      if (!res.ok) throw new Error(res.error ?? t("error"));
      setStatus("solicitudEnviada");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function aceptar() {
    setLoading(true);
    setError("");
    try {
      await acceptFriendRequestFromProfileAction(otherUserId, profilePath);
      setStatus("amigos");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setLoading(false);
    }
  }

  if (status === "amigos") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-bold"
        style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
        {t("amigos")}
      </span>
    );
  }

  if (status === "solicitudRecibida") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={aceptar}
          disabled={loading}
          className="rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-bold text-background disabled:opacity-50"
          style={{ background: "var(--accent-grad)" }}
        >
          {loading ? "..." : t("aceptar")}
        </button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={enviar}
        disabled={loading || status === "solicitudEnviada"}
        className="rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-bold transition-colors hover:text-foreground disabled:opacity-50"
        style={{ border: "1px solid var(--border)", color: status === "solicitudEnviada" ? "var(--muted)" : "var(--foreground)" }}
      >
        {status === "solicitudEnviada" ? t("enviada") : loading ? "..." : t("anadir")}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
