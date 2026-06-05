const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env.local") });
const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");
const { faker } = require("@faker-js/faker/locale/pt_BR");

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
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  realtime: {
    transport: ws,
  },
});

// Dados mock dos tutores
function generateTutors(count = 10) {
  return Array.from({ length: count }, () => ({
    name: faker.person.fullName(),
    location: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
    custom_fields: {
      tamanho_casa: faker.helpers.arrayElement([
        "pequeno",
        "medio",
        "grande",
      ]),
      tem_quintal: faker.datatype.boolean(),
      tem_criancas: faker.datatype.boolean(),
      renda_mensal: faker.helpers.arrayElement([
        "ate_1000",
        "1000_3000",
        "3000_6000",
        "6000_acima",
      ]),
      disponibilidade_tempo: faker.helpers.arrayElement([
        "meio_periodo",
        "integral",
      ]),
    },
  }));
}

// Dados mock dos animais
function generateAnimals(count = 20) {
  const species = ["Cachorro", "Gato", "Coelho", "Passaro"];
  const breeds = {
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
      name: faker.animal.dog(),
      species: specie,
      location: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
      custom_fields: {
        raca: faker.helpers.arrayElement(breeds[specie]),
        idade_meses: faker.number.int({ min: 1, max: 120 }),
        peso_kg: faker.number.int({ min: 1, max: 50 }),
        tamanho: faker.helpers.arrayElement(["pequeno", "medio", "grande"]),
        nivel_energia: faker.helpers.arrayElement(["baixo", "medio", "alto"]),
        aceita_criancas: faker.datatype.boolean(),
        aceita_outros_animais: faker.datatype.boolean(),
        castrado: faker.datatype.boolean(),
        vacinado: faker.datatype.boolean(),
        requer_espaco: faker.helpers.arrayElement([
          "apartamento",
          "casa_pequena",
          "casa_grande",
        ]),
      },
    };
  });
}

// Regras de matching
function generateMatchingRules() {
  return [
    {
      rule_name: "Tamanho da casa vs espaço do animal",
      tutor_field: "tamanho_casa",
      animal_field: "requer_espaco",
      comparison_operator: ">=",
      weight: 30,
      is_active: true,
    },
    {
      rule_name: "Quintal vs tamanho do animal",
      tutor_field: "tem_quintal",
      animal_field: "tamanho",
      comparison_operator: "contains",
      weight: 25,
      is_active: true,
    },
    {
      rule_name: "Crianças vs aceitação do animal",
      tutor_field: "tem_criancas",
      animal_field: "aceita_criancas",
      comparison_operator: "=",
      weight: 20,
      is_active: true,
    },
    {
      rule_name: "Tempo disponível vs energia do animal",
      tutor_field: "disponibilidade_tempo",
      animal_field: "nivel_energia",
      comparison_operator: "=",
      weight: 15,
      is_active: true,
    },
    {
      rule_name: "Renda vs necessidade de cuidados",
      tutor_field: "renda_mensal",
      animal_field: "vacinado",
      comparison_operator: "=",
      weight: 10,
      is_active: true,
    },
  ];
}

function generateCustomFields() {
  return [
    {
      entity_type: "tutor",
      field_key: "tamanho_casa",
      label: "Tamanho da casa",
      field_type: "select",
      options: ["pequeno", "medio", "grande"],
      is_active: true,
      sort_order: 10,
    },
    {
      entity_type: "tutor",
      field_key: "tem_quintal",
      label: "Tem quintal",
      field_type: "boolean",
      options: null,
      is_active: true,
      sort_order: 20,
    },
    {
      entity_type: "tutor",
      field_key: "tem_criancas",
      label: "Tem criancas",
      field_type: "boolean",
      options: null,
      is_active: true,
      sort_order: 30,
    },
    {
      entity_type: "tutor",
      field_key: "renda_mensal",
      label: "Renda mensal",
      field_type: "select",
      options: ["ate_1000", "1000_3000", "3000_6000", "6000_acima"],
      is_active: true,
      sort_order: 40,
    },
    {
      entity_type: "tutor",
      field_key: "disponibilidade_tempo",
      label: "Disponibilidade de tempo",
      field_type: "select",
      options: ["meio_periodo", "integral"],
      is_active: true,
      sort_order: 50,
    },
    {
      entity_type: "animal",
      field_key: "tamanho",
      label: "Tamanho",
      field_type: "select",
      options: ["pequeno", "medio", "grande"],
      is_active: true,
      sort_order: 10,
    },
    {
      entity_type: "animal",
      field_key: "nivel_energia",
      label: "Nivel de energia",
      field_type: "select",
      options: ["baixo", "medio", "alto"],
      is_active: true,
      sort_order: 20,
    },
    {
      entity_type: "animal",
      field_key: "aceita_criancas",
      label: "Aceita criancas",
      field_type: "boolean",
      options: null,
      is_active: true,
      sort_order: 30,
    },
    {
      entity_type: "animal",
      field_key: "vacinado",
      label: "Vacinado",
      field_type: "boolean",
      options: null,
      is_active: true,
      sort_order: 40,
    },
    {
      entity_type: "animal",
      field_key: "requer_espaco",
      label: "Espaco necessario",
      field_type: "select",
      options: ["apartamento", "casa_pequena", "casa_grande"],
      is_active: true,
      sort_order: 50,
    },
  ];
}

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  try {
    // 1. Limpar dados existentes
    console.log("🗑️  Limpando dados existentes...");
    await supabase.from("matching_rules").delete().neq("id", "");
    await supabase.from("custom_fields").delete().neq("id", "");
    await supabase.from("animals").delete().neq("id", "");
    await supabase.from("tutors").delete().neq("id", "");
    console.log("✅ Dados antigos removidos\n");

    // 2. Inserir tutores
    console.log("👥 Gerando 10 tutores...");
    const tutors = generateTutors(10);
    const { data: insertedTutors, error: tutorError } = await supabase
      .from("tutors")
      .insert(tutors)
      .select();

    if (tutorError) throw tutorError;
    console.log(`✅ ${insertedTutors.length} tutores inseridos\n`);

    // 3. Inserir animais
    console.log("🐾 Gerando 20 animais...");
    const animals = generateAnimals(20);
    // Associar animais aleatoriamente aos tutores
    const animalsWithOwners = animals.map((animal) => ({
      ...animal,
      owner_id: faker.helpers.arrayElement(insertedTutors).id,
    }));

    const { data: insertedAnimals, error: animalError } = await supabase
      .from("animals")
      .insert(animalsWithOwners)
      .select();

    if (animalError) throw animalError;
    console.log(`✅ ${insertedAnimals.length} animais inseridos\n`);

    // 4. Inserir campos customizados
    console.log("📋 Gerando campos customizados...");
    const { data: insertedCustomFields, error: customFieldError } = await supabase
      .from("custom_fields")
      .insert(generateCustomFields())
      .select();

    if (customFieldError) throw customFieldError;
    console.log(`✅ ${insertedCustomFields.length} campos customizados inseridos\n`);

    // 5. Inserir regras de matching
    console.log("⚙️  Gerando regras de matching...");
    const rules = generateMatchingRules();
    const { data: insertedRules, error: ruleError } = await supabase
      .from("matching_rules")
      .insert(rules)
      .select();

    if (ruleError) throw ruleError;
    console.log(`✅ ${insertedRules.length} regras de matching inseridas\n`);

    console.log("🎉 Seed completo com sucesso!");
    console.log("\n📊 Resumo:");
    console.log(`   - Tutores: ${insertedTutors.length}`);
    console.log(`   - Animais: ${insertedAnimals.length}`);
    console.log(`   - Campos customizados: ${insertedCustomFields.length}`);
    console.log(`   - Regras: ${insertedRules.length}`);
  } catch (error) {
    console.error("❌ Erro durante o seed:", error.message);
    process.exit(1);
  }
}

// Executar seed
seed();
