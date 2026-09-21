"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  addFriendAction,
  addLeagueMemberAction,
  chooseHandleAction,
  createCollectionAction,
  createLeagueAction,
  linkPsnAction,
  linkSteamAction,
  linkXboxAction,
  updateProfileAction,
  setDiscordDmAction,
  setLeagueChallengeAction,
  probarDiscordDmAction,
  syncNowAction,
  syncPlatformAction,
  setHiddenNavItemsAction,
  type ActionState,
} from "@/app/actions";
import type { NavKey } from "@/lib/navPreferences";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { PrivacyGuide } from "@/components/PrivacyGuide";

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
    <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl" style={FIELD}>
      <span
        className="flex items-center px-3.5 text-[0.9375rem] font-bold text-muted"
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
        className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-[0.9375rem] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted"
      />
    </div>
  );
}

export function HandleForm({ current, hasImage }: { current?: string | null, hasImage?: boolean }) {
  const t = useTranslations("Onboarding");
  const [state, action] = useActionState(chooseHandleAction, EMPTY);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <AtField name="handle" defaultValue={current ?? undefined} placeholder={t("forms.handle.placeholder")} />
        <Submit>{current ? t("forms.handle.change") : t("forms.handle.continue")}</Submit>
      </div>

      {!current && hasImage && (
        <label className="flex items-center gap-2 cursor-pointer mt-1">
          <input type="checkbox" name="keepAvatar" defaultChecked className="rounded border-white/10 bg-surface-2 text-accent focus:ring-accent" />
          <span className="text-sm text-muted">{t("forms.handle.keepAvatar")}</span>
        </label>
      )}

      <Feedback state={state} />
    </form>
  );
}

export function LinkPsnForm({ current }: { current?: string | null }) {
  const t = useTranslations("Onboarding");
  const [state, action] = useActionState(linkPsnAction, EMPTY);

  return (
    <form action={action}>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          name="onlineId"
          defaultValue={current ?? ""}
          placeholder={t("forms.psn.placeholder")}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl px-3.5 py-3.5 text-[0.9375rem] text-foreground outline-none placeholder:text-muted"
          style={FIELD}
        />
        <Submit>{current ? t("forms.psn.update") : t("forms.psn.link")}</Submit>
      </div>
      <Feedback state={state} />
      <PrivacyGuide platform="psn" />
    </form>
  );
}

export function LinkSteamForm({ current }: { current?: string | null }) {
  const t = useTranslations("Onboarding");
  const [state, action] = useActionState(linkSteamAction, EMPTY);

  return (
    <form action={action}>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          name="steamId"
          defaultValue={current ?? ""}
          placeholder={t("forms.steam.placeholder")}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl px-3.5 py-3.5 text-[0.9375rem] text-foreground outline-none placeholder:text-muted"
          style={FIELD}
        />
        <Submit>{current ? t("forms.steam.update") : t("forms.steam.link")}</Submit>
      </div>
      <Feedback state={state} />
      <PrivacyGuide platform="steam" />
    </form>
  );
}

export function LinkXboxForm({ current }: { current?: string | null }) {
  const t = useTranslations("Onboarding");
  const [state, action] = useActionState(linkXboxAction, EMPTY);

  return (
    <form action={action}>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          name="gamertag"
          type="text"
          defaultValue={current ?? ""}
          placeholder={t("forms.xbox.placeholder")}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl px-3.5 py-3.5 text-[0.9375rem] text-foreground outline-none placeholder:text-muted"
          style={FIELD}
        />
        <Submit>{current ? t("forms.xbox.update") : t("forms.xbox.link")}</Submit>
      </div>
      <Feedback state={state} />
      <PrivacyGuide platform="xbox" />
    </form>
  );
}

/**
 * Crear carpeta. Si se usa desde la ficha de un juego, ese juego entra en la
 * carpeta recién creada: es lo que se espera al escribir el nombre allí.
 */
export function NewCollectionForm({ gameId }: { gameId?: string }) {
  const t = useTranslations("Onboarding");
  const [state, action] = useActionState(createCollectionAction, EMPTY);

  return (
    <form action={action}>
      {gameId && <input type="hidden" name="gameId" value={gameId} />}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          name="name"
          placeholder={t("forms.collection.placeholder")}
          autoComplete="off"
          maxLength={40}
          className="min-w-0 flex-1 rounded-xl px-3.5 py-3 text-[0.9375rem] text-foreground outline-none placeholder:text-muted"
          style={FIELD}
        />
        <Submit>{t("forms.collection.create")}</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** Crear una liga — el creador entra como único miembro, se invita al resto desde la ficha de la liga (`AddLeagueMemberForm`). Duración opcional: sin ella, la liga no tiene fecha de fin. */
export function NewLeagueForm() {
  const t = useTranslations("Onboarding");
  const [state, action] = useActionState(createLeagueAction, EMPTY);
  const [durationUnit, setDurationUnit] = useState("");

  const UNIDADES_DURACION = [
    { value: "dias", label: t("forms.league.durationUnits.dias") },
    { value: "semanas", label: t("forms.league.durationUnits.semanas") },
    { value: "meses", label: t("forms.league.durationUnits.meses") },
    { value: "anios", label: t("forms.league.durationUnits.anios") },
  ];

  return (
    <form action={action}>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          name="name"
          placeholder={t("forms.league.namePlaceholder")}
          autoComplete="off"
          maxLength={60}
          className="min-w-0 flex-1 rounded-xl px-3.5 py-3 text-[0.9375rem] text-foreground outline-none placeholder:text-muted"
          style={FIELD}
        />
        <Submit>{t("forms.league.create")}</Submit>
      </div>
      <div className="mt-2.5 flex items-center gap-2.5">
        <span className="shrink-0 text-xs text-muted">{t("forms.league.durationLabel")}</span>
        <input
          type="number"
          name="durationValue"
          min={1}
          placeholder={t("forms.league.durationPlaceholder")}
          className="w-16 rounded-xl px-2.5 py-2 text-[0.8125rem] text-foreground outline-none"
          style={FIELD}
        />
        <CustomSelect
          name="durationUnit"
          value={durationUnit}
          onChange={setDurationUnit}
          placeholder={t("forms.league.durationNone")}
          options={UNIDADES_DURACION}
          className="w-40"
        />
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** Fijar el juego de reto de una liga propia — quién llega antes al platino, aparte de la clasificación por puntos. */
export function SetLeagueChallengeForm({
  leagueId,
  juegos,
  actual,
}: {
  leagueId: string;
  juegos: { id: string; title: string; deviceLabel: string }[];
  actual: string | null;
}) {
  const t = useTranslations("Onboarding");
  const [gameId, setGameId] = useState(actual ?? "");

  // Un mismo título puede estar dos veces en la biblioteca (p. ej. en PS5 y
  // en Switch) — si el nombre se repite, se enseña la plataforma al lado
  // para saber cuál es cuál; si no se repite, no hace falta el ruido.
  const repetidos = new Map<string, number>();
  for (const j of juegos) repetidos.set(j.title, (repetidos.get(j.title) ?? 0) + 1);

  const options = [
    { value: "", label: t("forms.league.noChallenge") },
    ...juegos.map((j) => ({
      value: j.id,
      label: (repetidos.get(j.title) ?? 0) > 1 ? `${j.title} (${j.deviceLabel})` : j.title,
    })),
  ];

  return (
    <form action={setLeagueChallengeAction} className="flex flex-col gap-2.5 sm:flex-row">
      <input type="hidden" name="leagueId" value={leagueId} />
      <CustomSelect name="gameId" value={gameId} onChange={setGameId} options={options} className="min-w-0 flex-1" />
      <Submit>{t("forms.common.save")}</Submit>
    </form>
  );
}

/** Invitar a un amigo a una liga propia — solo ofrece amigos que todavía no son miembros (aceptados o pendientes; el backend igualmente exige que sean amigos de verdad). */
export function AddLeagueMemberForm({
  leagueId,
  candidatos,
}: {
  leagueId: string;
  candidatos: { userId: string; label: string }[];
}) {
  const t = useTranslations("Onboarding");
  const [friendUserId, setFriendUserId] = useState("");

  if (candidatos.length === 0) {
    return <p className="text-sm text-muted">{t("forms.league.noFriendsAvailable")}</p>;
  }

  return (
    <form action={addLeagueMemberAction} className="flex flex-col gap-2.5 sm:flex-row">
      <input type="hidden" name="leagueId" value={leagueId} />
      <CustomSelect
        name="friendUserId"
        value={friendUserId}
        onChange={setFriendUserId}
        placeholder={t("forms.league.chooseFriend")}
        options={candidatos.map((c) => ({ value: c.userId, label: c.label }))}
        className="min-w-0 flex-1"
      />
      <Submit>{t("forms.league.invite")}</Submit>
    </form>
  );
}

export function AddFriendForm() {
  const t = useTranslations("Onboarding");
  const [state, action] = useActionState(addFriendAction, EMPTY);

  return (
    <form action={action}>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <AtField name="handle" placeholder={t("forms.friend.placeholder")} />
        <Submit>{t("forms.friend.sendRequest")}</Submit>
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
  const t = useTranslations("Onboarding");
  const [state, action] = useActionState(updateProfileAction, EMPTY);

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <div>
        <label className="mb-2 block text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">
          {t("forms.profile.displayNameLabel")}
        </label>
        <div className="flex flex-1 items-stretch overflow-hidden rounded-xl" style={FIELD}>
          <input
            name="name"
            defaultValue={currentName}
            placeholder={t("forms.profile.displayNamePlaceholder")}
            className="w-full bg-transparent px-4 py-3.5 text-[0.9375rem] text-foreground placeholder-muted/50 outline-none"
            required
          />
        </div>
      </div>
      <div>
        <label className="mb-2 block text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">
          {t("forms.profile.avatarUrlLabel")}
        </label>
        <div className="flex flex-1 items-stretch overflow-hidden rounded-xl" style={FIELD}>
          <input
            name="image"
            defaultValue={currentImage || ""}
            placeholder={t("forms.profile.avatarUrlPlaceholder")}
            className="w-full bg-transparent px-4 py-3.5 text-[0.9375rem] text-foreground placeholder-muted/50 outline-none"
          />
        </div>
      </div>
      <div className="mt-2 flex">
        <Submit>{t("forms.profile.save")}</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

function TestButton() {
  const t = useTranslations("Onboarding");
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-50"
      style={FIELD}
    >
      {pending ? "…" : t("forms.common.test")}
    </button>
  );
}

/**
 * Avisos por el bot de Discord (ver lib/discordBot.ts) — sustituye al
 * webhook de antes. Sin URL que pegar: si la cuenta inició sesión con
 * Discord, el interruptor ya tiene a quién escribirle.
 */
export function DiscordDmForm({ enabled, vinculado }: { enabled: boolean; vinculado: boolean }) {
  const t = useTranslations("Onboarding");
  const [stateGuardar, actionGuardar] = useActionState(setDiscordDmAction, EMPTY);
  const [stateProbar, actionProbar] = useActionState(probarDiscordDmAction, EMPTY);

  if (!vinculado) {
    return (
      <p className="text-xs leading-relaxed text-muted">
        {t("forms.discordDm.notLinked")}
      </p>
    );
  }

  return (
    <div>
      <form action={actionGuardar} className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{t("forms.discordDm.title")}</p>
          <p className="text-xs text-muted">{t("forms.discordDm.description")}</p>
        </div>
        <input type="hidden" name="activar" value={(!enabled).toString()} />
        <button
          type="submit"
          role="switch"
          aria-checked={enabled}
          className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
          style={{ background: enabled ? "var(--accent)" : "var(--surface-2)" }}
        >
          <span
            className="absolute top-1 h-5 w-5 rounded-full bg-white transition-transform"
            style={{ transform: enabled ? "translateX(24px)" : "translateX(4px)" }}
          />
        </button>
      </form>
      <Feedback state={stateGuardar} />

      {enabled && (
        <form action={actionProbar} className="mt-3 flex justify-end">
          <TestButton />
        </form>
      )}
      <Feedback state={stateProbar} />

      <p className="mt-3 text-xs leading-relaxed text-muted">
        {t("forms.discordDm.hint")}
      </p>
    </div>
  );
}

function SyncSubmit() {
  const t = useTranslations("Onboarding");
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-bold text-background transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-6px_rgba(88,167,255,0.4)] active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
      style={{ background: "var(--accent-grad)" }}
    >
      {pending ? t("forms.sync.syncing") : t("forms.sync.syncNow")}
    </button>
  );
}

/** El botón "Sincronizar ahora" de Ajustes → Plataformas. Con cooldown de
 * verdad ahora (ver syncNowAction): sin `useActionState` no había forma de
 * enseñar "espera 47s" cuando se pulsaba de más — antes simplemente no
 * pasaba nada, sin que nadie supiera por qué. */
export function SyncNowForm() {
  const [state, action] = useActionState(syncNowAction, EMPTY);
  return (
    <form action={action}>
      <SyncSubmit />
      <Feedback state={state} />
    </form>
  );
}

function SyncPlatformSubmit({ label }: { label: string }) {
  const t = useTranslations("Onboarding");
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="text-xs font-semibold text-accent hover:underline disabled:pointer-events-none disabled:opacity-50">
      {pending ? t("forms.sync.syncing") : t("forms.sync.syncPlatform", { label })}
    </button>
  );
}

/** Mismo cooldown que `SyncNowForm`, pero por plataforma (una cuenta a la
 * vez) — el botón suelto que hay junto a cada cuenta vinculada. */
export function SyncPlatformForm({ platform, label }: { platform: string; label: string }) {
  const [state, action] = useActionState(syncPlatformAction, EMPTY);
  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="platform" value={platform} />
      <SyncPlatformSubmit label={label} />
      <Feedback state={state} />
    </form>
  );
}

/**
 * /ajustes/ocultar: lista de funciones opcionales que se pueden quitar de la
 * cabecera. Se manda el set entero marcado (no hay "guardar uno a uno") —
 * `setHiddenNavItemsAction` reemplaza la lista completa en cada envío.
 */
export function HiddenNavForm({
  opciones,
  ocultas,
}: {
  opciones: readonly { key: NavKey; label: string }[];
  ocultas: string[];
}) {
  const t = useTranslations("Onboarding");

  return (
    <form action={setHiddenNavItemsAction} className="flex flex-col gap-1">
      {opciones.map((opcion) => (
        <label
          key={opcion.key}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3.5 transition-colors hover:bg-surface-2"
          style={FIELD}
        >
          <span className="text-[0.9375rem] font-semibold">{t("forms.hiddenNav.hideLabel", { label: opcion.label })}</span>
          <input
            type="checkbox"
            name="navKey"
            value={opcion.key}
            defaultChecked={ocultas.includes(opcion.key)}
            className="h-4 w-4 rounded border-white/10 bg-surface-2 text-accent focus:ring-accent"
          />
        </label>
      ))}
      <div className="mt-3">
        <Submit>{t("forms.common.save")}</Submit>
      </div>
    </form>
  );
}
