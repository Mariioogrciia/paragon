import { FichaJuego, metadatosFichaJuego } from "@/components/paginas/FichaJuego";

export const generateMetadata = metadatosFichaJuego;

export default async function JuegoGlobalPage({ params }: { params: Promise<{ id: string }> }) {
  return <FichaJuego params={params} />;
}
