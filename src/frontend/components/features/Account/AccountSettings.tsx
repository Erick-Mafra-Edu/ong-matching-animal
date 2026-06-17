"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AccountSessionError, changeAccountPassword, fetchAccountProfile, updateAccountName, type AccountProfile } from "@/lib/account";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AccountSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [error, setError] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchAccountProfile()
      .then((account) => {
        if (!isMounted) return;
        setProfile(account);
        setName(account.name);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        if (loadError instanceof AccountSessionError) {
          router.replace("/login?redirect=/perfil");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Nao foi possivel carregar o perfil.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setProfileMessage("");
    setSavingName(true);

    try {
      const nextName = name.trim();
      await updateAccountName(nextName);
      setName(nextName);
      setProfile((current) => current ? { ...current, name: nextName } : current);
      setProfileMessage("Nome atualizado.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Nao foi possivel atualizar o perfil.");
    } finally {
      setSavingName(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPasswordMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = String(formData.get("current_password") ?? "");
    const newPassword = String(formData.get("new_password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    if (newPassword !== confirmPassword) {
      setError("A confirmacao da nova senha nao confere.");
      return;
    }

    setSavingPassword(true);
    try {
      await changeAccountPassword(currentPassword, newPassword);
      form.reset();
      setPasswordMessage("Senha alterada. Use a nova senha no proximo login.");
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Nao foi possivel alterar a senha.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0e0e12] px-5 text-white">
        <p className="animate-loading-pulse text-sm uppercase tracking-[0.25em] text-cyan-100">Carregando perfil...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0e0e12] px-5 text-white">
        <div className="max-w-md rounded-2xl border border-pink-400/40 bg-pink-400/10 p-5 text-sm leading-6 text-pink-100" role="alert">
          <p>{error || "Nao foi possivel carregar o perfil."}</p>
          <button className="mt-4 rounded-full border border-pink-200/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-pink-100 transition hover:bg-pink-200/10" onClick={() => window.location.reload()} type="button">
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0e0e12] px-5 py-8 text-white sm:px-8 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="text-lg font-black tracking-tight text-cyan-100" href="/discover">MATCH<span className="text-pink-400">PET</span></Link>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Conta e seguranca</p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-50 transition hover:border-cyan-200 hover:bg-cyan-200/10" href="/discover">Voltar</Link>
            <button className="rounded-full border border-pink-400/40 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-pink-200 transition hover:bg-pink-400/10" onClick={handleLogout} type="button">Sair</button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <AccountCard title="Informacoes pessoais" description="Altere o nome exibido para a ONG e nos seus registros de interesse.">
              <form className="space-y-4" onSubmit={handleNameSubmit}>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Nome</span>
                  <input className="form-control" minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} required />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">E-mail</span>
                  <input className="form-control opacity-70" value={profile?.email ?? ""} disabled />
                </label>
                {profileMessage && <p className="text-sm text-cyan-200" role="status">{profileMessage}</p>}
                <Button disabled={savingName || name.trim() === profile.name} type="submit">{savingName ? "Salvando..." : "Salvar nome"}</Button>
              </form>
            </AccountCard>

            <AccountCard title="Senha" description="A troca de senha passa pelo backend e exige sua senha atual antes de atualizar o Supabase Auth.">
              <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Senha atual</span>
                  <input className="form-control" name="current_password" type="password" autoComplete="current-password" required />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Nova senha</span>
                  <input className="form-control" minLength={8} name="new_password" type="password" autoComplete="new-password" required />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Confirmar nova senha</span>
                  <input className="form-control" minLength={8} name="confirm_password" type="password" autoComplete="new-password" required />
                </label>
                {passwordMessage && <p className="text-sm text-cyan-200" role="status">{passwordMessage}</p>}
                <Button disabled={savingPassword} type="submit">{savingPassword ? "Alterando..." : "Alterar senha"}</Button>
              </form>
            </AccountCard>
          </div>

          <AccountCard title="Questionario" description="Quando a ONG altera as perguntas, voce precisa revisar suas respostas para manter os matches atualizados.">
            <div className={`rounded-2xl border p-4 ${profile?.onboarding_outdated ? "border-red-400/50 bg-red-400/10" : "border-cyan-300/25 bg-cyan-300/10"}`}>
              <p className="text-sm font-bold text-white">{profile?.onboarding_outdated ? "Questionario atualizado pela ONG" : "Questionario em dia"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {profile?.onboarding_outdated
                  ? "Revise suas respostas para que o indicador vermelho desapareca e seus matches reflitam as perguntas novas."
                  : "Suas respostas estao sincronizadas com a versao atual do questionario."}
              </p>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <AccountDate label="Concluido por voce" value={profile?.onboarding_completed_at} />
              <AccountDate label="Ultima alteracao da ONG" value={profile?.questionnaire_updated_at} />
            </dl>
            <Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-200 px-5 text-xs font-bold uppercase tracking-wide text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-100" href="/onboarding">
              Revisar questionario
            </Link>
          </AccountCard>
        </section>

        {error && <p className="mt-5 rounded-xl border border-pink-400/40 bg-pink-400/10 p-3 text-sm leading-6 text-pink-100" role="alert">{error}</p>}
      </div>
    </main>
  );
}

function AccountCard({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl sm:p-6">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AccountDate({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd className="mt-1 font-mono text-sm text-cyan-100">{value ? new Date(value).toLocaleString("pt-BR") : "Ainda nao registrado"}</dd>
    </div>
  );
}
