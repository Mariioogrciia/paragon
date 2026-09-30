import { TrophyIcon } from "@/components/TrophyIcon";

const PATHS: Record<string, string> = {
  cazador: "M4 20 10 14m0 0 3-3m-3 3-3-3m3 3 3 3m4-8 3-3m0 0-3-3m3 3h-5",
  experto: "M12 3 14 9l6 3-6 3-2 6-2-6-6-3 6-3 2-6Z",
  leyenda: "M5 5h14v4a7 7 0 0 1-14 0V5Zm3 14h8m-4-3v3M5 7H3v2a4 4 0 0 0 4 4m12-6h2v2a4 4 0 0 1-4 4",
  coleccionista: "M4 5h12v14H4zM8 5V3h12v14h-4M7 9h6m-6 3h6m-6 3h4",
  madrugador: "M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8m0-12.8-2.8 2.8m-7.2 7.2-2.8 2.8",
  critico: "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
  sociable:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87m2-4.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  rolero: "M14.5 4h-5L7 7H4v3l-2.5 2.5a3.536 3.536 0 1 0 5 5L9 15v-3l3-3 5-5zM15 9l-4 4",
  multiplataforma:
    "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  joya_rara: "M6 3h12l4 6-10 12L2 9l4-6Zm-4 6h20M12 21 8 9l4-6 4 6-4 12",
  uno_entre_cien: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  campeon: "M8 21h8m-4-4v4m-5-17h10v5a5 5 0 0 1-10 0V4Zm10 1h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3",
  senor_guerra: "M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6m-3 3 4 4m1-1-1 1M9.5 6.5 21 18v3h-3L6.5 9.5M11 5l-6 6",
  en_equipo: "M8 12h8M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm8 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a6 6 0 0 1 12 0m-4 0a6 6 0 0 1 12 0",
  anfitrion: "M3 10h18M8 2v4m8-4v4M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm4 10 2 2 4-4",
  guia: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Zm0 0A2.5 2.5 0 0 0 6.5 22H20v-5M9 7h7m-7 4h5",
  semana_perfecta: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 12 3 3 5-6",
  incansable: "M13 2 3 14h9l-1 8 10-12h-9l1-8Z",
  temporada_oro: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm-3.5 5L12 22l3.5-2M8.2 13.9 7 22l5-3 5 3-1.2-8.1",
  temporada_platino: "M12 2 15 8.5l7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1L12 2Z",
  veterano: "M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3Zm-3 9 3 3 3-3m-6-3 3 3 3-3",
  maestro: "M2 20h20M4 20 2 7l6 4 4-7 4 7 6-4-2 13",
  noctambulo: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
  maraton: "M13 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 22l3-7 3 3v6m-6-8 2-6 5 1 3 4 3 1M9 9 6 8l-3 3",
  oculto: "M9 9a3 3 0 1 1 4 2.83c-.6.22-1 .8-1 1.42V14m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z",
};

export function AchievementIcon({ id, size = 18 }: { id: string; size?: number }) {
  if (id === "first_blood") return <TrophyIcon grade="platinum" size={size} />;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[id] ?? "M12 3v18M3 12h18"} />
    </svg>
  );
}
