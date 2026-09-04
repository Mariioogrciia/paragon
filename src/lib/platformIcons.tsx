import type { CSSProperties } from "react";
import { FaPlaystation, FaXbox, FaSteam } from "react-icons/fa6";
import { BsNintendoSwitch } from "react-icons/bs";
import { SiEpicgames, SiUbisoft } from "react-icons/si";

interface IconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function PlayStationIcon({ size = 24, className, style }: IconProps) {
  return <FaPlaystation size={size} className={className} style={style} />;
}

export function SteamIcon({ size = 24, className, style }: IconProps) {
  return <FaSteam size={size} className={className} style={style} />;
}

export function XboxIcon({ size = 24, className, style }: IconProps) {
  return <FaXbox size={size} className={className} style={style} />;
}

export function NintendoIcon({ size = 24, className, style }: IconProps) {
  return <BsNintendoSwitch size={size} className={className} style={style} />;
}

export function EpicGamesIcon({ size = 24, className, style }: IconProps) {
  return <SiEpicgames size={size} className={className} style={style} />;
}

export function UbisoftIcon({ size = 24, className, style }: IconProps) {
  return <SiUbisoft size={size} className={className} style={style} />;
}
