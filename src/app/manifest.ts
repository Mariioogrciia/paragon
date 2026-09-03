import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Paragon',
    short_name: 'Paragon',
    description: 'Tu progreso de trofeos y logros multiplataforma, en un solo sitio.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0e1217',
    theme_color: '#0e1217',
    icons: [
      {
        src: '/logo.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
      },
      {
        src: '/logo.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  };
}
