import { MatchingAlgorithm } from "../matching";
import type {
  TutorProfile,
  AnimalProfile,
  MatchingRule,
} from "@ong-matching-animal/shared/types";

describe("MatchingAlgorithm", () => {
  let algorithm: MatchingAlgorithm;

  beforeEach(() => {
    algorithm = new MatchingAlgorithm();
  });

  describe("calculateScore", () => {
    it("should calculate match result with score", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "João Silva",
        location: { lat: -23.5505, lng: -46.6333 },
        custom_fields: {
          pref_energia: "alto",
          tem_criancas: false,
          tamanho_casa: "casa_quintal_grande",
        },
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Rex",
        species: "Cachorro",
        location: { lat: -23.5505, lng: -46.6333 },
        custom_fields: {
          nivel_energia: "alto",
          aceita_criancas: true,
          espaco_necessario: "casa_quintal_grande",
        },
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Compatibilidade de Energia",
          tutor_field: "pref_energia",
          animal_field: "nivel_energia",
          comparison_operator: "=",
          weight: 50,
          is_active: true,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result).toHaveProperty("animal_id");
      expect(result).toHaveProperty("animal_name");
      expect(result).toHaveProperty("compatibility_score");
      expect(result).toHaveProperty("matched_rules");
      expect(result).toHaveProperty("details");
      expect(result.animal_id).toBe("animal1");
      expect(result.animal_name).toBe("Rex");
      expect(result.compatibility_score).toBe(50);
      expect(result.matched_rules).toContain("rule1");
    });

    it("should return high score for perfect match", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Maria",
        location: { lat: -23.5505, lng: -46.6333 },
        custom_fields: {
          pref_energia: "alto",
          tamanho_casa: "casa_quintal_grande",
        },
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Buddy",
        species: "Cachorro",
        location: { lat: -23.5505, lng: -46.6333 },
        custom_fields: {
          nivel_energia: "alto",
          espaco_necessario: "casa_quintal_grande",
        },
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Compatibilidade de Energia",
          tutor_field: "pref_energia",
          animal_field: "nivel_energia",
          comparison_operator: "=",
          weight: 50,
          is_active: true,
        },
        {
          id: "rule2",
          rule_name: "Compatibilidade de Espaço",
          tutor_field: "tamanho_casa",
          animal_field: "espaco_necessario",
          comparison_operator: "=",
          weight: 50,
          is_active: true,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result.compatibility_score).toBe(100);
      expect(result.matched_rules.length).toBe(2);
    });

    it("should disqualify animal when a dealbreaker rule fails", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Ana",
        location: { lat: -23.5505, lng: -46.6333 },
        custom_fields: {
          aceita_gato: true,
        },
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Thor",
        species: "Cachorro",
        location: { lat: -23.5505, lng: -46.6333 },
        custom_fields: {
          convive_com_gatos: false,
        },
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Convivencia com gatos",
          tutor_field: "aceita_gato",
          animal_field: "convive_com_gatos",
          comparison_operator: "=",
          weight: 100,
          is_dealbreaker: true,
          is_active: true,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result.compatibility_score).toBe(0);
      expect(result.details[0]).toHaveProperty("is_dealbreaker", true);
      expect(result.details[0]).toHaveProperty("matched", false);
    });

    it("should handle empty rules array", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "João",
        location: { lat: -23.5505, lng: -46.6333 },
        custom_fields: {
          pref_energia: "baixo",
          tamanho_casa: "apartamento",
        },
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Whiskers",
        species: "Gato",
        location: { lat: -23.5505, lng: -46.6333 },
        custom_fields: {
          nivel_energia: "baixo",
          espaco_necessario: "apartamento",
        },
      };

      const result = algorithm.calculateScore(tutor, animal, []);

      expect(result.compatibility_score).toBe(0);
      expect(result.matched_rules).toEqual([]);
    });

    it("should handle inactive rules", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          pref_energia: "alto",
        },
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Animal",
        species: "Cachorro",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          nivel_energia: "alto",
        },
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Inactive Rule",
          tutor_field: "pref_energia",
          animal_field: "nivel_energia",
          comparison_operator: "=",
          weight: 50,
          is_active: false,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result.compatibility_score).toBe(0);
      expect(result.matched_rules).toEqual([]);
    });

    it("should handle missing fields in custom_fields", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: {},
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Animal",
        species: "Cachorro",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          nivel_energia: "alto",
        },
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Energy Match",
          tutor_field: "pref_energia",
          animal_field: "nivel_energia",
          comparison_operator: "=",
          weight: 50,
          is_active: true,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result.compatibility_score).toBe(0);
      expect(result.matched_rules).toEqual([]);
      expect(result.details[0].matched).toBe(false);
    });

    it("should handle >= operator for energy levels", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          pref_energia: "medio",
        },
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Animal",
        species: "Cachorro",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          nivel_energia: "baixo",
        },
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Energy Compatibility",
          tutor_field: "pref_energia",
          animal_field: "nivel_energia",
          comparison_operator: ">=",
          weight: 50,
          is_active: true,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result.compatibility_score).toBe(50);
      expect(result.matched_rules).toContain("rule1");
    });

    it("should handle <= operator for energy levels", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          pref_energia: "baixo",
        },
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Animal",
        species: "Cachorro",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          nivel_energia: "alto",
        },
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Energy Compatibility",
          tutor_field: "pref_energia",
          animal_field: "nivel_energia",
          comparison_operator: "<=",
          weight: 50,
          is_active: true,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result.compatibility_score).toBe(50);
      expect(result.matched_rules).toContain("rule1");
    });

    it("should handle contains operator for string fields", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          preferencias: "gato, coelho, passaro",
        },
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Animal",
        species: "Gato",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          estilo: "gato",
        },
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Type Preference",
          tutor_field: "preferencias",
          animal_field: "estilo",
          comparison_operator: "contains",
          weight: 50,
          is_active: true,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result.compatibility_score).toBe(50);
      expect(result.matched_rules).toContain("rule1");
    });

    it("should handle unknown comparison operator with warning", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          test_field: "value",
        },
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Animal",
        species: "Cachorro",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          test_field: "value",
        },
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Unknown Operator",
          tutor_field: "test_field",
          animal_field: "test_field",
          comparison_operator: "unknown_op" as any,
          weight: 50,
          is_active: true,
        },
      ];

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result.compatibility_score).toBe(0);
      expect(result.matched_rules).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Comparador desconhecido")
      );

      consoleSpy.mockRestore();
    });

    it("should handle numeric values in custom_fields", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          idade_minima: 2,
        },
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Animal",
        species: "Cachorro",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          idade: 5,
        },
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Age Match",
          tutor_field: "idade_minima",
          animal_field: "idade",
          comparison_operator: "<=",
          weight: 50,
          is_active: true,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result.compatibility_score).toBe(50);
      expect(result.matched_rules).toContain("rule1");
    });

    it("should handle both fields missing in custom_fields", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: {},
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Animal",
        species: "Cachorro",
        location: { lat: 0, lng: 0 },
        custom_fields: {},
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Missing Both",
          tutor_field: "missing_field",
          animal_field: "missing_field",
          comparison_operator: "=",
          weight: 50,
          is_active: true,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result.compatibility_score).toBe(0);
      expect(result.matched_rules).toEqual([]);
      expect(result.details[0].matched).toBe(false);
    });

    it("should handle animal field missing in custom_fields", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          pref_energia: "alto",
        },
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Animal",
        species: "Cachorro",
        location: { lat: 0, lng: 0 },
        custom_fields: {},
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Animal Field Missing",
          tutor_field: "pref_energia",
          animal_field: "nivel_energia",
          comparison_operator: "=",
          weight: 50,
          is_active: true,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result.compatibility_score).toBe(0);
      expect(result.matched_rules).toEqual([]);
      expect(result.details[0].matched).toBe(false);
    });

    it("should handle contains operator with non-string values", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          preferencias: 123,
        },
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Animal",
        species: "Cachorro",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          tipos_aceitaveis: "gato, coelho",
        },
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Non-String Contains",
          tutor_field: "preferencias",
          animal_field: "tipos_aceitaveis",
          comparison_operator: "contains",
          weight: 50,
          is_active: true,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result.compatibility_score).toBe(0);
      expect(result.matched_rules).toEqual([]);
    });

    it("should map all energy and size levels correctly", () => {
      const testCases = [
        {
          tutor_val: "baixo",
          animal_val: "baixo",
          operator: "=" as const,
          should_match: true,
        },
        {
          tutor_val: "medio",
          animal_val: "baixo",
          operator: ">=" as const,
          should_match: true,
        },
        {
          tutor_val: "baixo",
          animal_val: "alto",
          operator: "<=" as const,
          should_match: true,
        },
        {
          tutor_val: "casa_quintal_pequeno",
          animal_val: "apartamento",
          operator: ">=" as const,
          should_match: true,
        },
      ];

      testCases.forEach((testCase) => {
        const tutor: TutorProfile = {
          id: "tutor",
          name: "Test",
          location: { lat: 0, lng: 0 },
          custom_fields: { test_field: testCase.tutor_val },
        };

        const animal: AnimalProfile = {
          id: "animal",
          owner_id: "owner",
          name: "Test Animal",
          species: "Cachorro",
          location: { lat: 0, lng: 0 },
          custom_fields: { test_field: testCase.animal_val },
        };

        const rules: MatchingRule[] = [
          {
            id: "rule1",
            rule_name: "Test",
            tutor_field: "test_field",
            animal_field: "test_field",
            comparison_operator: testCase.operator,
            weight: 50,
            is_active: true,
          },
        ];

        const result = algorithm.calculateScore(tutor, animal, rules);

        if (testCase.should_match) {
          expect(result.compatibility_score).toBe(50);
          expect(result.matched_rules).toContain("rule1");
        } else {
          expect(result.compatibility_score).toBe(0);
        }
      });
    });

    it("should handle unknown energy levels as 0", () => {
      const tutor: TutorProfile = {
        id: "tutor",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: { test_field: "unknown_level" },
      };

      const animal: AnimalProfile = {
        id: "animal",
        owner_id: "owner",
        name: "Test Animal",
        species: "Cachorro",
        location: { lat: 0, lng: 0 },
        custom_fields: { test_field: "another_unknown" },
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Unknown levels",
          tutor_field: "test_field",
          animal_field: "test_field",
          comparison_operator: "=",
          weight: 50,
          is_active: true,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result.compatibility_score).toBe(0);
      expect(result.matched_rules).toEqual([]);
    });

    it("should handle non-string/non-number values in string conversion", () => {
      const tutor: TutorProfile = {
        id: "tutor",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: { test_field: true },
      };

      const animal: AnimalProfile = {
        id: "animal",
        owner_id: "owner",
        name: "Test Animal",
        species: "Cachorro",
        location: { lat: 0, lng: 0 },
        custom_fields: { test_field: false },
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Boolean values",
          tutor_field: "test_field",
          animal_field: "test_field",
          comparison_operator: ">=",
          weight: 50,
          is_active: true,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      // Both true (treated as 0) and false (treated as 0) should match 0 >= 0
      expect(result.compatibility_score).toBe(50);
    });

    it("should return details for all evaluated rules", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          pref_energia: "alto",
          tamanho_casa: "apartamento",
        },
      };

      const animal: AnimalProfile = {
        id: "animal1",
        owner_id: "owner1",
        name: "Animal",
        species: "Cachorro",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          nivel_energia: "baixo",
          espaco_necessario: "apartamento",
        },
      };

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Energy",
          tutor_field: "pref_energia",
          animal_field: "nivel_energia",
          comparison_operator: "=",
          weight: 30,
          is_active: true,
        },
        {
          id: "rule2",
          rule_name: "Space",
          tutor_field: "tamanho_casa",
          animal_field: "espaco_necessario",
          comparison_operator: "=",
          weight: 40,
          is_active: true,
        },
      ];

      const result = algorithm.calculateScore(tutor, animal, rules);

      expect(result.details).toHaveLength(2);
      expect(result.details[0]).toEqual({
        rule_id: "rule1",
        rule_name: "Energy",
        matched: false,
        weight: 30,
      });
      expect(result.details[1]).toEqual({
        rule_id: "rule2",
        rule_name: "Space",
        matched: true,
        weight: 40,
      });
    });
  });

  describe("findBestMatches", () => {
    it("should return array of match results sorted by score", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Carlos",
        location: { lat: -23.5505, lng: -46.6333 },
        custom_fields: {
          pref_energia: "alto",
          tamanho_casa: "casa_quintal_grande",
        },
      };

      const animals: AnimalProfile[] = [
        {
          id: "animal1",
          owner_id: "owner1",
          name: "Rex",
          species: "Cachorro",
          location: { lat: -23.5505, lng: -46.6333 },
          custom_fields: {
            nivel_energia: "alto",
            espaco_necessario: "casa_quintal_grande",
          },
        },
        {
          id: "animal2",
          owner_id: "owner1",
          name: "Whiskers",
          species: "Gato",
          location: { lat: -23.5505, lng: -46.6333 },
          custom_fields: {
            nivel_energia: "baixo",
            espaco_necessario: "apartamento",
          },
        },
      ];

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Compatibilidade de Energia",
          tutor_field: "pref_energia",
          animal_field: "nivel_energia",
          comparison_operator: "=",
          weight: 50,
          is_active: true,
        },
      ];

      const matches = algorithm.findBestMatches(tutor, animals, rules);

      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);
      if (matches.length > 1) {
        expect(matches[0].compatibility_score).toBeGreaterThanOrEqual(
          matches[1].compatibility_score
        );
      }
    });

    it("should return empty array for empty animals list", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Ana",
        location: { lat: -23.5505, lng: -46.6333 },
        custom_fields: {
          pref_energia: "baixo",
        },
      };

      const rules: MatchingRule[] = [];

      const matches = algorithm.findBestMatches(tutor, [], rules);

      expect(matches).toEqual([]);
    });

    it("should respect limit parameter", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Test User",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          pref_energia: "alto",
        },
      };

      const animals: AnimalProfile[] = Array.from({ length: 20 }, (_, i) => ({
        id: `animal${i}`,
        owner_id: "owner1",
        name: `Animal ${i}`,
        species: "Cachorro",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          nivel_energia: "alto",
        },
      }));

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Energy Match",
          tutor_field: "pref_energia",
          animal_field: "nivel_energia",
          comparison_operator: "=",
          weight: 50,
          is_active: true,
        },
      ];

      const matches = algorithm.findBestMatches(tutor, animals, rules, 5);

      expect(matches.length).toBeLessThanOrEqual(5);
    });

    it("should keep zero-score matches when no dealbreaker fails", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          pref_energia: "alto",
        },
      };

      const animals: AnimalProfile[] = [
        {
          id: "animal1",
          owner_id: "owner1",
          name: "Match Animal",
          species: "Cachorro",
          location: { lat: 0, lng: 0 },
          custom_fields: {
            nivel_energia: "alto",
          },
        },
        {
          id: "animal2",
          owner_id: "owner1",
          name: "No Match Animal",
          species: "Gato",
          location: { lat: 0, lng: 0 },
          custom_fields: {
            nivel_energia: "baixo",
          },
        },
      ];

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Energy",
          tutor_field: "pref_energia",
          animal_field: "nivel_energia",
          comparison_operator: "=",
          weight: 50,
          is_active: true,
        },
      ];

      const matches = algorithm.findBestMatches(tutor, animals, rules);

      expect(matches.length).toBe(2);
      expect(matches[0].animal_id).toBe("animal1");
      expect(matches[1].animal_id).toBe("animal2");
      expect(matches[1].compatibility_score).toBe(0);
    });

    it("should sort matches by score in descending order", () => {
      const tutor: TutorProfile = {
        id: "tutor1",
        name: "Test",
        location: { lat: 0, lng: 0 },
        custom_fields: {
          pref_energia: "alto",
          tamanho_casa: "casa_quintal_grande",
        },
      };

      const animals: AnimalProfile[] = [
        {
          id: "animal1",
          owner_id: "owner1",
          name: "One Match",
          species: "Cachorro",
          location: { lat: 0, lng: 0 },
          custom_fields: {
            nivel_energia: "alto",
            espaco_necessario: "apartamento",
          },
        },
        {
          id: "animal2",
          owner_id: "owner1",
          name: "Two Matches",
          species: "Cachorro",
          location: { lat: 0, lng: 0 },
          custom_fields: {
            nivel_energia: "alto",
            espaco_necessario: "casa_quintal_grande",
          },
        },
      ];

      const rules: MatchingRule[] = [
        {
          id: "rule1",
          rule_name: "Energy",
          tutor_field: "pref_energia",
          animal_field: "nivel_energia",
          comparison_operator: "=",
          weight: 50,
          is_active: true,
        },
        {
          id: "rule2",
          rule_name: "Space",
          tutor_field: "tamanho_casa",
          animal_field: "espaco_necessario",
          comparison_operator: "=",
          weight: 50,
          is_active: true,
        },
      ];

      const matches = algorithm.findBestMatches(tutor, animals, rules);

      expect(matches[0].animal_id).toBe("animal2");
      expect(matches[0].compatibility_score).toBe(100);
      expect(matches[1].animal_id).toBe("animal1");
      expect(matches[1].compatibility_score).toBe(50);
    });
  });

  describe("filterByDistance", () => {
    it("should filter animals by distance radius", () => {
      const tutorLocation = { lat: -23.5505, lng: -46.6333 };

      const animals: AnimalProfile[] = [
        {
          id: "animal1",
          owner_id: "owner1",
          name: "Close Animal",
          species: "Cachorro",
          location: { lat: -23.5505, lng: -46.6333 },
          custom_fields: {},
        },
        {
          id: "animal2",
          owner_id: "owner1",
          name: "Far Animal",
          species: "Gato",
          location: { lat: 0, lng: 0 },
          custom_fields: {},
        },
      ];

      const filtered = algorithm.filterByDistance(tutorLocation, animals, 50);

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((a) => a.id === "animal1")).toBe(true);
    });

    it("should use default radius of 50km", () => {
      const tutorLocation = { lat: -23.5505, lng: -46.6333 };

      const animals: AnimalProfile[] = [
        {
          id: "animal1",
          owner_id: "owner1",
          name: "Animal",
          species: "Cachorro",
          location: { lat: -23.5505, lng: -46.6333 },
          custom_fields: {},
        },
      ];

      const filtered = algorithm.filterByDistance(tutorLocation, animals);

      expect(filtered.length).toBeGreaterThan(0);
    });

    it("should exclude animals outside radius", () => {
      const tutorLocation = { lat: -23.5505, lng: -46.6333 };

      const animals: AnimalProfile[] = [
        {
          id: "animal1",
          owner_id: "owner1",
          name: "Very Far Animal",
          species: "Cachorro",
          location: { lat: 0, lng: 0 },
          custom_fields: {},
        },
      ];

      const filtered = algorithm.filterByDistance(tutorLocation, animals, 1);

      expect(filtered.length).toBe(0);
    });

    it("should handle empty animals array", () => {
      const tutorLocation = { lat: -23.5505, lng: -46.6333 };

      const filtered = algorithm.filterByDistance(tutorLocation, [], 50);

      expect(filtered).toEqual([]);
    });

    it("should calculate distance correctly", () => {
      const tutorLocation = { lat: -23.5505, lng: -46.6333 };

      const animals: AnimalProfile[] = [
        {
          id: "animal1",
          owner_id: "owner1",
          name: "Animal",
          species: "Cachorro",
          location: { lat: -23.5505, lng: -46.6333 },
          custom_fields: {},
        },
      ];

      // Same location should have distance 0
      const filtered = algorithm.filterByDistance(tutorLocation, animals, 0);

      expect(filtered.length).toBe(1);
    });
  });
});
