"use client";

import { useState } from "react";
import { writeReviewAction } from "@/app/actions";
import { format } from "date-fns";

export function ReviewEditor({ 
  gameId, 
  initialReview, 
  initialDate 
}: { 
  gameId: string; 
  initialReview?: string; 
  initialDate?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [review, setReview] = useState(initialReview || "");
  const [date, setDate] = useState(initialDate ? initialDate.split("T")[0] : format(new Date(), "yyyy-MM-dd"));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await writeReviewAction(gameId, review, date);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing && !initialReview) {
    return (
      <button 
        onClick={() => setIsEditing(true)}
        className="w-full py-4 text-sm font-semibold border-2 border-dashed rounded-xl border-border hover:border-accent hover:text-accent text-muted transition-colors"
      >
        + Escribir reseña o añadir al diario
      </button>
    );
  }

  if (!isEditing && initialReview) {
    return (
      <div className="p-5 border rounded-xl bg-card border-border relative group">
        <button 
          onClick={() => setIsEditing(true)}
          className="absolute top-4 right-4 text-xs font-semibold text-muted opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
        >
          Editar
        </button>
        <div className="flex gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-widest text-accent">Diario</span>
          {initialDate && <span className="text-xs text-muted">{initialDate.split("T")[0]}</span>}
        </div>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap italic">
          "{initialReview}"
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 border shadow-lg rounded-xl bg-card border-accent/30">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-accent">Tu Reseña</h3>
      
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="¿Qué te pareció el juego?"
        className="w-full h-32 p-3 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
      />
      
      <div className="flex items-center gap-4 mt-4">
        <div>
          <label className="block mb-1 text-xs font-bold text-muted uppercase">Fecha de finalización</label>
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <button 
            onClick={() => {
              setReview(initialReview || "");
              setIsEditing(false);
            }} 
            className="px-4 py-2 text-sm font-semibold text-muted hover:text-foreground"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving || !review.trim()}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-accent text-white shadow-md disabled:opacity-50 transition-all hover:bg-accent/90"
          >
            {isSaving ? "Guardando..." : "Guardar reseña"}
          </button>
        </div>
      </div>
    </div>
  );
}
