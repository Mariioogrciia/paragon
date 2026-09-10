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
    // Accesos directos al mantener pulsado el icono de la app en el móvil.
    // Un shortcut solo puede apuntar a una URL fija, no a "el juego que
    // sea" — por eso "Continuar juego anclado" pasa por /enfoque (resuelve
    // el anclado de quien haya iniciado sesión) en vez de enlazar un
    // gameId concreto, que sería el de quien compiló esto, no el tuyo.
    shortcuts: [
      {
        name: 'Continuar juego anclado',
        short_name: 'Continuar',
        description: 'Tu Modo Enfoque del juego que tienes anclado ahora mismo.',
        url: '/enfoque',
        icons: [{ src: '/logo.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Sugerencia para hoy',
        short_name: 'Hoy',
        description: 'Qué puedes cerrar hoy según el tiempo que tengas.',
        url: '/?tab=actividad',
        icons: [{ src: '/logo.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
