import { getTranslations } from "next-intl/server";
import { Heart } from "lucide-react";
import { auth } from "@/auth";
import { BackButton } from "@/components/BackButton";
import { esApoyo } from "@/lib/apoyo";
import { metaPublica } from "@/lib/seo";

export const metadata = metaPublica("/apoyar", "Apoya Paragon · Paragon+", "Paragon es un proyecto personal sin anuncios. Si te sirve, puedes apoyarlo y llevar la insignia Paragon+ en tu perfil.");

/** Paragon+ (lib/apoyo.ts): qué es, el botón de Ko-fi y si ya lo tienes. */
export default async function ApoyarPage() {
  const t = await getTranslations("Perfil.Apoyo");
  const session = await auth();
  const activo = session?.user?.id ? await esApoyo(session.user.id) : false;
  const kofi = process.env.NEXT_PUBLIC_KOFI_URL;

  return (
    <div className="mx-auto max-w-[680px] px-6 py-12">
      <BackButton fallbackHref="/" />
      <h1 className="font-heading mt-4 text-[clamp(1.75rem,5vw,2.5rem)] font-bold uppercase leading-tight">{t("titulo")}</h1>
      <p className="mt-3 text-muted">{t("descripcion")}</p>

      <ul className="mt-6 flex flex-col gap-2 text-sm">
        {(["insignia", "sinAnuncios", "todoGratis"] as const).map((k) => (
          <li key={k} className="flex items-start gap-2 rounded-[12px] border border-border bg-surface px-4 py-3">
            <Heart size={16} className="mt-0.5 shrink-0" style={{ color: "#c084fc" }} aria-hidden />
            <span>{t(`ventaja.${k}`)}</span>
          </li>
        ))}
      </ul>

      {activo && <p className="mt-6 rounded-[12px] px-4 py-3 text-sm font-semibold" style={{ background: "rgb(192 132 252 / 0.12)", border: "1px solid rgb(192 132 252 / 0.35)" }}>{t("yaApoyas")}</p>}

      {kofi ? (
        <>
          <a
            href={kofi}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-[12px] px-5 py-3 font-bold text-white transition-all hover:-translate-y-0.5 hover:brightness-110"
            style={{ background: "#7c3aed" }}
          >
            <Heart size={16} /> {t("boton")}
          </a>
          <p className="mt-3 text-xs text-muted">{t("comoSeAsocia")}</p>
        </>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-border bg-surface p-5 text-sm text-muted">{t("prontoDisponible")}</p>
      )}
    </div>
  );
}
