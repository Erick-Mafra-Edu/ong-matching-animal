import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PasswordResetForm } from "@/components/features/Auth/PasswordResetForm";

const navigationLinkClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-6 text-xs font-bold uppercase tracking-wide text-slate-100 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-white/5 hover:text-white";

export default function RedefinirSenhaPage() {
  return (
    <main className="grid min-h-screen bg-[#0e0e12] text-white place-items-center px-5">
      <div className="w-full max-w-[440px]">
        <header className="mb-8 text-center">
          <Link className="text-2xl font-black tracking-tight text-cyan-100" href="/">
            MATCH<span className="text-pink-400">PET</span>
          </Link>
          <h1 className="mt-6 text-2xl font-black">Crie sua nova senha</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Escolha uma senha segura para proteger sua conta.
          </p>
        </header>

        <section className="animate-state-enter rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl sm:p-8">
          <PasswordResetForm />
        </section>

        <footer className="mt-8 text-center">
          <Link className={navigationLinkClass} href="/login">
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Link>
        </footer>
      </div>
    </main>
  );
}
