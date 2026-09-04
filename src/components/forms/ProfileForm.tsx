"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ProfileSectionOrderEditor } from "@/components/ProfileSectionOrderEditor";
import { BADGE_DEFINITIONS } from "@/components/Badges";
import { FRAME_REQUISITOS } from "@/lib/level";
import { AvatarFrame } from "@/components/AvatarFrame";
import { Avatar } from "@/components/Avatar";
import { BannerPresetPicker, PlatformBanner } from "@/components/BannerPresets";
import { bannerPresetKey } from "@/lib/bannerPresets";

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
}

const FRAMES = [
  { value: "", label: "Sin marco" },
  { value: "neon", label: "Marco Neón (Nivel 5+)" },
  { value: "gold", label: "Marco Dorado (Nivel 10+)" },
  { value: "circuito", label: "Marco Circuito (Nivel 25+)" },
  { value: "platinum", label: "Marco Platino (Nivel 50+)" },
  { value: "fire", label: "Marco Fuego (Nivel 100+)" },
  { value: "cristal", label: "Marco Cristal (Nivel 150+)" },
];

const TEMAS_PERFIL = [
  { value: "dark", label: "Oscuro" },
  { value: "light", label: "Claro" },
  { value: "oled", label: "OLED" },
  { value: "high-contrast", label: "Contraste alto" },
];

export function ProfileForm({
  user,
  nivel = 0,
  badges = [],
  juegos = [],
  favoritos = [],
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
}) {
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
        <h1 className="text-xl font-bold mb-2">Información personal</h1>
        <p className="text-sm text-muted">Gestiona tu información personal y preferencias.</p>
      </div>

      <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
        <h2 className="font-semibold mb-4">Subir Avatar</h2>
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-surface-2 border border-white/10 flex items-center justify-center">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl text-muted">{user.name?.charAt(0).toUpperCase() || "?"}</span>
            )}
          </div>
          <div>
            <label className="cursor-pointer rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752C4] transition-colors">
              {isUploading ? "Subiendo..." : "Subir Avatar"}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            </label>
            <p className="mt-2 text-xs text-muted">Formatos JPG, JPEG, PNG y GIF, hasta 5 MB</p>
          </div>
        </div>
      </section>

      <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
        <h2 className="font-semibold mb-4">Banner del perfil</h2>
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
              <span className="text-muted text-sm">Sin banner personalizado</span>
            )}
          </div>
          <div>
            <label className="inline-block cursor-pointer rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752C4] transition-colors">
              {isUploadingBanner ? "Subiendo..." : "Subir Banner"}
              <input type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={handleBannerUpload} disabled={isUploadingBanner} />
            </label>
            <p className="mt-2 text-xs text-muted">Sustituye al fondo de juego. Imagen (JPG, PNG, GIF) o vídeo corto (MP4, WebM), ratio ideal 3:1</p>
          </div>
        </div>
      </section>

      <form action="/api/profile/update" method="POST" className="flex flex-col gap-8">
        <input type="hidden" name="profileBannerUrl" value={banner ?? ""} />
        <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
          <h2 className="font-semibold mb-4">Detalles del perfil</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Nombre de usuario</label>
              <input name="handle" defaultValue={user.handle ?? ""} className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Email</label>
              <input name="email" defaultValue={user.email ?? ""} disabled className="w-full rounded-xl border border-white/10 bg-[var(--surface)]/50 px-4 py-3 text-sm text-muted cursor-not-allowed focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Nombre</label>
              <input name="firstName" defaultValue={user.firstName ?? ""} className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Apellido</label>
              <input name="lastName" defaultValue={user.lastName ?? ""} className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Título del perfil</label>
              <input
                name="profileTitle"
                maxLength={60}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Cazador de platinos"
                className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm focus:border-accent focus:outline-none"
              />
              {titulosSugeridos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {titulosSugeridos.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTitulo(t)}
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors hover:text-foreground"
                      style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Juego para el fondo</label>
              <BackgroundGamePicker
                juegos={juegos}
                favoritos={favoritos}
                value={fondoJuegoId}
                onChange={setFondoJuegoId}
              />
              <input type="hidden" name="profileBackgroundGameId" value={fondoJuegoId} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Estado</label>
              <input name="statusText" maxLength={100} defaultValue={user.statusText ?? ""} placeholder="¿A qué estás jugando?" className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm focus:border-accent focus:outline-none" />
            </div>
          </div>
        </section>

        <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
          <h2 className="font-semibold mb-4">Personalización Visual</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Color del perfil</label>
              <div className="flex gap-2">
                <input type="color" name="profileColor" defaultValue={user.profileColor ?? "#3b82f6"} className="h-11 w-11 rounded-lg border-0 bg-transparent p-0 cursor-pointer" />
                <span className="text-xs text-muted self-center">Este color bañará tu perfil cuando lo visiten.</span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Tema del perfil</label>
              <CustomSelect name="theme" defaultValue={user.theme ?? "dark"} options={TEMAS_PERFIL} />
              <p className="mt-1.5 text-xs text-muted">Cómo se ve tu perfil para quien lo visite — no cambia el suyo propio.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Marco del avatar</label>
              <div className="flex items-center gap-3">
                {/* Avatar, no un <img> suelto: un <img> es inline por defecto y,
                    dentro del div sin flex de Nucleo (AvatarFrame.tsx), dejaba
                    un hueco fino abajo (el espacio de línea de base) — la foto
                    no llegaba a rellenar el círculo del marco. Avatar ya
                    centra con flex, igual que en el perfil público. */}
                <AvatarFrame frame={marco}>
                  <Avatar src={avatar} name={user.name ?? "?"} size={44} />
                </AvatarFrame>
                <div className="min-w-0 flex-1">
                  <CustomSelect
                    name="profileFrame"
                    value={marco}
                    onChange={setMarco}
                    options={FRAMES.map((f) => (marcoBloqueado(f.value) ? { value: f.value, label: `🔒 ${f.label}` } : f))}
                  />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted">Estás a nivel {nivel}. Los marcos bloqueados se descartan aunque los elijas.</p>
            </div>
          </div>

          <div className="mt-6">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Banner por plataforma</label>
            <BannerPresetPicker value={banner} onChange={setBanner} />
            <p className="mt-1.5 text-xs text-muted">Arte propio de Paragon, sin fotos con derechos de por medio. Sustituye a lo que subas arriba; volver a subir un archivo lo reemplaza.</p>
          </div>

          <div className="mt-6">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Orden de secciones</label>
            <ProfileSectionOrderEditor initialOrder={user.profileSectionOrder} />
          </div>
        </section>

        <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
          <h2 className="font-semibold mb-4">Configuración regional</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Idioma</label>
              <CustomSelect
                name="language"
                defaultValue={user.language ?? "es-ES"}
                options={[
                  { value: "es-ES", label: "Español" },
                  { value: "en-US", label: "English" },
                ]}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Zona horaria</label>
              <CustomSelect
                name="timezone"
                defaultValue={user.timezone ?? "Europe/Madrid"}
                options={[
                  { value: "Europe/Madrid", label: "(GMT+01:00) Madrid" },
                ]}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" className="rounded-xl bg-accent px-6 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgb(var(--accent-rgb) / 0.4)]">
            Guardar cambios
          </button>
        </div>
      </form>
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
  const favoritosSet = new Set(favoritos);
  const ordenados = [...juegos].sort((a, b) => {
    const aFav = favoritosSet.has(a.id) ? 0 : 1;
    const bFav = favoritosSet.has(b.id) ? 0 : 1;
    return aFav - bFav;
  });

  if (ordenados.length === 0) {
    return <p className="text-xs text-muted">Sin juegos en tu biblioteca todavía.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("")}
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold text-muted transition-colors hover:text-foreground"
        style={{ border: `2px solid ${value === "" ? "var(--accent)" : "var(--border)"}` }}
        title="Automático (el más reciente)"
      >
        Auto
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
            <span className="absolute right-0.5 top-0.5 text-[10px] drop-shadow">⭐</span>
          )}
        </button>
      ))}
    </div>
  );
}
