import type { SesionVista } from "@/lib/sesiones";

/** Una sesión tal como la lee la app (fechas en ISO). Ver CONTRACT.md → Sesiones. */
export function sesionParaMovil(s: SesionVista) {
  return {
    id: s.id,
    trofeo: s.trofeo,
    trofeoInfo: s.trofeoInfo,
    descripcion: s.descripcion,
    fechaHora: s.fechaHora.toISOString(),
    plazasTotales: s.plazasTotales,
    ocupadas: s.ocupadas,
    libres: s.libres,
    cancelada: s.cancelada,
    juego: s.juego,
    anfitrion: s.anfitrion,
    participantes: s.participantes,
    soyAnfitrion: s.soyAnfitrion,
    estoyApuntado: s.estoyApuntado,
    yaLoTengo: s.yaLoTengo,
    loTengo: s.loTengo,
    miJuegoId: s.miJuegoId,
  };
}
