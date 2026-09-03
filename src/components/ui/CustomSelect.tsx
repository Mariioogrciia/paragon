"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  name?: string;
  options: Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomSelect({
  name,
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Selecciona una opción",
  className = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const containerRef = useRef<HTMLDivElement>(null);

  const isControlled = value !== undefined;
  const actualValue = isControlled ? value : internalValue;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === actualValue);

  function handleSelect(val: string) {
    if (!isControlled) {
      setInternalValue(val);
    }
    setIsOpen(false);
    if (onChange) {
      onChange(val);
    }
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {name && <input type="hidden" name={name} value={actualValue} />}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        // Mismo aspecto que Dropdown.tsx (biblioteca, comparadores,
        // planificador): antes este tenía su propio radio, borde y fondo, y
        // el desplegable de un sitio no se parecía al de otro.
        className="flex w-full items-center justify-between rounded-[9px] px-3.5 py-2 text-[13px] font-semibold text-foreground text-left transition-colors hover:border-accent/50"
        style={{ border: "1px solid var(--border)", background: "var(--background)" }}
      >
        <span className={selectedOption ? "text-foreground" : "text-muted"}>
          {selectedOption ? selectedOption.label : placeholder}
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
          className={`ml-2 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md shadow-lg"
            style={{ background: "var(--background)", border: "1px solid var(--border)" }}
          >
            <ul className="py-1">
              {options.map((option) => {
                const isSelected = option.value === internalValue;
                return (
                  <li
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={`cursor-pointer px-3.5 py-2 text-[13px] font-medium hover:bg-accent hover:text-white transition-colors ${
                      isSelected ? "bg-accent/30 text-accent" : "text-foreground"
                    }`}
                  >
                    {option.label}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
