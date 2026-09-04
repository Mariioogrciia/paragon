/**
 * Iconos de plataforma. No son el archivo de marca registrada de
 * Sony/Valve/Microsoft/Nintendo/Epic — no hay ninguno con licencia que
 * embeber aquí, y calcar el trazado vectorial exacto de un logo protegido
 * tiene un riesgo de marca real (mismo motivo por el que los banners de
 * plataforma en BannerPresets.tsx tampoco usan fotografía oficial). En su
 * lugar, cada icono usa el motivo visual más reconocible y menos
 * "logotipo registrado" de cada marca — los símbolos de los botones en
 * PlayStation (▲●✕■, de dominio tan común como el propio mando), el
 * anillo+engranaje de Steam, la esfera partida de Xbox, los dos Joy-Con de
 * Switch, la "E" de Epic — de forma que se reconozcan de un vistazo sin ser
 * el activo con copyright.
 */
import type { CSSProperties } from "react";

interface IconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/** Triángulo, círculo, equis y cuadrado — los cuatro símbolos del mando de PlayStation, en su disposición habitual. */
export function PlayStationIcon({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M6.4 3.6 9.6 9.4H3.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="17.8" cy="6.3" r="2.7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.6 15 9 20.4M9 15l-5.4 5.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="14.7" y="14.9" width="5.6" height="5.6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function SteamIcon({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14.6" cy="8.7" r="3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14.6" cy="8.7" r="1" fill="currentColor" />
      <circle cx="8.6" cy="15.2" r="2.1" fill="currentColor" />
      <path d="M8.6 15.2 12.4 11.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function XboxIcon({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6.2c2.2 3 4 5.4 6 5.4s3.8-2.4 6-5.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 17.8c2.2-3 4-5.4 6-5.4s3.8 2.4 6 5.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function NintendoIcon({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="3.5" y="2.5" width="7.4" height="19" rx="3.7" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13.1" y="2.5" width="7.4" height="19" rx="3.7" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7.2" cy="17.6" r="1.1" fill="currentColor" />
      <circle cx="16.8" cy="6.4" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function EpicGamesIcon({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M5 4.3h14v10.2c0 1.3-1 2.4-2.3 2.8L12 19.6l-4.7-2.3C6 16.9 5 15.8 5 14.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8.7 8h6.6M8.7 11.7h6.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
