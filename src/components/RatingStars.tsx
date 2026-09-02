"use client";

import { useState } from "react";
import { rateGameAction } from "@/app/actions";

export function RatingStars({ gameId, initialRating = 0 }: { gameId: string; initialRating?: number }) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);

  const handleClick = (value: number) => {
    // Si pulsa la misma estrella, quitar rating (0)
    const newRating = value === rating ? 0 : value;
    setRating(newRating);
    rateGameAction(gameId, newRating);
  };

  return (
    <div 
      className="flex gap-1 items-center" 
      onClick={(e) => e.preventDefault()} // Prevenir que el click navegue si está dentro de un Link
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClick(star);
          }}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={(hover || rating) >= star ? "#e2b53e" : "transparent"}
            stroke={(hover || rating) >= star ? "#e2b53e" : "var(--muted)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-colors"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </button>
      ))}
    </div>
  );
}
