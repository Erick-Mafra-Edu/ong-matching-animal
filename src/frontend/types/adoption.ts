export type DashboardStatus = "ready" | "loading" | "empty" | "error";

export interface PetProfile {
  id: string;
  name: string;
  age: number;
  verified: boolean;
  photoUrl: string;
  photoUrls?: string[];
  traits: string[];
}

export interface AnimalPhoto {
  id: string;
  animal_id: string;
  bucket_id: string;
  storage_path: string;
  public_url: string;
  content_type: string;
  size_bytes: number;
  is_primary: boolean;
  created_at?: string;
}

export interface AnimalListItem extends PetProfile {
  owner_id?: string;
  species: string;
  custom_fields?: Record<string, unknown>;
  photos?: AnimalPhoto[];
  created_at?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: "discover" | "interests" | "messages" | "profile" | "admin";
  active?: boolean;
  href?: string;
  notification?: boolean;
}
