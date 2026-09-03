import { TrophyIcon } from "@/components/TrophyIcon";

export function AchievementIcon({ id, size = 18 }: { id: string; size?: number }) {
  if (id === "first_blood") return <TrophyIcon grade="platinum" size={size} />;

  const paths: Record<string, string> = {
    cazador: "M4 20 10 14m0 0 3-3m-3 3-3-3m3 3 3 3m4-8 3-3m0 0-3-3m3 3h-5",
    experto: "M12 3 14 9l6 3-6 3-2 6-2-6-6-3 6-3 2-6Z",
    leyenda: "M5 5h14v4a7 7 0 0 1-14 0V5Zm3 14h8m-4-3v3M5 7H3v2a4 4 0 0 0 4 4m12-6h2v2a4 4 0 0 1-4 4",
    coleccionista: "M4 5h12v14H4zM8 5V3h12v14h-4M7 9h6m-6 3h6m-6 3h4",
    madrugador: "M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8m0-12.8-2.8 2.8m-7.2 7.2-2.8 2.8",
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[id] ?? "M12 3v18M3 12h18"} />
    </svg>
  );
}
