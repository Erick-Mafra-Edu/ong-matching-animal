"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { syncAuthSessionCookies } from "@/lib/auth/session";
import { backendApiUrl } from "@/lib/backend";
import { saveOnboardingAnswers } from "@/lib/onboarding";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { OnboardingAnswer, OnboardingAnswers, OnboardingQuestion } from "@/types/onboarding";

export function SignupForm() {
  const router = useRouter();
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [submitted, setSubmitted] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function loadQuestions() {
      try {
        const response = await fetch(backendApiUrl("/api/onboarding-questions"));

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message ?? "Não foi possível carregar as perguntas.");
        }

        setQuestions(data as OnboardingQuestion[]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as perguntas.");
      } finally {
        setLoadingQuestions(false);
      }
    }

    void loadQuestions();
  }, []);

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
    setError("");
    setNotice("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!name || !email || password.length < 6) {
      setError("Informe nome, e-mail e uma senha com pelo menos 6 caracteres.");
      return;
    }

    if (missingRequired.length > 0) {
      setError("Responda todas as perguntas obrigatórias para continuar.");
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, onboarding_answers: answers },
        },
      });

      if (signupError || !data.user) {
        setError(signupError?.message ?? "Não foi possível criar sua conta.");
        return;
      }

      if (!data.session) {
        setNotice("Conta criada. Confirme seu e-mail e entre para finalizar o perfil.");
        return;
      }

      await syncAuthSessionCookies({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      });
      await saveOnboardingAnswers(supabase, data.user, answers);

      router.push("/discover");
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Não foi possível concluir o cadastro.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingQuestions) {
    return <p className="animate-loading-pulse py-16 text-center text-sm uppercase tracking-[0.25em] text-cyan-100">Carregando perguntas...</p>;
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo">
          <input className="form-control" name="name" placeholder="Rodrigo Silva" required />
        </Field>
        <Field label="E-mail">
          <input className="form-control" name="email" placeholder="você@email.com" required type="email" />
        </Field>
      </div>

      <Field label="Senha">
        <input className="form-control" minLength={6} name="password" placeholder="Mínimo de 6 caracteres" required type="password" />
      </Field>

      <div className="space-y-5">
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
      </div>

      {error && <p className="text-sm text-pink-300" role="alert">{error}</p>}
      {notice && <p className="rounded-xl border border-cyan-200/30 bg-cyan-200/10 p-3 text-sm leading-6 text-cyan-50" role="status">{notice}</p>}
      <Button className="w-full" disabled={saving || questions.length === 0} type="submit">{saving ? "Criando conta..." : "Criar conta e ver matches"}</Button>
    </form>
  );
}

interface FieldProps {
  children: ReactNode;
  label: string;
}

function Field({ children, label }: FieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">{label}</span>
      {children}
    </label>
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
          <option value="">{question.placeholder ?? "Selecione uma opção"}</option>
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
