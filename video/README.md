# Vídeo de promoción de Paragon (Remotion)

Vídeo vertical para TikTok / Reels / Shorts: 1080 × 1920, 30 fps, 27 s, sin
música (en TikTok se le pone un sonido de moda al subirlo).

Escenas (`src/PromoTikTok.tsx`): el gancho ("¿Tus trofeos están
repartidos?"), la marca, la web como se ve en un PC (el perfil de ejemplo
haciendo scroll), dos pantallas reales del móvil (la ficha con el diario del
platino y su gráfica), las funciones y el cierre con la dirección.

Todo lo que sale son capturas reales, en `public/capturas/`:
- `perfil-pc.png`: la página `/ejemplo` de la web a 1280 px de ancho (los
  mismos componentes que un perfil de verdad, con datos de ejemplo). Se
  rehace con `npm run capturas` y la web arrancada (`BASE=http://localhost:3100`
  con `npx next start -p 3100` en la raíz, o la de producción); escribe
  también `src/medidas.json`.
- `app-ficha-diario.jpg` y `app-grafica-platino.jpg`: capturas del móvil.
  Para cambiarlas, poner otras con el mismo nombre (proporción de iPhone).

Fuentes: Chakra Petch y Barlow, las mismas de la web (`public/fuentes/`).

```bash
npm install
npm run studio          # para verlo y retocarlo en el navegador
npx remotion render src/index.ts PromoTikTok out/paragon-tiktok.mp4 --crf=18
```

En la nube de Claude, con `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`.
