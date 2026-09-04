import type { CSSProperties } from "react";


interface IconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function PlayStationIcon({ size = 24, className, style }: IconProps) {
  return <img src="/logos/playstation.svg" alt="PlayStation" width={size} height={size} className={className} style={{ objectFit: 'contain', ...style }} />;
}

export function SteamIcon({ size = 24, className, style }: IconProps) {
  return <img src="/logos/steam.svg" alt="Steam" width={size} height={size} className={className} style={{ objectFit: 'contain', ...style }} />;
}

export function XboxIcon({ size = 24, className, style }: IconProps) {
  return <img src="/logos/xbox.svg" alt="Xbox" width={size} height={size} className={className} style={{ objectFit: 'contain', ...style }} />;
}

export function NintendoIcon({ size = 24, className, style }: IconProps) {
  return <img src="/logos/nintendo.svg" alt="Nintendo" width={size} height={size} className={className} style={{ objectFit: 'contain', ...style }} />;
}

export function EpicGamesIcon({ size = 24, className, style }: IconProps) {
  return <img src="/logos/epicgames.svg" alt="Epic Games" width={size} height={size} className={className} style={{ objectFit: 'contain', ...style }} />;
}

export function UbisoftIcon({ size = 24, className, style }: IconProps) {
  return <img src="/logos/ubisoft.svg" alt="Ubisoft" width={size} height={size} className={className} style={{ objectFit: 'contain', ...style }} />;
}
