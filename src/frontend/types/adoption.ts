export type DashboardStatus = "ready" | "loading" | "empty" | "error";

export interface PetProfile {
  id: string;
  name: string;
  age: number;
  verified: boolean;
  photoUrl: string;
  traits: string[];
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: "discover" | "messages" | "profile";
  active?: boolean;
  notification?: boolean;
}
