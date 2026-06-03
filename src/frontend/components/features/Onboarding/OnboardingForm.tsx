"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { fetchOnboardingQuestions, saveOnboardingAnswers } from "@/lib/onboarding";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { OnboardingAnswer, OnboardingAnswers, OnboardingQuestion } from "@/types/onboarding";

export function OnboardingForm() {
  const router = useRouter();
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function loadQuestions() {
      try {
        const { data, error } = await getSupabaseBrowserClient().auth.getUser();
        if (error || !data.user) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
        setQuestions(await fetchOnboardingQuestions(getSupabaseBrowserClient()));
        setLoading(false);
      } catch {
        setLoading(false);
        setLoadError(true);
      }
    }

    void loadQuestions();
  }, [router]);

  const missingRequired = useMemo(
    () => questions.filter((question) => {
      const answer = answers[question.id];
      return question.required && (!answer || (Array.isArray(answer) && answer.length === 0));
    }),
    [answers, questions],
  );

  function updateAnswer(questionId: string, answer: OnboardingAnswer) {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
  }

  function toggleAnswer(questionId: string, value: string) {
    const current = answers[questionId];
    const selected = Array.isArray(current) ? current : [];
    updateAnswer(questionId, selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (missingRequired.length > 0) return;
    if (!user) return;
    setError("");
    setSaving(true);
    try {
      await saveOnboardingAnswers(getSupabaseBrowserClient(), user, answers);
      router.push("/discover");
    } catch {
      setError("Não foi possível salvar suas respostas. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="animate-loading-pulse py-16 text-center text-sm uppercase tracking-[0.25em] text-cyan-100">Carregando perguntas...</p>;
  }

  if (loadError) {
    return <p className="rounded-2xl border border-pink-400/40 bg-pink-400/10 p-5 text-sm leading-6 text-pink-100" role="alert">Não foi possível carregar as perguntas. Verifique se a migration de onboarding foi aplicada no Supabase e tente novamente.</p>;
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      {questions.map((question, index) => (
        <QuestionField
          answer={answers[question.id]}
          hasError={submitted && missingRequired.some(({ id }) => id === question.id)}
          index={index}
          key={question.id}
          onChange={(answer) => updateAnswer(question.id, answer)}
          onToggle={(value) => toggleAnswer(question.id, value)}
          question={question}
        />
      ))}
      {submitted && missingRequired.length > 0 && (
        <p className="text-sm text-pink-300" role="alert">Responda todas as perguntas obrigatórias para continuar.</p>
      )}
      {error && <p className="text-sm text-pink-300" role="alert">{error}</p>}
      <Button className="w-full sm:w-auto" disabled={saving} type="submit">{saving ? "Salvando..." : "Ver meus matches"}</Button>
    </form>
  );
}

interface QuestionFieldProps {
  answer?: OnboardingAnswer;
  hasError: boolean;
  index: number;
  onChange: (answer: OnboardingAnswer) => void;
  onToggle: (value: string) => void;
  question: OnboardingQuestion;
}

function QuestionField({ answer, hasError, index, onChange, onToggle, question }: QuestionFieldProps) {
  const options = question.options ?? [];
  const selected = Array.isArray(answer) ? answer : [];

  return (
    <fieldset className={`animate-state-enter space-y-3 rounded-2xl border bg-white/[0.035] p-5 ${hasError ? "border-pink-400/80" : "border-white/10"}`} style={{ animationDelay: `${index * 60}ms` }}>
      <legend className="px-1 text-base font-bold text-cyan-50">
        {question.label} {question.required && <span className="text-pink-300">*</span>}
      </legend>
      {question.description && <p className="text-sm leading-6 text-slate-400">{question.description}</p>}
      {question.type === "text" && <textarea className="form-control min-h-24 resize-y" placeholder={question.placeholder} value={String(answer ?? "")} onChange={(event) => onChange(event.target.value)} />}
      {question.type === "select" && (
        <select className="form-control" value={String(answer ?? "")} onChange={(event) => onChange(event.target.value)}>
          <option value="">{question.placeholder}</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      )}
      {(question.type === "radio" || question.type === "boolean") && (
        <div className="flex flex-wrap gap-2">
          {(question.type === "boolean" ? [{ label: "Sim", value: "true" }, { label: "Não", value: "false" }] : options).map((option) => (
            <OptionButton active={answer === option.value} key={option.value} label={option.label} onClick={() => onChange(option.value)} />
          ))}
        </div>
      )}
      {question.type === "multiselect" && (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => <OptionButton active={selected.includes(option.value)} key={option.value} label={option.label} onClick={() => onToggle(option.value)} />)}
        </div>
      )}
    </fieldset>
  );
}

interface OptionButtonProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

function OptionButton({ active, label, onClick }: OptionButtonProps) {
  return <button className={`rounded-full border px-4 py-2 text-sm transition ${active ? "border-cyan-200 bg-cyan-200 text-slate-950" : "border-white/15 text-slate-300 hover:border-cyan-200/70 hover:text-cyan-100"}`} onClick={onClick} type="button">{label}</button>;
}
