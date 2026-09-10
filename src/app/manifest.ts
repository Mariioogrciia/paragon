import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Paragon',
    short_name: 'Paragon',
    description: 'Tu progreso de trofeos y logros multiplataforma, en un solo sitio.',
    start_url: '/',
    display: 'standalone',
    // Mismo valor que `--background` del tema oscuro (globals.css) — antes
    // difería un pelín (#0e1217 vs #0a0d13 real), así que la pantalla de
    // splash al abrir el PWA se veía de un tono ligerísimamente distinto al
    // de la propia app un instante después.
    background_color: '#0a0d13',
    theme_color: '#0a0d13',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
