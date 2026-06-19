export type QuestionType = "text" | "select" | "radio" | "boolean" | "multiselect";

export interface QuestionOption {
  label: string;
  value: string;
}

export interface OnboardingQuestion {
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  type: QuestionType;
  options?: QuestionOption[];
  is_knockout?: boolean;
  knockout_values?: string[];
  knockout_message?: string;
}

export type OnboardingAnswer = string | string[];

export type OnboardingAnswers = Record<string, OnboardingAnswer>;

export interface OnboardingEligibilityResult {
  eligible: boolean;
  blocked_question_id?: string;
  blocked_question_label?: string;
  message?: string;
}
