"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { importGamesAction, type ImportedGame } from "@/app/actions/import";
import type { Platform } from "@/lib/types";

export function ImportLibraryModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [games, setGames] = useState<ImportedGame[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  function close() {
    setIsOpen(false);
    setGames([]);
    setError(null);
    setProgress(0);
    setImporting(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedGames: ImportedGame[] = [];

        for (const row of results.data as any[]) {
          // Fallback para nombres de columnas comunes en Playnite o exportaciones manuales
          const title = row.Name || row.name || row.Title || row.title || row["Nombre"] || "";
          if (!title) continue;

          const platformRaw = row.Platform || row.platform || row["Plataforma"] || "";
          const platformStr = platformRaw.toLowerCase();
          let platform: Platform = "manual";

          // Solo Epic/Ubisoft se importan como esa plataforma: son vinculables
          // pero Paragon no sincroniza su biblioteca/logros (igual que aquí),
          // así que un CSV no puede dejarlos en un estado peor. Steam/PSN/Xbox/
          // Google SÍ tienen sincronización real (platformAccounts + cron) con
          // su propio nativeId — importarlos como esa misma plataforma con un
          // id inventado crearía una fila duplicada o huérfana que nunca recibe
          // logros. Todo lo demás (incluido lo no reconocido) cae en "manual".
          if (platformStr.includes("epic")) platform = "epic";
          else if (platformStr.includes("ubisoft") || platformStr.includes("uplay")) platform = "ubisoft";

          const statusStr = (row.CompletionStatus || row.status || row["Estado"] || "").toLowerCase();
          const completed = statusStr.includes("beaten") || statusStr.includes("completed") || statusStr.includes("completado");

          parsedGames.push({ title, platform, completed, sourceLabel: platformRaw || undefined });
        }

        if (parsedGames.length === 0) {
          setError("No se encontraron juegos válidos en el CSV. Asegúrate de que haya una columna 'Name'.");
        } else {
          setGames(parsedGames);
        }
      },
      error: (err) => {
        setError("Error leyendo el CSV: " + err.message);
      }
    });
  }

  async function handleImport() {
    if (games.length === 0) return;
    setImporting(true);
    setError(null);

    try {
      // Como IGDB es lento, procesamos en lotes de 10 para no agotar el tiempo
      const batchSize = 10;
      for (let i = 0; i < games.length; i += batchSize) {
        const batch = games.slice(i, i + batchSize);
        await importGamesAction(batch);
        setProgress(Math.round(((i + batch.length) / games.length) * 100));
      }
      
      close();
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Error al importar");
      setImporting(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-[9px] border border-border px-3.5 py-2 text-[13px] font-semibold text-muted transition-all hover:-translate-y-0.5 hover:bg-surface-2 hover:text-foreground"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Importar CSV
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden border shadow-2xl bg-card rounded-2xl border-border flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b shrink-0 border-border">
          <h2 className="text-lg font-bold">Importar Biblioteca</h2>
          <button onClick={close} className="text-muted hover:text-foreground">✕</button>
        </div>

        <div className="p-4 overflow-y-auto min-h-0">
          {games.length === 0 ? (
            <div className="text-center">
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer hover:border-accent hover:bg-surface border-border">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-muted"><span className="font-semibold text-foreground">Haz click para subir</span> tu CSV (Playnite / GOG)</p>
                  <p className="text-xs text-muted">Debe contener columnas como Name, Platform...</p>
                </div>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
              {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            </div>
          ) : (
            <div>
              <p className="mb-4 text-sm">Se han encontrado <strong>{games.length}</strong> juegos listos para importar. El proceso emparejará automáticamente cada juego con su carátula de IGDB. Esto puede tardar un poco.</p>
              
              <div className="max-h-[250px] overflow-y-auto mb-4 border border-border rounded-lg bg-surface divide-y divide-border">
                {games.slice(0, 50).map((g, i) => (
                  <div key={i} className="flex justify-between p-2.5 text-sm">
                    <span className="font-semibold truncate mr-4">{g.title}</span>
                    <span className="text-xs text-muted shrink-0 capitalize px-2 py-0.5 rounded bg-surface-2">{g.sourceLabel || g.platform}</span>
                  </div>
                ))}
                {games.length > 50 && (
                  <div className="p-2.5 text-center text-xs text-muted font-semibold bg-surface-2">
                    ...y {games.length - 50} juegos más.
                  </div>
                )}
              </div>

              {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

              {importing && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1 font-bold text-accent">
                    <span>Importando...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb)/0.4)] disabled:pointer-events-none disabled:opacity-60"
                style={{ background: "var(--accent-grad)", color: "#061021" }}
              >
                {importing ? "Importando..." : "Comenzar Importación"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
