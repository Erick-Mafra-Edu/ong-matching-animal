import type { SupabaseClient, User } from "@supabase/supabase-js";
import { backendApiUrl } from "@/lib/backend";
import type { Database } from "@/lib/supabase/client";
import type { OnboardingAnswers, OnboardingQuestion, QuestionOption, QuestionType } from "@/types/onboarding";
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
  }>;
  return data.map((question) => ({
    id: question.id,
    label: question.label,
    description: question.description ?? undefined,
    placeholder: question.placeholder ?? undefined,
    required: question.required,
    type: question.type as QuestionType,
    options: normalizeOptions(question.options),
  }));
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

export async function saveOnboardingAnswers(supabase: SupabaseClient<Database>, user: User, answers: OnboardingAnswers) {
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
