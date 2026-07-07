import type { SupabaseClient, User } from "@supabase/supabase-js";
import { backendApiUrl } from "@/lib/backend";
import type { Database } from "@/lib/supabase/client";
import type { OnboardingAnswers, OnboardingEligibilityResult, OnboardingQuestion, QuestionOption, QuestionType } from "@/types/onboarding";
import type { TutorProfile } from "@/types/shared";

type TutorCustomFields = TutorProfile["custom_fields"] & Record<string, string | string[] | boolean | undefined> & {
  onboarding_complete: boolean;
  preferencias?: string[];
  observacoes?: string;
};

const homeTypeAliases: Record<string, NonNullable<TutorProfile["custom_fields"]["tamanho_casa"]>> = {
  apartamento: "apartamento",
  casa_sem_quintal: "casa_quintal_pequeno",
  casa_com_quintal: "casa_quintal_grande",
};

const energyAliases: Record<string, NonNullable<TutorProfile["custom_fields"]["pref_energia"]>> = {
  baixo: "baixo",
  medio: "medio",
  alto: "alto",
};

function normalizeOptions(options: unknown): QuestionOption[] | undefined {
  if (!Array.isArray(options)) return undefined;

  return options.filter((option): option is QuestionOption => (
    typeof option === "object"
    && option !== null
    && "label" in option
    && "value" in option
    && typeof option.label === "string"
    && typeof option.value === "string"
  ));
}

function isOnboardingAnswers(value: unknown): value is OnboardingAnswers {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  return Object.values(value).every((answer) => (
    typeof answer === "string"
    || (Array.isArray(answer) && answer.every((item) => typeof item === "string"))
  ));
}

export function buildTutorCustomFields(answers: OnboardingAnswers): TutorCustomFields {
  const customFields: TutorCustomFields = {
    ...answers,
    onboarding_complete: true,
  };

  if (typeof answers.has_children === "string") {
    customFields.has_children = answers.has_children === "true";
    customFields.tem_criancas = customFields.has_children;
  }

  if (typeof answers.preferred_energy === "string") {
    customFields.pref_energia = energyAliases[answers.preferred_energy];
  }

  if (typeof answers.routine === "string") {
    customFields.disponibilidade_tempo = answers.routine;
  }

  if (typeof answers.home_type === "string") {
    customFields.tamanho_casa = homeTypeAliases[answers.home_type];
  }

  if (typeof answers.preferences !== "undefined") {
    customFields.preferencias = Array.isArray(answers.preferences) ? answers.preferences : [answers.preferences];
  }

  if (typeof answers.notes === "string") {
    customFields.observacoes = answers.notes;
  }

  return customFields;
}

export async function fetchOnboardingQuestions(): Promise<OnboardingQuestion[]> {
  const response = await fetch(backendApiUrl("/api/onboarding-questions"));

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Não foi possível carregar as perguntas.");
  }

  const data = await response.json() as Array<{
    id: string;
    label: string;
    description: string | null;
    placeholder: string | null;
    required: boolean;
    type: string;
    options: unknown;
    is_knockout?: boolean;
    knockout_values?: unknown;
    knockout_message?: string | null;
  }>;
  return data.map((question) => ({
    id: question.id,
    label: question.label,
    description: question.description ?? undefined,
    placeholder: question.placeholder ?? undefined,
    required: question.required,
    type: question.type as QuestionType,
    options: normalizeOptions(question.options),
    is_knockout: question.is_knockout === true,
    knockout_values: Array.isArray(question.knockout_values) ? question.knockout_values.filter((value): value is string => typeof value === "string") : undefined,
    knockout_message: question.knockout_message ?? undefined,
  }));
}

export async function validateOnboardingEligibility(answers: OnboardingAnswers): Promise<OnboardingEligibilityResult> {
  const response = await fetch(backendApiUrl("/api/onboarding-eligibility"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ answers }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Nao foi possivel validar os requisitos de cadastro.");
  }

  return response.json() as Promise<OnboardingEligibilityResult>;
}

const locationQuestionIds = new Set([
  "location",
  "localizacao",
  "localização",
]);

function normalizeQuestionText(value: string | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isLocationQuestion(question: OnboardingQuestion) {
  return locationQuestionIds.has(normalizeQuestionText(question.id));
}

export function filterOnboardingQuestions(questions: OnboardingQuestion[], hideLocationFields = false) {
  if (!hideLocationFields) return questions;
  return questions.filter((question) => !isLocationQuestion(question));
}

export async function hasCompletedOnboarding(supabase: SupabaseClient<Database>, userId: string) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw sessionError ?? new Error("Sessão ausente para verificar onboarding.");
  }

  if (sessionData.session.user.id !== userId) {
    throw new Error("Não é permitido verificar onboarding de outro usuário.");
  }

  const response = await fetch(backendApiUrl("/api/tutors/me/onboarding-status"), {
    headers: {
      authorization: `Bearer ${sessionData.session.access_token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Não foi possível verificar onboarding.");
  }

  const body = await response.json() as { onboarding_complete?: boolean };
  return body.onboarding_complete === true;
}

export async function fetchDiscoverAccess(supabase: SupabaseClient<Database>) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw sessionError ?? new Error("Sessao ausente para verificar acesso ao discover.");
  }

  const response = await fetch(backendApiUrl("/api/tutors/me/discover-access"), {
    headers: {
      authorization: `Bearer ${sessionData.session.access_token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Nao foi possivel verificar acesso ao discover.");
  }

  return response.json() as Promise<{
    authenticated: boolean;
    onboarding_complete: boolean;
    onboarding_completed_at: string | null;
    questionnaire_updated_at: string | null;
    onboarding_outdated: boolean;
    tutor_id: string | null;
    is_admin: boolean;
  }>;
}

export async function saveOnboardingAnswers(supabase: SupabaseClient<Database>, user: User, answers: OnboardingAnswers) {
  const eligibility = await validateOnboardingEligibility(answers);
  if (!eligibility.eligible) {
    throw new Error(eligibility.message ?? "Seu perfil nao atende aos requisitos minimos definidos pela ONG para cadastro.");
  }

  const customFields = buildTutorCustomFields(answers);
  const name = String(user.user_metadata.full_name ?? user.email?.split("@")[0] ?? "Adotante");
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw sessionError ?? new Error("Sessão ausente para salvar o tutor.");
  }

  const response = await fetch(backendApiUrl("/api/tutors"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${sessionData.session.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      auth_user_id: user.id,
      name,
      custom_fields: customFields,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Não foi possível salvar o tutor.");
  }
}

export async function saveOnboardingAnswersFromMetadata(supabase: SupabaseClient<Database>, user: User) {
  const answers = user.user_metadata.onboarding_answers;
  if (!isOnboardingAnswers(answers)) return false;

  await saveOnboardingAnswers(supabase, user, answers);
  return true;
}
