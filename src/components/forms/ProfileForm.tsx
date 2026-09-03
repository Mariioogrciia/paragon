"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomSelect } from "@/components/ui/CustomSelect";

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
}

export function ProfileForm({ user }: { user: ProfileFormUser }) {
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
            {banner ? (
              <img src={banner} alt="Banner" className="h-full w-full object-cover" />
            ) : (
              <span className="text-muted text-sm">Sin banner personalizado</span>
            )}
          </div>
          <div>
            <label className="inline-block cursor-pointer rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752C4] transition-colors">
              {isUploadingBanner ? "Subiendo..." : "Subir Banner"}
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={isUploadingBanner} />
            </label>
            <p className="mt-2 text-xs text-muted">Sustituye al fondo de juego. Formatos JPG, JPEG, PNG y GIF animados, ratio ideal 3:1</p>
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
              <input name="profileTitle" maxLength={60} defaultValue={user.profileTitle ?? ""} placeholder="Ej. Cazador de platinos" className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Juego para el fondo</label>
              <input name="profileBackgroundGameId" defaultValue={user.profileBackgroundGameId ?? ""} placeholder="ID del juego de tu biblioteca" className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm focus:border-accent focus:outline-none" />
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
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Marco del avatar</label>
              <CustomSelect
                name="profileFrame"
                defaultValue={user.profileFrame ?? ""}
                options={[
                  { value: "", label: "Sin marco" },
                  { value: "gold", label: "Marco Dorado (Nivel 10+)" },
                  { value: "platinum", label: "Marco Platino (Nivel 50+)" },
                  { value: "fire", label: "Marco Fuego (Nivel 100+)" },
                ]}
              />
            </div>
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
