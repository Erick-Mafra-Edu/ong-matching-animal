export interface KnockoutOnboardingQuestion {
  id: string;
  label?: string | null;
  type?: string | null;
  is_knockout?: boolean | null;
  knockout_values?: unknown;
  knockout_message?: string | null;
}

export interface OnboardingEligibilityResult {
  eligible: boolean;
  blocked_question_id?: string;
  blocked_question_label?: string;
  message?: string;
}

export const knockoutEligibleQuestionTypes = new Set(["select", "multiselect", "radio", "boolean"]);
const defaultBlockedMessage = "Seu perfil nao atende aos requisitos minimos definidos pela ONG para cadastro.";

export async function fetchActiveKnockoutQuestions(supabaseUrl: string, serviceRoleKey: string) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/onboarding_questions?select=id,label,type,is_knockout,knockout_values,knockout_message&is_active=eq.true&is_knockout=eq.true&order=sort_order.asc`,
    {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = typeof body === "object" && body && "message" in body
      ? String((body as { message?: unknown }).message ?? "")
      : "";
    throw new Error(errorMessage || "Nao foi possivel carregar as perguntas eliminatorias.");
  }

  return Array.isArray(body) ? body as KnockoutOnboardingQuestion[] : [];
}

export async function validateOnboardingEligibilityAnswers(
  answers: Record<string, unknown>,
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  const questions = await fetchActiveKnockoutQuestions(supabaseUrl, serviceRoleKey);
  return evaluateOnboardingEligibility(answers, questions);
}

export function evaluateOnboardingEligibility(
  answers: Record<string, unknown>,
  questions: KnockoutOnboardingQuestion[],
): OnboardingEligibilityResult {
  for (const question of questions) {
    if (question.is_knockout !== true) continue;

    const disqualifyingValues = normalizeKnockoutValues(question.knockout_values);
    if (disqualifyingValues.length === 0) continue;

    const answerValues = normalizeAnswerValues(answers[question.id]);
    if (answerValues.length === 0) continue;

    const matched = answerValues.some((answerValue) => disqualifyingValues.includes(answerValue));
    if (!matched) continue;

    return {
      eligible: false,
      blocked_question_id: question.id,
      blocked_question_label: question.label ?? question.id,
      message: normalizeMessage(question.knockout_message) ?? defaultBlockedMessage,
    };
  }

  return { eligible: true };
}

function normalizeKnockoutValues(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "boolean") return item ? "true" : "false";
      if (typeof item === "string") return item.trim();
      if (typeof item === "number" && Number.isFinite(item)) return String(item);
      return "";
    })
    .filter(Boolean);
}

function normalizeAnswerValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeAnswerValues(item));
  }

  if (typeof value === "boolean") return [value ? "true" : "false"];
  if (typeof value === "number" && Number.isFinite(value)) return [String(value)];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  return [];
}

function normalizeMessage(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}
