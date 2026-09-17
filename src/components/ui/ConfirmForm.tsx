"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Envuelve una acción destructiva (borrar, quitar, salir, desvincular...)
 * con un paso de confirmación real — antes cualquiera de estas se
 * disparaba con un solo clic, sin ningún "¿seguro?" de por medio. El botón
 * visible NUNCA envía el formulario directamente: abre el modal, y solo el
 * botón de confirmar dentro de él llama a `requestSubmit()`.
 */
export function ConfirmForm({
  action,
  hidden,
  title,
  message,
  confirmLabel = "Sí, continuar",
  cancelLabel = "Cancelar",
  triggerClassName,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** Campos ocultos del formulario (leagueId, targetUserId...). */
  hidden?: Record<string, string>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  triggerClassName?: string;
  /** Contenido del botón que abre el modal — mismo texto/icono que ya tenía cada sitio. */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={action}>
        {hidden &&
          Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
          {children}
        </button>
      </form>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-sm rounded-2xl p-6"
              style={{ border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-heading text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-muted">{message}</p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold text-muted transition-colors hover:text-foreground"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    formRef.current?.requestSubmit();
                  }}
                  className="rounded-lg bg-danger px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  {confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
