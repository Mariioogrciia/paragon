"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  addFriendAction,
  chooseHandleAction,
  createCollectionAction,
  linkPsnAction,
  linkSteamAction,
  linkGoogleAction,
  linkXboxAction,
  linkUbisoftAction,
  linkEpicOAuthAction,
  updateProfileAction,
  type ActionState,
} from "@/app/actions";

const EMPTY: ActionState = {};

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-background transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgb(var(--accent-rgb) / 0.6)] active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
      style={{ background: "var(--accent-grad)" }}
    >
      {pending ? "…" : children}
    </button>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="mt-2 text-sm text-danger">{state.error}</p>;
  if (state.success) return <p className="mt-2 text-sm text-good">{state.success}</p>;
  return null;
}

const FIELD = { border: "1px solid var(--border)", background: "var(--background)" };

/** Campo de handle con el prefijo "@" a la manera de la maqueta. */
function AtField({
  name,
  defaultValue,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
}) {
  return (
    <div className="flex flex-1 items-stretch overflow-hidden rounded-xl" style={FIELD}>
      <span
        className="flex items-center px-3.5 text-[15px] font-bold text-muted"
        style={{ background: "#151d29" }}
      >
        @
      </span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-[15px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted"
      />
    </div>
  );
}

export function HandleForm({ current, hasImage }: { current?: string | null, hasImage?: boolean }) {
  const [state, action] = useActionState(chooseHandleAction, EMPTY);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex gap-2.5">
        <AtField name="handle" defaultValue={current ?? undefined} placeholder="mario_gg" />
        <Submit>{current ? "Cambiar" : "Continuar"}</Submit>
      </div>
      
      {!current && hasImage && (
        <label className="flex items-center gap-2 cursor-pointer mt-1">
          <input type="checkbox" name="keepAvatar" defaultChecked className="rounded border-white/10 bg-surface-2 text-accent focus:ring-accent" />
          <span className="text-sm text-muted">Usar la foto de mi cuenta como avatar</span>
        </label>
      )}
      
      <Feedback state={state} />
    </form>
  );
}

export function LinkPsnForm({ current }: { current?: string | null }) {
  const [state, action] = useActionState(linkPsnAction, EMPTY);

  return (
    <form action={action}>
      <div className="flex gap-2.5">
        <input
          name="onlineId"
          defaultValue={current ?? ""}
          placeholder="Tu ID de PlayStation"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl px-3.5 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          style={FIELD}
        />
        <Submit>{current ? "Actualizar" : "Vincular"}</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function LinkSteamForm({ current }: { current?: string | null }) {
  const [state, action] = useActionState(linkSteamAction, EMPTY);

  return (
    <form action={action}>
      <div className="flex gap-2.5">
        <input
          name="steamId"
          defaultValue={current ?? ""}
          placeholder="tu_usuario, 7656119… o la URL del perfil"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl px-3.5 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          style={FIELD}
        />
        <Submit>{current ? "Actualizar" : "Vincular"}</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function LinkGoogleForm({ current }: { current?: string | null }) {
  const [state, action] = useActionState(linkGoogleAction, EMPTY);

  return (
    <form action={action}>
      <div className="flex gap-2.5">
        <input
          name="email"
          type="email"
          defaultValue={current ?? ""}
          placeholder="Tu correo electrónico de Google Play"
          autoComplete="email"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl px-3.5 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          style={FIELD}
        />
        <Submit>{current ? "Actualizar" : "Vincular"}</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function LinkXboxForm({ current }: { current?: string | null }) {
  const [state, action] = useActionState(linkXboxAction, EMPTY);

  return (
    <form action={action}>
      <div className="flex gap-2.5">
        <input
          name="gamertag"
          type="text"
          defaultValue={current ?? ""}
          placeholder="Tu Gamertag de Xbox"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl px-3.5 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          style={FIELD}
        />
        <Submit>{current ? "Actualizar" : "Vincular"}</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function LinkEpicForm({ current }: { current?: string | null }) {
  return (
    <form action={linkEpicOAuthAction}>
      <div className="flex gap-2.5">
        <Submit>{current ? "Reconectar con Epic Games" : "Vincular con Epic Games"}</Submit>
      </div>
    </form>
  );
}

export function LinkUbisoftForm({ current }: { current?: string | null }) {
  const [state, action] = useActionState(linkUbisoftAction, EMPTY);

  return (
    <form action={action}>
      <div className="flex gap-2.5">
        <input
          name="username"
          type="text"
          defaultValue={current ?? ""}
          placeholder="Tu usuario de Ubisoft Connect"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl px-3.5 py-3.5 text-[15px] text-foreground outline-none placeholder:text-muted"
          style={FIELD}
        />
        <Submit>{current ? "Actualizar" : "Vincular"}</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/**
 * Crear carpeta. Si se usa desde la ficha de un juego, ese juego entra en la
 * carpeta recién creada: es lo que se espera al escribir el nombre allí.
 */
export function NewCollectionForm({ gameId }: { gameId?: string }) {
  const [state, action] = useActionState(createCollectionAction, EMPTY);

  return (
    <form action={action}>
      {gameId && <input type="hidden" name="gameId" value={gameId} />}
      <div className="flex gap-2.5">
        <input
          name="name"
          placeholder="Nueva carpeta (p. ej. «Pendientes 2026»)"
          autoComplete="off"
          maxLength={40}
          className="min-w-0 flex-1 rounded-xl px-3.5 py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
          style={FIELD}
        />
        <Submit>Crear</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function AddFriendForm() {
  const [state, action] = useActionState(addFriendAction, EMPTY);

  return (
    <form action={action}>
      <div className="flex gap-2.5">
        <AtField name="handle" placeholder="usuario_de_paragon" />
        <Submit>Enviar solicitud</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function ProfileSettingsForm({
  currentName,
  currentImage,
}: {
  currentName?: string;
  currentImage?: string | null;
}) {
  const [state, action] = useActionState(updateProfileAction, EMPTY);

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
          Nombre a mostrar
        </label>
        <div className="flex flex-1 items-stretch overflow-hidden rounded-xl" style={FIELD}>
          <input
            name="name"
            defaultValue={currentName}
            placeholder="Ej. Alex"
            className="w-full bg-transparent px-4 py-3.5 text-[15px] text-foreground placeholder-muted/50 outline-none"
            required
          />
        </div>
      </div>
      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
          URL del Avatar
        </label>
        <div className="flex flex-1 items-stretch overflow-hidden rounded-xl" style={FIELD}>
          <input
            name="image"
            defaultValue={currentImage || ""}
            placeholder="https://..."
            className="w-full bg-transparent px-4 py-3.5 text-[15px] text-foreground placeholder-muted/50 outline-none"
          />
        </div>
      </div>
      <div className="mt-2 flex">
        <Submit>Guardar perfil</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}
