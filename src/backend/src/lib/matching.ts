import {
  TutorProfile,
  AnimalProfile,
  MatchingRule,
  MatchResult,
  ComparatorFunction,
} from "@ong-matching-animal/shared/types";

/**
 * Classe responsável pelo cálculo de compatibilidade entre Tutores e Animais
 * Implementa a fórmula: Score = Σ (Match(Regra_i) ? Weight_i : 0)
 */
export class MatchingAlgorithm {
  /**
   * Comparadores de valores baseados no operador da regra
   */
  private comparators: Record<string, ComparatorFunction> = {
    "=": (tutor: unknown, animal: unknown) => tutor === animal,
    "!=": (tutor: unknown, animal: unknown) => tutor !== animal,
    ">=": (tutor: unknown, animal: unknown) => {
      const tutorNum = this.stringToNumber(tutor as string);
      const animalNum = this.stringToNumber(animal as string);
      return tutorNum >= animalNum;
    },
    "<=": (tutor: unknown, animal: unknown) => {
      const tutorNum = this.stringToNumber(tutor as string);
      const animalNum = this.stringToNumber(animal as string);
      return tutorNum <= animalNum;
    },
    contains: (tutor: unknown, animal: unknown) => {
      if (typeof tutor === "string" && typeof animal === "string") {
        return animal.includes(tutor);
      }
      return false;
    },
  };

  /**
   * Converte strings de energia/tamanho em números para comparação
   */
  private stringToNumber(value: any): number {
    const energyMap: Record<string, number> = {
      baixo: 1,
      medio: 2,
      alto: 3,
    };

    const sizeMap: Record<string, number> = {
      apartamento: 1,
      casa_quintal_pequeno: 2,
      casa_quintal_grande: 3,
    };

    if (typeof value === "number") return value;
    if (typeof value === "string") {
      return energyMap[value] ?? sizeMap[value] ?? 0;
    }
    return 0;
  }

  /**
   * Avalia se uma regra causa match entre tutor e animal
   */
  private evaluateRule(
    rule: MatchingRule,
    tutor: TutorProfile,
    animal: AnimalProfile
  ): boolean {
    const tutorValue = tutor.custom_fields[rule.tutor_field];
    const animalValue = animal.custom_fields[rule.animal_field];

    // Se algum valor está faltando, não há match
    if (tutorValue === undefined || animalValue === undefined) {
      return false;
    }

    const comparator = this.comparators[rule.comparison_operator];
    if (!comparator) {
      console.warn(
        `Comparador desconhecido: ${rule.comparison_operator}`
      );
      return false;
    }

    return comparator(tutorValue, animalValue);
  }

  /**
   * Calcula a compatibilidade entre um Tutor e um Animal
   * Fórmula: Score = Σ (Match(Regra_i) ? Weight_i : 0)
   */
  public calculateScore(
    tutor: TutorProfile,
    animal: AnimalProfile,
    rules: MatchingRule[]
  ): MatchResult {
    let totalScore = 0;
    const matchedRules: string[] = [];
    const details: MatchResult["details"] = [];

    for (const rule of rules) {
      if (!rule.is_active) continue;

      const isMatch = this.evaluateRule(rule, tutor, animal);
      const score = isMatch ? rule.weight : 0;

      totalScore += score;

      details.push({
        rule_id: rule.id,
        rule_name: rule.rule_name,
        matched: isMatch,
        weight: rule.weight,
      });

      if (isMatch) {
        matchedRules.push(rule.id);
      }
    }

    return {
      animal_id: animal.id,
      animal_name: animal.name,
      compatibility_score: totalScore,
      matched_rules: matchedRules,
      details,
    };
  }

  /**
   * Encontra os melhores matches para um tutor
   * Retorna resultados ordenados por score (decrescente)
   */
  public findBestMatches(
    tutor: TutorProfile,
    animals: AnimalProfile[],
    rules: MatchingRule[],
    limit: number = 10
  ): MatchResult[] {
    const matches = animals
      .map((animal) => this.calculateScore(tutor, animal, rules))
      .filter((match) => match.compatibility_score > 0)
      .sort((a, b) => b.compatibility_score - a.compatibility_score)
      .slice(0, limit);

    return matches;
  }

  /**
   * Filtra animals por distância geográfica (raio em km)
   */
  public filterByDistance(
    tutorLocation: { lng: number; lat: number },
    animals: AnimalProfile[],
    radiusKm: number = 50
  ): AnimalProfile[] {
    return animals.filter((animal) => {
      const distance = this.calculateDistance(
        tutorLocation.lat,
        tutorLocation.lng,
        animal.location.lat,
        animal.location.lng
      );
      return distance <= radiusKm;
    });
  }

  /**
   * Calcula distância entre dois pontos geográficos (Haversine formula)
   * Retorna distância em km
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Raio da Terra em km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
