"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { hasCompletedOnboarding, saveOnboardingAnswersFromMetadata } from "@/lib/onboarding";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || password.length < 6) {
      setError("Informe um e-mail válido e uma senha com pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError || !data.user) {
        setError("Não foi possível entrar. Confira seu e-mail e senha.");
        return;
      }

      const completed = await hasCompletedOnboarding(supabase, data.user.id) || await saveOnboardingAnswersFromMetadata(supabase, data.user);
      router.push(completed ? "/discover" : "/onboarding");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Não foi possível conectar ao Supabase.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">E-mail</span>
        <input className="form-control" name="email" type="email" autoComplete="email" placeholder="voce@email.com" required />
      </label>
      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Senha</span>
        <input className="form-control" name="password" type="password" autoComplete="current-password" placeholder="Mínimo de 6 caracteres" required />
      </label>
      {error && <p className="text-sm text-pink-300" role="alert">{error}</p>}
      <Button className="w-full" disabled={loading} type="submit">{loading ? "Entrando..." : "Entrar e continuar"}</Button>
    </form>
  );
}
