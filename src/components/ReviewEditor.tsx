"use client";

import { useState, useTransition } from "react";
import { submitExpressReviewAction } from "@/app/actions";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { Stars } from "@/components/Stars";

/**
 * Selector de estrellas para la reseña express: mismo eje de 1 a 5 que
 * `RatingStars` (biblioteca) y que la media de la comunidad, pero sin
 * enviar en cada click — aquí el voto se guarda junto al texto al pulsar
 * "Publicar", no antes.
 */
function SelectorEstrellas({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          onMouseEnter={() => setHover(n)}
          className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
          aria-label={`Puntuar con ${n} de 5 estrellas`}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill={(hover || value) >= n ? "#e2b53e" : "none"}
            stroke={(hover || value) >= n ? "#e2b53e" : "var(--muted)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function ReviewEditor({ 
  gameId, 
  initialReview, 
  initialRating 
}: { 
  gameId: string; 
  initialReview?: string | null; 
  initialRating?: number | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(initialRating ?? 0);
  const [review, setReview] = useState(initialReview || "");
  const [isSaving, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await submitExpressReviewAction(gameId, rating, review);
      setIsEditing(false);
    });
  };

  if (!isEditing && !initialReview && !initialRating) {
    return (
      <button 
        onClick={() => setIsEditing(true)}
        className="w-full py-4 text-sm font-semibold border-2 border-dashed rounded-xl border-border hover:border-[rgb(var(--accent-rgb))] hover:text-[rgb(var(--accent-rgb))] text-muted transition-colors"
      >
        + Escribir reseña express y dar nota
      </button>
    );
  }

  if (!isEditing && (initialReview || initialRating)) {
    return (
      <div className="p-5 border rounded-xl bg-surface border-border relative group">
        <button 
          onClick={() => setIsEditing(true)}
          className="absolute top-4 right-4 text-xs font-semibold text-muted opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
        >
          Editar
        </button>
        <div className="flex gap-2 mb-3 items-center">
          <span className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--accent-rgb))]">Tu Reseña</span>
          {initialRating ? <Stars value={initialRating} /> : null}
        </div>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap italic">
          &quot;{initialReview}&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 border shadow-lg rounded-xl bg-surface border-[rgb(var(--accent-rgb)/0.3)]">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[rgb(var(--accent-rgb))]">Reseña Express</h3>
      
      <div className="mb-4">
        <label className="text-sm font-bold block mb-2">Tu nota</label>
        <SelectorEstrellas value={rating} onChange={setRating} />
      </div>

      <label className="text-sm font-bold block mb-2">Comentario breve</label>
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        maxLength={250}
        placeholder="¿Qué te pareció el juego?"
        className="w-full h-24 p-3 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:border-[rgb(var(--accent-rgb))] transition-all"
      />
      <div className="text-right text-xs text-muted mt-1 mb-4">
        {review.length}/250
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex gap-2 ml-auto">
          <button 
            onClick={() => {
              setReview(initialReview || "");
              setRating(initialRating ?? 0);
              setIsEditing(false);
            }} 
            className="px-4 py-2 text-sm font-semibold text-muted hover:text-white"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving || (rating === 0 && !review.trim())}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-[rgb(var(--accent-rgb))] text-black shadow-md disabled:opacity-50 transition-all hover:bg-[rgb(var(--accent-rgb)/0.8)]"
          >
            {isSaving ? "Guardando..." : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
