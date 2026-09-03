import { TrophyIcon } from "@/components/TrophyIcon";

export function AchievementIcon({ id, size = 18 }: { id: string; size?: number }) {
  if (id === "first_blood") return <TrophyIcon grade="platinum" size={size} />;

  const paths: Record<string, string> = {
    cazador: "M4 20 10 14m0 0 3-3m-3 3-3-3m3 3 3 3m4-8 3-3m0 0-3-3m3 3h-5",
    experto: "M12 3 14 9l6 3-6 3-2 6-2-6-6-3 6-3 2-6Z",
    leyenda: "M5 5h14v4a7 7 0 0 1-14 0V5Zm3 14h8m-4-3v3M5 7H3v2a4 4 0 0 0 4 4m12-6h2v2a4 4 0 0 1-4 4",
    coleccionista: "M4 5h12v14H4zM8 5V3h12v14h-4M7 9h6m-6 3h6m-6 3h4",
    madrugador: "M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8m0-12.8-2.8 2.8m-7.2 7.2-2.8 2.8",
    critico: "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
    sociable: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87m2-4.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    rolero: "M14.5 4h-5L7 7H4v3l-2.5 2.5a3.536 3.536 0 1 0 5 5L9 15v-3l3-3 5-5zM15 9l-4 4",
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[id] ?? "M12 3v18M3 12h18"} />
    </svg>
  );
}
