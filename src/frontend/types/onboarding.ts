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
}

export type OnboardingAnswer = string | string[];

export type OnboardingAnswers = Record<string, OnboardingAnswer>;
