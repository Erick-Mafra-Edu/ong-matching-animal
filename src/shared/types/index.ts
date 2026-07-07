/**
 * Tipos e interfaces compartilhadas entre Backend e Frontend
 * Localização: src/shared/types/index.ts
 */

/**
 * Localização geográfica (compatível com PostGIS)
 */
export interface Location {
  lng: number;
  lat: number;
}

/**
 * Perfil do Tutor (Usuário que busca um animal)
 * Estrutura flexível com campos dinâmicos para acomodar diferentes ONGs
 */
export interface TutorProfile {
  id: string; // UUID do Supabase
  auth_user_id?: string; // Referência ao usuário autenticado
  name: string;
  location: Location;
  custom_fields: {
    pref_energia?: "baixo" | "medio" | "alto";
    tem_criancas?: boolean;
    tamanho_casa?: "apartamento" | "casa_quintal_pequeno" | "casa_quintal_grande";
    [key: string]: any; // Permite campos dinâmicos futuros
  };
  created_at?: string;
}

/**
 * Perfil do Animal (O pet que será avaliado para match)
 * Estrutura flexível com campos dinâmicos
 */
export interface AnimalProfile {
  id: string; // UUID do Supabase
  owner_id: string; // Tutor/ONG que cadastrou
  name: string;
  species: string; // 'Cachorro', 'Gato', 'Coelho', 'Passaro'
  location: Location;
  custom_fields: {
    nivel_energia?: "baixo" | "medio" | "alto";
    aceita_criancas?: boolean;
    espaco_necessario?: "apartamento" | "casa_quintal_pequeno" | "casa_quintal_grande";
    [key: string]: any; // Permite novos atributos sem quebrar o código
  };
  created_at?: string;
}

/**
 * Regra de Matching (Fórmula do algoritmo)
 * Define como comparar campos do Tutor com campos do Animal
 */
export interface MatchingRule {
  id: string;
  rule_name: string; // Ex: "Compatibilidade de Energia"
  tutor_field: string; // Chave em TutorProfile.custom_fields
  animal_field: string; // Chave em AnimalProfile.custom_fields
  comparison_operator: "=" | "!=" | ">=" | "<=" | "contains";
  weight: number; // Pontos a somar se der match (30, 50, etc)
  is_dealbreaker?: boolean; // Se true, falhar nesta regra elimina o animal
  is_active: boolean;
  created_at?: string;
}

/**
 * Resultado de um match individual
 */
export interface MatchResult {
  animal_id: string;
  animal_name: string;
  compatibility_score: number; // Score total (0-500 ou mais)
  disqualified?: boolean; // True quando alguma regra dealbreaker falhou
  matched_rules: string[]; // IDs das regras que fizeram match
  details: {
    rule_id: string;
    rule_name: string;
    matched: boolean;
    weight: number;
    is_dealbreaker?: boolean;
  }[];
}

/**
 * Resposta da busca de matches para um tutor
 */
export interface MatchResponse {
  tutor_id: string;
  tutor_name: string;
  total_animals_evaluated: number;
  matches: MatchResult[];
  timestamp: string;
}

/**
 * Comparador de valores para matching
 */
export interface ComparatorFunction {
  (tutorValue: any, animalValue: any): boolean;
}
