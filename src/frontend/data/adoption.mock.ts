import type { NavigationItem, PetProfile } from "@/types/adoption";

export const featuredPet: PetProfile = {
  id: "yolo-26",
  name: "Yolo",
  age: 26,
  verified: true,
  photoUrl:
    "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=90",
  photoUrls: [
    "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=90",
    "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1200&q=90",
    "https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=1200&q=90",
    "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=1200&q=90",
  ],
  traits: [
    "Anime",
    "Online shopping",
    "Horror films",
    "Amateur cook",
    "Skincare",
  ],
};

export const navigationItems: NavigationItem[] = [
  { id: "discover", label: "Descobrir", icon: "discover", href: "/discover", active: true },
  { id: "interests", label: "Interesses", icon: "interests", href: "/interesses" },
  { id: "messages", label: "Mensagens", icon: "messages", notification: true },
  { id: "profile", label: "Perfil", icon: "profile" },
  { id: "admin", label: "Administração", icon: "admin", href: "/admin" },
];
