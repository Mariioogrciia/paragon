"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileForm({ user }: { user: any }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [avatar, setAvatar] = useState(user.image);
  
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

      <form action="/api/profile/update" method="POST" className="flex flex-col gap-8">
        <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
          <h2 className="font-semibold mb-4">Detalles del perfil</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Nombre de usuario</label>
              <input name="handle" defaultValue={user.handle} className="w-full rounded-xl border border-white/10 bg-[#121721] px-4 py-3 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Email</label>
              <input name="email" defaultValue={user.email} disabled className="w-full rounded-xl border border-white/10 bg-[#121721]/50 px-4 py-3 text-sm text-muted cursor-not-allowed focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Nombre</label>
              <input name="firstName" defaultValue={user.firstName} className="w-full rounded-xl border border-white/10 bg-[#121721] px-4 py-3 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Apellido</label>
              <input name="lastName" defaultValue={user.lastName} className="w-full rounded-xl border border-white/10 bg-[#121721] px-4 py-3 text-sm focus:border-accent focus:outline-none" />
            </div>
          </div>
        </section>

        <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
          <h2 className="font-semibold mb-4">Configuración regional</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Idioma</label>
              <select name="language" defaultValue={user.language} className="w-full rounded-xl border border-white/10 bg-[#121721] px-4 py-3 text-sm focus:border-accent focus:outline-none">
                <option value="es-ES">Español</option>
                <option value="en-US">English</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Zona horaria</label>
              <select name="timezone" defaultValue={user.timezone} className="w-full rounded-xl border border-white/10 bg-[#121721] px-4 py-3 text-sm focus:border-accent focus:outline-none">
                <option value="Europe/Madrid">(GMT+01:00) Madrid</option>
              </select>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" className="rounded-xl bg-accent px-6 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(74,158,255,0.4)]">
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
