import Link from "next/link";
import { hideSignupLocationFields } from "@/flags";
import { SignupForm } from "@/components/features/Signup/SignupForm";

export default async function CadastroPage() {
  const shouldHideLocationFields = await hideSignupLocationFields();

  return (
    <main className="min-h-screen bg-[#0e0e12] px-5 py-8 text-white sm:px-8 lg:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 flex items-center justify-between gap-4">
          <Link className="text-lg font-black tracking-tight text-cyan-100" href="/">MATCH<span className="text-pink-400">PET</span></Link>
          <Link className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-50 transition hover:border-cyan-200 hover:bg-cyan-200/10" href="/login">Entrar</Link>
        </header>

        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <section className="space-y-5">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Cadastro de tutor</p>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl">Conte sua rotina para encontrar animais compatíveis.</h1>
            <p className="leading-7 text-slate-400">O perfil usa as perguntas configuradas pela ONG para preencher os campos flexíveis do tutor e aproximar sua rotina dos animais disponíveis para adoção.</p>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              
            </div>
          </section>

          <section className="animate-state-enter rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl sm:p-6">
            <SignupForm hideLocationFields={shouldHideLocationFields} />
          </section>
        </div>
      </div>
    </main>
  );
}
