"use client";

import { useState, useTransition } from "react";
import { submitExpressReviewAction } from "@/app/actions";
import { format } from "date-fns";
import { Check } from "lucide-react";

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
          {initialRating ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-[rgb(var(--accent-rgb)/0.2)] text-[rgb(var(--accent-rgb))]">
              Nota: {initialRating}/10
            </span>
          ) : null}
        </div>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap italic">
          "{initialReview}"
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 border shadow-lg rounded-xl bg-surface border-[rgb(var(--accent-rgb)/0.3)]">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[rgb(var(--accent-rgb))]">Reseña Express</h3>
      
      <div className="mb-4">
        <label className="text-sm font-bold block mb-2">Tu nota (1-10)</label>
        <div className="flex flex-wrap gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setRating(val)}
              className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold transition-colors ${
                rating >= val
                  ? "bg-[rgb(var(--accent-rgb))] text-black"
                  : "bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.3)]"
              }`}
            >
              {val}
            </button>
          ))}
        </div>
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
