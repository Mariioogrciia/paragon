"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { inviteToClanAction } from "../actions";

interface Friend {
  userId: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

/** Solo la ve el líder del clan — invitar queda restringido a un único rol por ahora. */
export function InviteFriendsButton({ clanId, friends }: { clanId: string; friends: Friend[] }) {
  const [open, setOpen] = useState(false);
  const [invitados, setInvitados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function invitar(friendId: string) {
    setEnviando(friendId);
    setError("");
    try {
      await inviteToClanAction(clanId, friendId);
      setInvitados((prev) => new Set(prev).add(friendId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo invitar");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-[10px] border border-border px-4 py-2 font-bold text-muted transition-colors hover:border-[var(--accent)] hover:text-foreground"
      >
        Invitar amigos
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Invitar amigos</h2>
              <button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-white/10 hover:text-foreground">
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-3 rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-500">
                {error}
              </div>
            )}

            {friends.length === 0 ? (
              <p className="text-sm text-muted">
                No tienes amigos disponibles para invitar ahora mismo — o ya están todos en un clan, o ya se lo has pedido.
              </p>
            ) : (
              <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
                {friends.map((f) => {
                  const yaInvitado = invitados.has(f.userId);
                  return (
                    <div key={f.userId} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <Avatar src={f.avatarUrl} name={f.displayName ?? f.handle ?? "?"} size={36} />
                      <p className="min-w-0 flex-1 truncate font-semibold">{f.displayName ?? f.handle}</p>
                      <button
                        onClick={() => invitar(f.userId)}
                        disabled={enviando === f.userId || yaInvitado}
                        className="shrink-0 rounded-[10px] bg-accent px-3 py-1.5 text-xs font-bold text-background disabled:opacity-50"
                      >
                        {yaInvitado ? "Invitado" : enviando === f.userId ? "..." : "Invitar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
