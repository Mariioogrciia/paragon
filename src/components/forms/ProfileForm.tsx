"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ProfileSectionOrderEditor } from "@/components/ProfileSectionOrderEditor";
import { normalizeSectionOrder } from "@/lib/profileSections";
import { BADGE_DEFINITIONS } from "@/components/Badges";
import { FRAME_REQUISITOS } from "@/lib/level";
import { AvatarFrame } from "@/components/AvatarFrame";
import { Avatar } from "@/components/Avatar";
import { BannerPresetPicker, PlatformBanner } from "@/components/BannerPresets";
import { bannerPresetKey } from "@/lib/bannerPresets";
import { DiscordDmForm } from "@/components/forms/Forms";
import { PushToggle } from "@/components/PushToggle";

interface ProfileFormUser {
  id: string;
  name: string | null;
  image: string | null;
  handle: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  language: string | null;
  timezone: string | null;
  profileTitle?: string | null;
  profileBackgroundGameId?: string | null;
  profileBannerUrl?: string | null;
  profileColor?: string | null;
  profileFrame?: string | null;
  statusText?: string | null;
  theme?: string | null;
  profileSectionOrder?: string[] | null;
  discordDmEnabled?: boolean;
}

export function ProfileForm({
  user,
  nivel = 0,
  badges = [],
  juegos = [],
  favoritos = [],
  discordVinculado = false,
  cuentasVinculadas = [],
}: {
  user: ProfileFormUser;
  /** Nivel Paragon real del usuario — decide qué marcos puede elegir de
   * verdad (el servidor también lo comprueba en /api/profile/update, esto
   * es solo para no ofrecer algo que luego se va a descartar). */
  nivel?: number;
  /** Insignias ya ganadas, para sugerir títulos coherentes con ellas. */
  badges?: string[];
  /** Biblioteca (sin deseados, solo lo que tiene carátula) para el selector
   * visual de "juego para el fondo" — antes había que escribir el ID a mano. */
  juegos?: { id: string; title: string; iconUrl: string }[];
  /** IDs de los juegos favoritos del usuario, para ponerlos primero en el
   * selector — el fondo "basado en tu juego favorito" que se pidió. */
  favoritos?: string[];
  /** Si esta cuenta inició sesión con Discord alguna vez — sin esto el bot no tiene a quién escribir. */
  discordVinculado?: boolean;
  /** Cuentas vinculadas que tienen avatar disponible, para poder elegirlo. */
  cuentasVinculadas?: { platform: string; avatarUrl: string }[];
}) {
  const t = useTranslations("Onboarding");

  const FRAMES = [
    { value: "", label: t("profileForm.frames.none") },
    { value: "neon", label: t("profileForm.frames.neon") },
    { value: "gold", label: t("profileForm.frames.gold") },
    { value: "circuito", label: t("profileForm.frames.circuito") },
    { value: "platinum", label: t("profileForm.frames.platinum") },
    { value: "fire", label: t("profileForm.frames.fire") },
    { value: "cristal", label: t("profileForm.frames.cristal") },
  ];

  const TEMAS_PERFIL = [
    { value: "dark", label: t("profileForm.themes.dark") },
    { value: "light", label: t("profileForm.themes.light") },
    { value: "oled", label: t("profileForm.themes.oled") },
    { value: "high-contrast", label: t("profileForm.themes.highContrast") },
  ];

  const [titulo, setTitulo] = useState(user.profileTitle ?? "");
  const marcoBloqueado = (v: string) => FRAME_REQUISITOS[v] !== undefined && nivel < FRAME_REQUISITOS[v];
  const [marco, setMarco] = useState(marcoBloqueado(user.profileFrame ?? "") ? "" : (user.profileFrame ?? ""));
  const [fondoJuegoId, setFondoJuegoId] = useState(user.profileBackgroundGameId ?? "");
  const titulosSugeridos = badges
    .map((id) => BADGE_DEFINITIONS[id]?.name)
    .filter((n): n is string => Boolean(n));

  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [avatar, setAvatar] = useState(user.image);

  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [banner, setBanner] = useState(user.profileBannerUrl);

  // Resto de campos del formulario grande, controlados solo para poder
  // saber si hay algo distinto de lo guardado — antes "Guardar cambios"
  // estaba siempre activo, aunque no se hubiera tocado nada. Los valores
  // iniciales (memorizados una vez) son la base de comparación.
  const inicial = useState(() => ({
    handle: user.handle ?? "",
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    statusText: user.statusText ?? "",
    profileColor: user.profileColor ?? "#3b82f6",
    theme: user.theme ?? "dark",
    language: user.language ?? "es-ES",
    timezone: user.timezone ?? "Europe/Madrid",
    profileSectionOrder: JSON.stringify(normalizeSectionOrder(user.profileSectionOrder)),
  }))[0];

  const [handle, setHandle] = useState(inicial.handle);
  const [firstName, setFirstName] = useState(inicial.firstName);
  const [lastName, setLastName] = useState(inicial.lastName);
  const [statusText, setStatusText] = useState(inicial.statusText);
  const [profileColor, setProfileColor] = useState(inicial.profileColor);
  const [theme, setTheme] = useState(inicial.theme);
  const [language, setLanguage] = useState(inicial.language);
  const [timezone, setTimezone] = useState(inicial.timezone);
  const [sectionOrderJson, setSectionOrderJson] = useState(inicial.profileSectionOrder);

  // Fuerza el remontado de `ProfileSectionOrderEditor` al restablecer: su
  // orden es estado interno propio (arrastrable con framer-motion), sembrado
  // una sola vez de `initialOrder` — cambiar `sectionOrderJson` desde fuera
  // no reordena su UI, así que hace falta un `key` nuevo para que vuelva a
  // arrancar desde el valor original.
  const [resetKey, setResetKey] = useState(0);

  function restablecer() {
    setHandle(inicial.handle);
    setFirstName(inicial.firstName);
    setLastName(inicial.lastName);
    setStatusText(inicial.statusText);
    setProfileColor(inicial.profileColor);
    setTheme(inicial.theme);
    setLanguage(inicial.language);
    setTimezone(inicial.timezone);
    setSectionOrderJson(inicial.profileSectionOrder);
    setTitulo(user.profileTitle ?? "");
    setMarco(marcoBloqueado(user.profileFrame ?? "") ? "" : (user.profileFrame ?? ""));
    setFondoJuegoId(user.profileBackgroundGameId ?? "");
    setBanner(user.profileBannerUrl);
    setResetKey((k) => k + 1);
  }

  const hayCambiosSinGuardar =
    handle !== inicial.handle ||
    firstName !== inicial.firstName ||
    lastName !== inicial.lastName ||
    statusText !== inicial.statusText ||
    profileColor !== inicial.profileColor ||
    theme !== inicial.theme ||
    language !== inicial.language ||
    timezone !== inicial.timezone ||
    sectionOrderJson !== inicial.profileSectionOrder ||
    titulo !== (user.profileTitle ?? "") ||
    marco !== (marcoBloqueado(user.profileFrame ?? "") ? "" : (user.profileFrame ?? "")) ||
    fondoJuegoId !== (user.profileBackgroundGameId ?? "") ||
    banner !== user.profileBannerUrl ||
    avatar !== user.image;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "avatar");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setAvatar(data.url);
      router.refresh();
    }
    setIsUploading(false);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "banner");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setBanner(data.url);
      // Actualizamos el input oculto o directamente dejamos que el form mande la URL (lo haremos con input hidden)
    }
    setIsUploadingBanner(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold mb-2">{t("profileForm.title")}</h1>
        <p className="text-sm text-muted">{t("profileForm.description")}</p>
      </div>

      <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
        <h2 className="font-semibold mb-4">{t("profileForm.avatar.title")}</h2>
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-surface-2 border border-white/10 flex items-center justify-center">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl text-muted">{user.name?.charAt(0).toUpperCase() || "?"}</span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752C4] transition-colors">
                {isUploading ? t("profileForm.avatar.uploading") : t("profileForm.avatar.uploadButton")}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
              </label>
              
              {cuentasVinculadas && cuentasVinculadas.length > 0 && (
                <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                  <span className="text-xs text-muted mr-1">O usa de:</span>
                  {cuentasVinculadas.map((acc) => (
                    <button
                      key={acc.platform}
                      type="button"
                      onClick={() => setAvatar(acc.avatarUrl)}
                      className={`h-8 w-8 overflow-hidden rounded-full border-2 transition-all hover:scale-110 ${
                        avatar === acc.avatarUrl ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      title={`Usar avatar de ${acc.platform}`}
                    >
                      <img src={acc.avatarUrl} alt={acc.platform} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">{t("profileForm.avatar.hint")}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
        <h2 className="font-semibold mb-4">{t("profileForm.banner.title")}</h2>
        <div className="flex flex-col gap-4">
          <div className="h-32 w-full shrink-0 overflow-hidden rounded-xl bg-surface-2 border border-white/10 flex items-center justify-center">
            {bannerPresetKey(banner) ? (
              <PlatformBanner preset={bannerPresetKey(banner)!} className="h-full w-full" />
            ) : banner ? (
              /\.(mp4|webm)$/i.test(banner) ? (
                <video src={banner} className="h-full w-full object-cover" autoPlay muted loop playsInline />
              ) : (
                <img src={banner} alt="Banner" className="h-full w-full object-cover" />
              )
            ) : (
              <span className="text-muted text-sm">{t("profileForm.banner.empty")}</span>
            )}
          </div>
          <div>
            <label className="inline-block cursor-pointer rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752C4] transition-colors">
              {isUploadingBanner ? t("profileForm.banner.uploading") : t("profileForm.banner.uploadButton")}
              <input type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={handleBannerUpload} disabled={isUploadingBanner} />
            </label>
            <p className="mt-2 text-xs text-muted">{t("profileForm.banner.hint")}</p>
          </div>
        </div>
      </section>

      <form id="profile-form" action="/api/profile/update" method="POST" className="flex flex-col gap-8">
        <input type="hidden" name="profileBannerUrl" value={banner ?? ""} />
        <input type="hidden" name="image" value={avatar ?? ""} />
        <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
          <h2 className="font-semibold mb-4">{t("profileForm.details.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{t("profileForm.details.usernameLabel")}</label>
              <input name="handle" value={handle} onChange={(e) => setHandle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{t("profileForm.details.emailLabel")}</label>
              <input name="email" defaultValue={user.email ?? ""} disabled className="w-full rounded-xl border border-white/10 bg-[var(--surface)]/50 px-4 py-3 text-sm text-muted cursor-not-allowed focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{t("profileForm.details.firstNameLabel")}</label>
              <input name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{t("profileForm.details.lastNameLabel")}</label>
              <input name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{t("profileForm.details.profileTitleLabel")}</label>
              <input
                name="profileTitle"
                maxLength={60}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={t("profileForm.details.profileTitlePlaceholder")}
                className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm focus:border-accent focus:outline-none"
              />
              {titulosSugeridos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {titulosSugeridos.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTitulo(t)}
                      className="rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold transition-colors hover:text-foreground"
                      style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{t("profileForm.details.backgroundGameLabel")}</label>
              <BackgroundGamePicker
                juegos={juegos}
                favoritos={favoritos}
                value={fondoJuegoId}
                onChange={setFondoJuegoId}
              />
              <input type="hidden" name="profileBackgroundGameId" value={fondoJuegoId} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{t("profileForm.details.statusLabel")}</label>
              <input name="statusText" maxLength={100} value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder={t("profileForm.details.statusPlaceholder")} className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm focus:border-accent focus:outline-none" />
            </div>
          </div>
        </section>

        <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
          <h2 className="font-semibold mb-4">{t("profileForm.visual.title")}</h2>

          {/* Previsualización en vivo: marco, título y color se elegían en
              desplegables sueltos sin ver cómo quedan juntos hasta guardar
              y visitar tu propio perfil. Aquí se combinan los tres a la vez,
              con los mismos valores de estado que ya alimentan el formulario
              — no es una copia, es la misma fuente de verdad. */}
          <div
            className="mb-6 flex items-center gap-4 rounded-2xl p-4"
            style={{ border: `1px solid ${profileColor}55`, background: `linear-gradient(135deg, ${profileColor}22, transparent)` }}
          >
            <div className="shrink-0">
              <AvatarFrame frame={marco}>
                <Avatar src={avatar} name={user.name ?? "?"} size={56} />
              </AvatarFrame>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-base font-bold">{firstName || user.name || t("profileForm.visual.previewFallbackName")}</p>
              <p className="truncate text-[0.8125rem] font-semibold" style={{ color: profileColor }}>
                {titulo || t("profileForm.visual.previewFallbackTitle")}
              </p>
              {statusText && <p className="mt-0.5 truncate text-xs text-muted">{statusText}</p>}
            </div>
            <span className="shrink-0 rounded-full px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wide" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>
              {t("profileForm.visual.previewLabel")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{t("profileForm.visual.colorLabel")}</label>
              <div className="flex gap-2">
                <input type="color" name="profileColor" value={profileColor} onChange={(e) => setProfileColor(e.target.value)} className="h-11 w-11 rounded-lg border-0 bg-transparent p-0 cursor-pointer" />
                <span className="text-xs text-muted self-center">{t("profileForm.visual.colorHint")}</span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{t("profileForm.visual.themeLabel")}</label>
              <CustomSelect name="theme" value={theme} onChange={setTheme} options={TEMAS_PERFIL} />
              <p className="mt-1.5 text-xs text-muted">{t("profileForm.visual.themeHint")}</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{t("profileForm.visual.frameLabel")}</label>
              <div className="flex items-center gap-3">
                {/* Avatar, no un <img> suelto: un <img> es inline por defecto y,
                    dentro del div sin flex de Nucleo (AvatarFrame.tsx), dejaba
                    un hueco fino abajo (el espacio de línea de base) — la foto
                    no llegaba a rellenar el círculo del marco. Avatar ya
                    centra con flex, igual que en el perfil público. */}
                <div className="shrink-0">
                  <AvatarFrame frame={marco}>
                    <Avatar src={avatar} name={user.name ?? "?"} size={44} />
                  </AvatarFrame>
                </div>
                <div className="min-w-0 flex-1">
                  <CustomSelect
                    name="profileFrame"
                    value={marco}
                    onChange={setMarco}
                    options={FRAMES.map((f) => (marcoBloqueado(f.value) ? { value: f.value, label: `🔒 ${f.label}` } : f))}
                  />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted">{t("profileForm.visual.frameHint", { nivel })}</p>
            </div>
          </div>

          <div className="mt-6">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{t("profileForm.visual.bannerLabel")}</label>
            <BannerPresetPicker value={banner} onChange={setBanner} />
            <p className="mt-1.5 text-xs text-muted">{t("profileForm.visual.bannerHint")}</p>
          </div>

          <div className="mt-6">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{t("profileForm.visual.sectionOrderLabel")}</label>
            <ProfileSectionOrderEditor key={resetKey} initialOrder={user.profileSectionOrder} onChange={setSectionOrderJson} />
          </div>
        </section>

        <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
          <h2 className="font-semibold mb-4">{t("profileForm.regional.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{t("profileForm.regional.languageLabel")}</label>
              <CustomSelect
                name="language"
                value={language}
                onChange={setLanguage}
                options={[
                  { value: "es-ES", label: "Español" },
                  { value: "en-US", label: "English" },
                ]}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">{t("profileForm.regional.timezoneLabel")}</label>
              <CustomSelect
                name="timezone"
                value={timezone}
                onChange={setTimezone}
                options={[
                  { value: "Europe/Madrid", label: "(GMT+01:00) Madrid" },
                ]}
              />
            </div>
          </div>
        </section>

      </form>

      {/* Barra flotante: antes había que bajar hasta el final del formulario
          (bastante largo) para encontrar el botón de guardar, sin ninguna
          pista de que hubiera cambios sin guardar hasta llegar ahí. El
          botón vive fuera del <form> (`form="profile-form"` lo asocia por
          id) porque esta barra es hermana de todo lo demás, no descendiente
          del formulario. */}
      <div
        aria-hidden={!hayCambiosSinGuardar}
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 transition-all duration-300"
        style={
          hayCambiosSinGuardar
            ? { opacity: 1, transform: "translateY(0)", pointerEvents: "auto" }
            : { opacity: 0, transform: "translateY(16px)", pointerEvents: "none" }
        }
      >
        <div
          className="flex w-full max-w-2xl items-center justify-between gap-4 rounded-2xl px-5 py-3.5 shadow-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm font-semibold text-foreground">{t("profileForm.unsavedChanges")}</p>
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={restablecer}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
            >
              {t("profileForm.resetButton")}
            </button>
            <button
              type="submit"
              form="profile-form"
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgb(var(--accent-rgb)_/_40%)]"
            >
              {t("profileForm.saveButton")}
            </button>
          </div>
        </div>
      </div>

      {/* Fuera del <form> grande a propósito: son dos acciones de servidor
          propias (guardar/probar), y un <form> dentro de otro no es HTML
          válido — el navegador ignora el anidado y rompe el envío. */}
      <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
        <h2 className="font-semibold mb-4">{t("profileForm.discordTitle")}</h2>
        <DiscordDmForm enabled={user.discordDmEnabled ?? false} vinculado={discordVinculado} />
      </section>

      <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
        <h2 className="font-semibold mb-4">{t("profileForm.pushTitle")}</h2>
        <PushToggle />
      </section>
    </div>
  );
}


/**
 * Selector visual de "juego para el fondo" del perfil — antes había que
 * escribir el ID a mano en un campo de texto ("ID del juego de tu
 * biblioteca"), sin ninguna pista de qué formato quería. Los favoritos van
 * primero, marcados aparte: es la forma más directa de "banner basado en tu
 * juego favorito" sin inventar un campo nuevo — `u/[handle]/page.tsx` ya
 * usa `profileBackgroundGameId` para el fondo del perfil, con `games[0]`
 * como último recurso si no se elige nada.
 */
function BackgroundGamePicker({
  juegos,
  favoritos,
  value,
  onChange,
}: {
  juegos: { id: string; title: string; iconUrl: string }[];
  favoritos: string[];
  value: string;
  onChange: (id: string) => void;
}) {
  const t = useTranslations("Onboarding");
  const favoritosSet = new Set(favoritos);
  const ordenados = [...juegos].sort((a, b) => {
    const aFav = favoritosSet.has(a.id) ? 0 : 1;
    const bFav = favoritosSet.has(b.id) ? 0 : 1;
    return aFav - bFav;
  });

  if (ordenados.length === 0) {
    return <p className="text-xs text-muted">{t("profileForm.backgroundPicker.empty")}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("")}
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-[0.625rem] font-semibold text-muted transition-colors hover:text-foreground"
        style={{ border: `2px solid ${value === "" ? "var(--accent)" : "var(--border)"}` }}
        title={t("profileForm.backgroundPicker.autoTitle")}
      >
        {t("profileForm.backgroundPicker.auto")}
      </button>
      {ordenados.slice(0, 24).map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => onChange(g.id)}
          title={g.title}
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg transition-transform hover:scale-105"
          style={{ border: `2px solid ${value === g.id ? "var(--accent)" : "var(--border)"}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={g.iconUrl} alt="" className="h-full w-full object-cover" />
          {favoritosSet.has(g.id) && (
            <span className="absolute right-0.5 top-0.5 text-[0.625rem] drop-shadow">⭐</span>
          )}
        </button>
      ))}
    </div>
  );
}
