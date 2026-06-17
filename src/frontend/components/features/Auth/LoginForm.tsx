"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { syncAuthSessionCookies } from "@/lib/auth/session";
import { requestPasswordRecovery } from "@/lib/account";
import { hasCompletedOnboarding, saveOnboardingAnswersFromMetadata } from "@/lib/onboarding";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
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

      if (data.session) {
        await syncAuthSessionCookies({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        });
      }

      const completed = await hasCompletedOnboarding(supabase, data.user.id) || await saveOnboardingAnswersFromMetadata(supabase, data.user);
      const redirect = searchParams.get("redirect");
      router.push(redirect || (completed ? "/discover" : "/onboarding"));
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Não foi possível conectar ao Supabase.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setNotice("");
    const recoveryEmail = email.trim();

    if (!recoveryEmail) {
      setError("Informe seu e-mail para solicitar a recuperacao de senha.");
      return;
    }

    setRecovering(true);
    try {
      await requestPasswordRecovery(recoveryEmail);
      setNotice("Se o e-mail existir, enviaremos instrucoes para redefinir a senha.");
    } catch (recoveryError) {
      setError(recoveryError instanceof Error ? recoveryError.message : "Nao foi possivel solicitar recuperacao de senha.");
    } finally {
      setRecovering(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">E-mail</span>
        <input className="form-control" name="email" type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Senha</span>
        <input className="form-control" name="password" type="password" autoComplete="current-password" placeholder="Mínimo de 6 caracteres" required />
      </label>
      {error && <p className="text-sm text-pink-300" role="alert">{error}</p>}
      {notice && <p className="text-sm text-cyan-200" role="status">{notice}</p>}
      <Button className="w-full" disabled={loading} type="submit">{loading ? "Entrando..." : "Entrar e continuar"}</Button>
      <button className="w-full text-center text-xs font-bold uppercase tracking-[0.16em] text-cyan-200 transition hover:text-cyan-100 disabled:opacity-50" disabled={recovering || loading} onClick={handleForgotPassword} type="button">
        {recovering ? "Enviando instrucoes..." : "Esqueci minha senha"}
      </button>
    </form>
  );
}
