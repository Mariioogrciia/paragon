import type { IconBaseProps } from "react-icons";
import { FaPlaystation, FaSteam, FaXbox, FaGoogle, FaDiscord } from "react-icons/fa6";
import { BsNintendoSwitch } from "react-icons/bs";
import { SiEpicgames } from "react-icons/si";

export function PlayStationLogo(props: IconBaseProps) {
  return <FaPlaystation {...props} />;
}

export function SteamLogo(props: IconBaseProps) {
  return <FaSteam {...props} />;
}

export function XboxLogo(props: IconBaseProps) {
  return <FaXbox {...props} />;
}

export function NintendoLogo(props: IconBaseProps) {
  return <BsNintendoSwitch {...props} />;
}

export function EpicGamesLogo(props: IconBaseProps) {
  return <SiEpicgames {...props} />;
}

export function GoogleLogo(props: IconBaseProps) {
  return <FaGoogle {...props} />;
}

export function DiscordLogo(props: IconBaseProps) {
  return <FaDiscord {...props} />;
}
