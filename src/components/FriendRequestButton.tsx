"use client";

import { useState } from "react";
import { sendFriendRequestFromProfileAction, acceptFriendRequestFromProfileAction } from "@/app/actions";
import type { FriendshipStatus } from "@/lib/profiles";

/**
 * Botón de amistad en el perfil de otra persona — antes solo se podía
 * añadir a alguien escribiendo su handle a mano en /amigos, aunque
 * estuvieras mirando su perfil. No se pinta si ya sois amigos (`amigos`
 * queda fuera de los estados que renderizan algo).
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

  async function enviar() {
    setLoading(true);
    setError("");
    try {
      const res = await sendFriendRequestFromProfileAction(handle, profilePath);
      if (!res.ok) throw new Error(res.error ?? "No se pudo enviar la solicitud");
      setStatus("solicitudEnviada");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la solicitud");
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
      setError(e instanceof Error ? e.message : "No se pudo aceptar la solicitud");
    } finally {
      setLoading(false);
    }
  }

  if (status === "amigos") return null;

  if (status === "solicitudRecibida") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={aceptar}
          disabled={loading}
          className="rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-bold text-background disabled:opacity-50"
          style={{ background: "var(--accent-grad)" }}
        >
          {loading ? "..." : "Aceptar solicitud"}
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
        {status === "solicitudEnviada" ? "Solicitud enviada" : loading ? "..." : "Añadir amigo"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
