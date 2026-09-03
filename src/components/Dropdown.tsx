"use client";

import { useState, useRef, useEffect } from "react";

export interface Option {
  value: string;
  label: string;
  count?: number;
}

interface DropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export function Dropdown({ value, onChange, options, placeholder = "Seleccionar...", className = "" }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full rounded-[9px] px-3.5 py-2 text-[13px] font-semibold text-foreground transition-colors"
        style={{
          border: "1px solid var(--border)",
          background: "var(--background)",
        }}
      >
        <span>
          {selectedOption ? (
            <>
              {selectedOption.label} {selectedOption.count !== undefined && <span className="text-muted ml-1">({selectedOption.count})</span>}
            </>
          ) : (
            placeholder
          )}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-md shadow-lg"
          style={{ background: "var(--background)", border: "1px solid var(--border)" }}
        >
          <ul className="max-h-60 overflow-auto py-1">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`cursor-pointer px-3.5 py-2 text-[13px] font-medium hover:bg-accent hover:text-white transition-colors ${
                    isSelected ? "bg-accent/30 text-accent" : "text-foreground"
                  }`}
                >
                  {option.label}
                  {option.count !== undefined && <span className="opacity-70 ml-1">({option.count})</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
