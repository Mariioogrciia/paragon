"use client";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="mb-6 rounded-full bg-accent/10 p-6">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m2 2 20 20" />
          <path d="M8.53 8.53C5.52 9.69 2.94 11.59 1 14c3 3.68 7.37 5.86 11 5.96" />
          <path d="M16.94 16.94c2.51-1.39 4.7-3.37 6.06-5.94C20.65 8.1 16.73 5.59 12 5.59c-1.38 0-2.69.25-3.92.7" />
        </svg>
      </div>
      <h1 className="font-heading text-3xl font-bold uppercase mb-2">Estás sin conexión</h1>
      <p className="text-muted max-w-md">
        Parece que no tienes internet. Paragon funciona mejor con conexión para mantener sincronizados tus trofeos y logros.
      </p>
      <button 
        onClick={() => typeof window !== 'undefined' && window.location.reload()}
        className="mt-8 rounded-lg px-6 py-2.5 font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-lg"
        style={{ background: "var(--accent-grad)" }}
      >
        Reintentar
      </button>
    </div>
  );
}
