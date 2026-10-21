import { PerfilJugador, metadatosPerfil } from "@/components/paginas/PerfilJugador";

export const generateMetadata = metadatosPerfil;

export default async function PerfilPage({ params }: { params: Promise<{ handle: string }> }) {
  return <PerfilJugador params={params} />;
}
