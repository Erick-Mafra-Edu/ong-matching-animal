import { faker } from "@faker-js/faker/locale/pt_BR";
import { createClient } from "@supabase/supabase-js";

const ws = require("ws");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios");
  console.error("Configure-os no arquivo .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  realtime: {
    transport: ws,
  },
});

type Location = {
  lng: number;
  lat: number;
};

type TutorSeed = {
  name: string;
  location: Location;
  custom_fields: Record<string, unknown>;
};

type AnimalSeed = {
  owner_id: string | null;
  name: string;
  species: string;
  location: Location;
  custom_fields: Record<string, unknown>;
};

type InsertedRecord = {
  id: string;
};

const energyLevels = ["baixo", "medio", "alto"] as const;
const homeSizes = ["apartamento", "casa_sem_quintal", "casa_com_quintal", "sitio"] as const;
const routines = ["poucas_horas", "meio_periodo", "maior_parte_dia", "home_office"] as const;
const preferences = ["calmo", "brincalhao", "sociavel", "independente", "protetor"] as const;
const speciesOptions = ["Cachorro", "Gato", "Coelho", "Passaro"] as const;
const photoMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

function point(location: Location): string {
  return `POINT(${location.lng} ${location.lat})`;
}

function generateTutors(count = 10): TutorSeed[] {
  return Array.from({ length: count }, () => {
    const preferredEnergy = faker.helpers.arrayElement(energyLevels);
    const hasChildren = faker.datatype.boolean();
    const homeSize = faker.helpers.arrayElement(homeSizes);
    const selectedPreferences = faker.helpers.arrayElements(preferences, { min: 1, max: 3 });

    return {
      name: faker.person.fullName(),
      location: {
        lng: Number(faker.location.longitude({ min: -46.9, max: -46.35 })),
        lat: Number(faker.location.latitude({ min: -23.8, max: -23.35 })),
      },
      custom_fields: {
        pref_energia: preferredEnergy,
        tem_criancas: hasChildren,
        tamanho_casa: homeSize,
        disponibilidade_tempo: faker.helpers.arrayElement(routines),
        preferencias: selectedPreferences,
        observacoes: faker.lorem.sentence(),
      },
    };
  });
}

function generateAnimals(count = 20): AnimalSeed[] {
  return Array.from({ length: count }, () => {
    const species = faker.helpers.arrayElement(speciesOptions);
    const animalName = species === "Gato" ? faker.animal.cat() : faker.animal.dog();

    return {
      owner_id: null,
      name: animalName,
      species,
      location: {
        lng: Number(faker.location.longitude({ min: -46.9, max: -46.35 })),
        lat: Number(faker.location.latitude({ min: -23.8, max: -23.35 })),
      },
      custom_fields: {
        nivel_energia: faker.helpers.arrayElement(energyLevels),
        aceita_criancas: faker.datatype.boolean(),
        espaco_necessario: faker.helpers.arrayElement(homeSizes),
        caracteristicas: faker.helpers.arrayElements(preferences, { min: 1, max: 3 }),
        tamanho: faker.helpers.arrayElement(["pequeno", "medio", "grande"] as const),
        vacinado: faker.datatype.boolean(),
        castrado: faker.datatype.boolean(),
      },
    };
  });
}

function generateOnboardingQuestions() {
  return [
    {
      id: "home_type",
      label: "Como e a sua moradia?",
      description: "Isso ajuda a recomendar animais compativeis com o espaco disponivel.",
      placeholder: null,
      type: "radio",
      options: [
        { label: "Apartamento", value: "apartamento" },
        { label: "Casa sem quintal", value: "casa_sem_quintal" },
        { label: "Casa com quintal", value: "casa_com_quintal" },
        { label: "Sitio", value: "sitio" },
      ],
      required: true,
      is_active: true,
      sort_order: 10,
      updated_at: new Date().toISOString(),
    },
    {
      id: "routine",
      label: "Quanto tempo voce costuma passar em casa?",
      description: null,
      placeholder: "Selecione sua rotina",
      type: "select",
      options: [
        { label: "Poucas horas por dia", value: "poucas_horas" },
        { label: "Meio periodo", value: "meio_periodo" },
        { label: "A maior parte do dia", value: "maior_parte_dia" },
        { label: "Home office", value: "home_office" },
      ],
      required: true,
      is_active: true,
      sort_order: 20,
      updated_at: new Date().toISOString(),
    },
    {
      id: "has_children",
      label: "Ha criancas na residencia?",
      description: null,
      placeholder: null,
      type: "boolean",
      options: null,
      required: true,
      is_active: true,
      sort_order: 30,
      updated_at: new Date().toISOString(),
    },
    {
      id: "preferred_energy",
      label: "Qual nivel de energia combina com sua rotina?",
      description: null,
      placeholder: null,
      type: "radio",
      options: [
        { label: "Tranquilo", value: "baixo" },
        { label: "Equilibrado", value: "medio" },
        { label: "Ativo", value: "alto" },
      ],
      required: true,
      is_active: true,
      sort_order: 40,
      updated_at: new Date().toISOString(),
    },
    {
      id: "preferences",
      label: "O que voce procura em um novo companheiro?",
      description: "Escolha uma ou mais opcoes.",
      placeholder: null,
      type: "multiselect",
      options: preferences.map((value) => ({ label: value, value })),
      required: false,
      is_active: true,
      sort_order: 50,
      updated_at: new Date().toISOString(),
    },
    {
      id: "notes",
      label: "Quer contar algo importante para a ONG?",
      description: null,
      placeholder: "Ex.: ja tenho um gato adulto em casa",
      type: "text",
      options: null,
      required: false,
      is_active: true,
      sort_order: 60,
      updated_at: new Date().toISOString(),
    },
  ];
}

function generateCustomFields() {
  return [
    {
      entity_type: "tutor",
      field_key: "pref_energia",
      label: "Energia desejada",
      field_type: "select",
      options: energyLevels,
      source_question_id: "preferred_energy",
      is_active: true,
      sort_order: 10,
    },
    {
      entity_type: "tutor",
      field_key: "tem_criancas",
      label: "Tem criancas",
      field_type: "boolean",
      options: null,
      source_question_id: "has_children",
      is_active: true,
      sort_order: 20,
    },
    {
      entity_type: "tutor",
      field_key: "tamanho_casa",
      label: "Tamanho da casa",
      field_type: "select",
      options: homeSizes,
      source_question_id: "home_type",
      is_active: true,
      sort_order: 30,
    },
    {
      entity_type: "tutor",
      field_key: "disponibilidade_tempo",
      label: "Disponibilidade de tempo",
      field_type: "select",
      options: routines,
      source_question_id: "routine",
      is_active: true,
      sort_order: 40,
    },
    {
      entity_type: "tutor",
      field_key: "preferencias",
      label: "Preferencias de convivencia",
      field_type: "multiselect",
      options: preferences,
      source_question_id: "preferences",
      is_active: true,
      sort_order: 50,
    },
    {
      entity_type: "tutor",
      field_key: "observacoes",
      label: "Observacoes",
      field_type: "text",
      options: null,
      source_question_id: "notes",
      is_active: true,
      sort_order: 60,
    },
    {
      entity_type: "animal",
      field_key: "nivel_energia",
      label: "Nivel de energia",
      field_type: "select",
      options: energyLevels,
      source_question_id: null,
      is_active: true,
      sort_order: 10,
    },
    {
      entity_type: "animal",
      field_key: "aceita_criancas",
      label: "Aceita criancas",
      field_type: "boolean",
      options: null,
      source_question_id: null,
      is_active: true,
      sort_order: 20,
    },
    {
      entity_type: "animal",
      field_key: "espaco_necessario",
      label: "Espaco necessario",
      field_type: "select",
      options: homeSizes,
      source_question_id: null,
      is_active: true,
      sort_order: 30,
    },
    {
      entity_type: "animal",
      field_key: "caracteristicas",
      label: "Caracteristicas",
      field_type: "multiselect",
      options: preferences,
      source_question_id: null,
      is_active: true,
      sort_order: 40,
    },
    {
      entity_type: "animal",
      field_key: "tamanho",
      label: "Tamanho",
      field_type: "select",
      options: ["pequeno", "medio", "grande"],
      source_question_id: null,
      is_active: true,
      sort_order: 50,
    },
    {
      entity_type: "animal",
      field_key: "vacinado",
      label: "Vacinado",
      field_type: "boolean",
      options: null,
      source_question_id: null,
      is_active: true,
      sort_order: 60,
    },
    {
      entity_type: "animal",
      field_key: "castrado",
      label: "Castrado",
      field_type: "boolean",
      options: null,
      source_question_id: null,
      is_active: true,
      sort_order: 70,
    },
  ];
}

function generateMatchingRules() {
  return [
    {
      rule_name: "Energia do tutor vs energia do animal",
      tutor_field: "pref_energia",
      animal_field: "nivel_energia",
      comparison_operator: "=",
      weight: 40,
      is_dealbreaker: false,
      is_active: true,
    },
    {
      rule_name: "Criancas vs aceitacao do animal",
      tutor_field: "tem_criancas",
      animal_field: "aceita_criancas",
      comparison_operator: "=",
      weight: 35,
      is_dealbreaker: false,
      is_active: true,
    },
    {
      rule_name: "Espaco disponivel vs espaco necessario",
      tutor_field: "tamanho_casa",
      animal_field: "espaco_necessario",
      comparison_operator: "=",
      weight: 50,
      is_dealbreaker: false,
      is_active: true,
    },
    {
      rule_name: "Preferencias de convivencia",
      tutor_field: "preferencias",
      animal_field: "caracteristicas",
      comparison_operator: "contains",
      weight: 20,
      is_dealbreaker: false,
      is_active: true,
    },
  ];
}

function generateOngSettings() {
  return {
    id: "default",
    ong_name: "ONG Matching Animal",
    contact_email: "contato@ongmatchinganimal.org",
    contact_phone: "+55 11 4002-8922",
    whatsapp_phone: "+55 11 94002-8922",
    website_url: "https://ongmatchinganimal.org",
    address_line: "Rua das Adocoes, 100",
    city: "Sao Paulo",
    state: "SP",
    postal_code: "01000-000",
    social_links: {
      github: "https://github.com/Erick-Mafra-Edu/ong-matching-animal",
    },
    business_hours: {
      weekdays: "09:00-18:00",
      saturday: "09:00-13:00",
    },
    settings: {
      extension_project_name: "Projeto de Extensao",
      faculty_name: "Faculdade de Tecnologia Social",
      github_url: "https://github.com/Erick-Mafra-Edu/ong-matching-animal",
      credits_label: "Ver Creditos",
    },
    is_active: true,
    updated_at: new Date().toISOString(),
  };
}

async function clearTable(table: string, column = "id"): Promise<void> {
  const { error } = await supabase.from(table).delete().not(column, "is", null);
  if (error) throw new Error(`Falha ao limpar ${table}: ${error.message}`);
}

async function seed(): Promise<void> {
  console.log("Iniciando seed do banco de dados...\n");

  try {
    console.log("Limpando dados existentes...");
    await clearTable("calendar_events");
    await clearTable("tutor_interessados", "uuid_registro");
    await clearTable("animal_photos");
    await clearTable("tutor_animal_matches", "tutor_id");
    await clearTable("matching_rules");
    await clearTable("custom_fields");
    await clearTable("onboarding_questions");
    await clearTable("service_configs");
    await clearTable("animals");
    await clearTable("tutors");
    console.log("Dados antigos removidos\n");

    console.log("Configurando dados da ONG...");
    const { error: ongSettingsError } = await supabase
      .from("ong_settings")
      .upsert(generateOngSettings(), { onConflict: "id" });
    if (ongSettingsError) throw ongSettingsError;
    console.log("Configuracoes da ONG atualizadas\n");

    console.log("Gerando perguntas de onboarding...");
    const { data: insertedQuestions, error: questionError } = await supabase
      .from("onboarding_questions")
      .upsert(generateOnboardingQuestions(), { onConflict: "id" })
      .select();
    if (questionError) throw questionError;
    console.log(`${insertedQuestions?.length || 0} perguntas inseridas\n`);

    console.log("Gerando campos customizados...");
    const { data: insertedCustomFields, error: customFieldError } = await supabase
      .from("custom_fields")
      .upsert(generateCustomFields(), { onConflict: "entity_type,field_key" })
      .select();
    if (customFieldError) throw customFieldError;
    console.log(`${insertedCustomFields?.length || 0} campos customizados inseridos\n`);

    console.log("Gerando regras de matching...");
    const { data: insertedRules, error: ruleError } = await supabase
      .from("matching_rules")
      .insert(generateMatchingRules())
      .select();
    if (ruleError) throw ruleError;
    console.log(`${insertedRules?.length || 0} regras inseridas\n`);

    console.log("Gerando 10 tutores...");
    const tutorsData = generateTutors(10);
    const { data: insertedTutors, error: tutorError } = await supabase
      .from("tutors")
      .insert(
        tutorsData.map((tutor) => ({
          name: tutor.name,
          location: point(tutor.location),
          custom_fields: tutor.custom_fields,
          onboarding_completed_at: new Date().toISOString(),
        }))
      )
      .select("id");
    if (tutorError) throw tutorError;
    const tutors = (insertedTutors || []) as InsertedRecord[];
    console.log(`${tutors.length} tutores inseridos\n`);

    console.log("Gerando 20 animais...");
    const animalsData = generateAnimals(20);
    const animalsWithOwners = animalsData.map((animal) => ({
      owner_id: faker.helpers.arrayElement(tutors).id,
      name: animal.name,
      species: animal.species,
      location: point(animal.location),
      custom_fields: animal.custom_fields,
    }));
    const { data: insertedAnimals, error: animalError } = await supabase
      .from("animals")
      .insert(animalsWithOwners)
      .select("id,name");
    if (animalError) throw animalError;
    const animals = (insertedAnimals || []) as Array<InsertedRecord & { name: string }>;
    console.log(`${animals.length} animais inseridos\n`);

    console.log("Gerando fotos dos animais...");
    const { data: insertedPhotos, error: photoError } = await supabase
      .from("animal_photos")
      .insert(
        animals.map((animal, index) => {
          const contentType = faker.helpers.arrayElement(photoMimeTypes);
          const extension = contentType.split("/")[1];

          return {
            animal_id: animal.id,
            bucket_id: "animal-photos",
            storage_path: `seed/${animal.id}.${extension}`,
            public_url: `https://placehold.co/900x700?text=${encodeURIComponent(animal.name)}`,
            content_type: contentType,
            size_bytes: faker.number.int({ min: 20_000, max: 1_500_000 }),
            is_primary: index < animals.length,
          };
        })
      )
      .select();
    if (photoError) throw photoError;
    console.log(`${insertedPhotos?.length || 0} fotos inseridas\n`);

    console.log("Gerando interesses e eventos...");
    const interestRows = animals.slice(0, Math.min(animals.length, tutors.length)).map((animal, index) => ({
      tutor_id: tutors[index].id,
      animal_id: animal.id,
    }));
    const { data: insertedInterests, error: interestError } = await supabase
      .from("tutor_interessados")
      .insert(interestRows)
      .select("uuid_registro,tutor_id,animal_id");
    if (interestError) throw interestError;

    const interests = insertedInterests || [];
    const { data: insertedEvents, error: eventError } = await supabase
      .from("calendar_events")
      .insert(
        interests.slice(0, 5).map((interest, index) => {
          const startsAt = faker.date.soon({ days: 20 });
          const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

          return {
            interest_id: interest.uuid_registro,
            tutor_id: interest.tutor_id,
            animal_id: interest.animal_id,
            title: `Visita de adocao ${index + 1}`,
            description: "Evento gerado automaticamente pelo seed.",
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            location: "Sede da ONG",
            status: "scheduled",
            metadata: { seed: true },
          };
        })
      )
      .select();
    if (eventError) throw eventError;
    console.log(`${interests.length} interesses e ${insertedEvents?.length || 0} eventos inseridos\n`);

    console.log("Configurando servicos externos...");
    const { error: serviceConfigError } = await supabase.from("service_configs").upsert(
      {
        id: "calendar-google-default",
        service_type: "calendar",
        provider: "google",
        config: {
          sync_enabled: false,
          default_calendar_id: "primary",
        },
        is_active: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (serviceConfigError) throw serviceConfigError;
    console.log("Servicos externos configurados\n");

    console.log("Atualizando cache de matching...");
    const { error: refreshError } = await supabase.rpc("refresh_all_tutor_animal_matches");
    if (refreshError) throw refreshError;
    console.log("Cache de matching atualizado\n");

    console.log("Seed completo com sucesso!");
    console.log("\nResumo:");
    console.log(`   - Tutores: ${tutors.length}`);
    console.log(`   - Animais: ${animals.length}`);
    console.log(`   - Fotos: ${insertedPhotos?.length || 0}`);
    console.log(`   - Interesses: ${interests.length}`);
    console.log(`   - Eventos: ${insertedEvents?.length || 0}`);
    console.log(`   - Campos customizados: ${insertedCustomFields?.length || 0}`);
    console.log(`   - Perguntas onboarding: ${insertedQuestions?.length || 0}`);
    console.log(`   - Regras: ${insertedRules?.length || 0}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Erro durante o seed:", errorMessage);
    process.exit(1);
  }
}

seed();
