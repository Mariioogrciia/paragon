export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const BADGES: Record<string, Badge> = {
  first_link: {
    id: "first_link",
    name: "Cazador Novato",
    description: "Vinculaste tu primera plataforma de juegos.",
    icon: "link",
    color: "#4ec98a",
  },
  first_platinum: {
    id: "first_platinum",
    name: "La Primera Joya",
    description: "Conseguiste tu primer trofeo de Platino rastreado en Paragon.",
    icon: "gem",
    color: "#9fd4ec",
  },
  streak_7: {
    id: "streak_7",
    name: "Imparable",
    description: "Mantuviste una racha de 7 días consiguiendo logros.",
    icon: "flame",
    color: "#e2b53e",
  },
  reviewer: {
    id: "reviewer",
    name: "Crítico Experto",
    description: "Dejaste tu primera reseña express.",
    icon: "pen",
    color: "#b9c2cc",
  },
  socializer: {
    id: "socializer",
    name: "Socializador",
    description: "Añadiste a tu primer amigo a la lista de rivales.",
    icon: "handshake",
    color: "#c07b4a",
  },
};
