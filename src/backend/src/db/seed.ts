import { createClient } from "@supabase/supabase-js";
import { faker } from "@faker-js/faker/locale/pt_BR";
import type {
  TutorProfile,
  AnimalProfile,
  MatchingRule,
} from "@ong-matching-animal/shared/types";

// Validar variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios"
  );
  console.error("Configure-os no arquivo .env.local");
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Gerar dados fake de tutores
function generateTutors(count: number = 10): Omit<TutorProfile, "id">[] {
  return Array.from({ length: count }, () => ({
    name: faker.person.fullName(),
    location: {
      lng: Number(faker.location.longitude()),
      lat: Number(faker.location.latitude()),
    },
    custom_fields: {
      pref_energia: faker.helpers.arrayElement([
        "baixo",
        "medio",
        "alto",
      ] as const),
      tem_criancas: faker.datatype.boolean(),
      tamanho_casa: faker.helpers.arrayElement([
        "apartamento",
        "casa_quintal_pequeno",
        "casa_quintal_grande",
      ] as const),
    },
  }));
}

// Gerar dados fake de animais
function generateAnimals(count: number = 20): Omit<AnimalProfile, "id">[] {
  const species = ["Cachorro", "Gato", "Coelho", "Passaro"];
  const breeds: Record<string, string[]> = {
    Cachorro: [
      "Labrador",
      "Pastor Alemão",
      "Poodle",
      "Bulldog",
      "Shih Tzu",
      "Viralata",
    ],
    Gato: ["Siamês", "Persa", "Bengala", "Maine Coon", "Vira-lata"],
    Coelho: ["Holandês", "Angora", "Gigante Belga"],
    Passaro: ["Canário", "Papagaio", "Calopsita"],
  };

  return Array.from({ length: count }, () => {
    const specie = faker.helpers.arrayElement(species);
    return {
      owner_id: "", // Será preenchido após inserir tutores
      name: faker.animal.dog(),
      species: specie,
      location: {
        lng: Number(faker.location.longitude()),
        lat: Number(faker.location.latitude()),
      },
      custom_fields: {
        nivel_energia: faker.helpers.arrayElement([
          "baixo",
          "medio",
          "alto",
        ] as const),
        aceita_criancas: faker.datatype.boolean(),
        espaco_necessario: faker.helpers.arrayElement([
          "apartamento",
          "casa_quintal_pequeno",
          "casa_quintal_grande",
        ] as const),
      },
    };
  });
}

// Gerar regras de matching
function generateMatchingRules(): Omit<MatchingRule, "id">[] {
  return [
    {
      rule_name: "Energia do tutor vs energia do animal",
      tutor_field: "pref_energia",
      animal_field: "nivel_energia",
      comparison_operator: "=" as const,
      weight: 40,
      is_active: true,
    },
    {
      rule_name: "Crianças vs aceitação do animal",
      tutor_field: "tem_criancas",
      animal_field: "aceita_criancas",
      comparison_operator: "=" as const,
      weight: 35,
      is_active: true,
    },
    {
      rule_name: "Espaço disponível vs espaço necessário",
      tutor_field: "tamanho_casa",
      animal_field: "espaco_necessario",
      comparison_operator: "=" as const,
      weight: 50,
      is_active: true,
    },
  ];
}

async function seed(): Promise<void> {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  try {
    // 1. Limpar dados existentes
    console.log("🗑️  Limpando dados existentes...");
    await supabase.from("matching_rules").delete().neq("id", "");
    await supabase.from("animals").delete().neq("id", "");
    await supabase.from("tutors").delete().neq("id", "");
    console.log("✅ Dados antigos removidos\n");

    // 2. Inserir tutores
    console.log("👥 Gerando 10 tutores...");
    const tutorsData = generateTutors(10);
    const { data: insertedTutors, error: tutorError } = await supabase
      .from("tutors")
      .insert(
        tutorsData.map((t) => ({
          ...t,
          location: `POINT(${t.location.lng} ${t.location.lat})`,
        }))
      )
      .select();

    if (tutorError) throw tutorError;
    console.log(`✅ ${insertedTutors?.length || 0} tutores inseridos\n`);

    // 3. Inserir animais
    console.log("🐾 Gerando 20 animais...");
    const animalsData = generateAnimals(20);

    // Associar animais aleatoriamente aos tutores
    const animalsWithOwners = animalsData.map((animal) => ({
      ...animal,
      owner_id: faker.helpers.arrayElement(insertedTutors || []).id,
      location: `POINT(${animal.location.lng} ${animal.location.lat})`,
    }));

    const { data: insertedAnimals, error: animalError } = await supabase
      .from("animals")
      .insert(animalsWithOwners)
      .select();

    if (animalError) throw animalError;
    console.log(`✅ ${insertedAnimals?.length || 0} animais inseridos\n`);

    // 4. Inserir regras de matching
    console.log("⚙️  Gerando regras de matching...");
    const rulesData = generateMatchingRules();
    const { data: insertedRules, error: ruleError } = await supabase
      .from("matching_rules")
      .insert(rulesData)
      .select();

    if (ruleError) throw ruleError;
    console.log(`✅ ${insertedRules?.length || 0} regras inseridas\n`);

    console.log("🎉 Seed completo com sucesso!");
    console.log("\n📊 Resumo:");
    console.log(`   - Tutores: ${insertedTutors?.length || 0}`);
    console.log(`   - Animais: ${insertedAnimals?.length || 0}`);
    console.log(`   - Regras: ${insertedRules?.length || 0}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("❌ Erro durante o seed:", errorMessage);
    process.exit(1);
  }
}

// Executar seed
seed();
