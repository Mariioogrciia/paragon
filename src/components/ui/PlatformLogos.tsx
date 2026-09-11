import React from "react";
import { FaPlaystation, FaSteam, FaXbox } from "react-icons/fa6";
import { BsNintendoSwitch } from "react-icons/bs";

export function PlayStationLogo(props: React.SVGProps<SVGSVGElement>) {
  return <FaPlaystation {...(props as any)} />;
}

export function SteamLogo(props: React.SVGProps<SVGSVGElement>) {
  return <FaSteam {...(props as any)} />;
}

export function XboxLogo(props: React.SVGProps<SVGSVGElement>) {
  return <FaXbox {...(props as any)} />;
}

export function NintendoLogo(props: React.SVGProps<SVGSVGElement>) {
  return <BsNintendoSwitch {...(props as any)} />;
}
