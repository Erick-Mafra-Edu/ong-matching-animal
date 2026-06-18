import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/features/Auth/LoginForm";

interface LoginPageProps {
  searchParams: {
    auth_error?: string;
  };
}

const authErrorMessages: Record<string, string> = {
  access_denied: "Não foi possível validar seu acesso. Solicite um novo link e tente novamente.",
  otp_expired: "Este link de acesso é inválido ou expirou. Solicite um novo link para continuar.",
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const authErrorMessage = searchParams.auth_error ? authErrorMessages[searchParams.auth_error] ?? authErrorMessages.access_denied : "";

  return (
    <main className="grid min-h-screen bg-[#0e0e12] text-white lg:grid-cols-[1fr_560px]">
      <section className="hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.2),_transparent_48%)] p-12 lg:flex lg:flex-col lg:justify-between">
        <Link className="text-lg font-black tracking-tight text-cyan-100" href="/">MATCH<span className="text-pink-400">PET</span></Link>
        <div className="max-w-xl space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Adoção responsável</p>
          <h1 className="text-5xl font-black leading-tight">Seu próximo encontro pode mudar duas vidas.</h1>
          <p className="max-w-lg leading-7 text-slate-300">Entre para descobrir perfis compatíveis com a sua rotina e ajudar ONGs a criar conexões duradouras.</p>
        </div>
        <p className="text-xs text-slate-500">Matching transparente. Adoção consciente.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="animate-state-enter w-full max-w-sm space-y-8">
          <Link className="text-lg font-black tracking-tight text-cyan-100 lg:hidden" href="/">MATCH<span className="text-pink-400">PET</span></Link>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Bem-vindo</p>
            <h2 className="text-3xl font-black text-white">Entre na sua conta</h2>
            <p className="text-sm leading-6 text-slate-400">Após o login, você responderá algumas perguntas para personalizar seus matches.</p>
          </div>
          {authErrorMessage && <p className="rounded-xl border border-pink-400/40 bg-pink-400/10 p-3 text-sm leading-6 text-pink-100" role="alert">{authErrorMessage}</p>}
          <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-white/5" />}>
            <LoginForm />
          </Suspense>
          <p className="text-center text-xs text-slate-500">Ainda não tem conta? <Link className="text-cyan-200 hover:text-cyan-100" href="/cadastro">Cadastre-se</Link></p>
        </div>
      </section>
    </main>
  );
}
