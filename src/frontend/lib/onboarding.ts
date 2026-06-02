import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { OnboardingAnswers, OnboardingQuestion } from "@/types/onboarding";

export async function fetchOnboardingQuestions(supabase: SupabaseClient): Promise<OnboardingQuestion[]> {
  const { data, error } = await supabase
    .from("onboarding_questions")
    .select("id,label,description,placeholder,required,type,options")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;
  return data as OnboardingQuestion[];
}

export async function hasCompletedOnboarding(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("tutors")
    .select("custom_fields")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) throw error;
  const customFields = data?.custom_fields as Record<string, unknown> | undefined;
  return customFields?.onboarding_complete === true;
}

export async function saveOnboardingAnswers(supabase: SupabaseClient, user: User, answers: OnboardingAnswers) {
  const customFields = {
    ...answers,
    has_children: answers.has_children === "true",
    onboarding_complete: true,
  };
  const name = String(user.user_metadata.full_name ?? user.email?.split("@")[0] ?? "Adotante");
  const { error } = await supabase
    .from("tutors")
    .upsert({ auth_user_id: user.id, name, custom_fields: customFields }, { onConflict: "auth_user_id" });

  if (error) throw error;
}
