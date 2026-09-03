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
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-left transition-colors focus:border-accent focus:outline-none hover:border-white/20"
      >
        <span className={selectedOption ? "text-foreground" : "text-muted"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
            className="absolute left-0 top-full z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#0a0a0a] shadow-2xl"
          >
            <ul className="p-1">
              {options.map((option) => {
                const isSelected = option.value === internalValue;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                        isSelected
                          ? "bg-[var(--accent-grad)] text-white font-semibold"
                          : "text-muted hover:bg-white/5 hover:text-foreground"
                      }`}
                      style={isSelected ? { background: "var(--accent-grad)", color: "#061021" } : {}}
                    >
                      {option.label}
                    </button>
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
