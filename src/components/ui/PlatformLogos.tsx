import React from "react";
import { FaPlaystation, FaSteam, FaXbox, FaGooglePlay } from "react-icons/fa6";
import { BsNintendoSwitch } from "react-icons/bs";
import { SiEpicgames, SiUbisoft } from "react-icons/si";

export function PlayStationLogo(props: React.SVGProps<SVGSVGElement>) {
  return <FaPlaystation {...(props as any)} />;
}

export function SteamLogo(props: React.SVGProps<SVGSVGElement>) {
  return <FaSteam {...(props as any)} />;
}

export function XboxLogo(props: React.SVGProps<SVGSVGElement>) {
  return <FaXbox {...(props as any)} />;
}

export function EpicGamesLogo(props: React.SVGProps<SVGSVGElement>) {
  return <SiEpicgames {...(props as any)} />;
}

export function UbisoftLogo(props: React.SVGProps<SVGSVGElement>) {
  return <SiUbisoft {...(props as any)} />;
}

export function NintendoLogo(props: React.SVGProps<SVGSVGElement>) {
  return <BsNintendoSwitch {...(props as any)} />;
}

export function GooglePlayLogo(props: React.SVGProps<SVGSVGElement>) {
  return <FaGooglePlay {...(props as any)} />;
}
