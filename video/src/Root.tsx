import { Composition } from "remotion";
import { DURACION, FPS, PromoTikTok } from "./PromoTikTok";

/** Vídeo vertical para TikTok / Reels / Shorts: 1080 × 1920 a 30 fps. */
export const Root = () => (
  <Composition id="PromoTikTok" component={PromoTikTok} durationInFrames={DURACION} fps={FPS} width={1080} height={1920} />
);
