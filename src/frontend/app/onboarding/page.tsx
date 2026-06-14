import Link from "next/link";
import { OnboardingForm } from "@/components/features/Onboarding/OnboardingForm";
import { ScreenOnboardingRuntime } from "@/components/features/Onboarding/ScreenOnboardingRuntime";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#0e0e12] px-5 py-8 text-white sm:px-8 lg:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 flex items-center justify-between">
          <Link className="text-lg font-black tracking-tight text-cyan-100" href="/">MATCH<span className="text-pink-400">PET</span></Link>
          <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100">Perfil obrigatório</span>
        </header>
        <section className="mb-10 space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Antes de começar</p>
          <h1 className="text-3xl font-black sm:text-4xl">Vamos encontrar o perfil certo para você.</h1>
          <p className="max-w-2xl leading-7 text-slate-400">As perguntas são configuradas pela ONG e carregadas dinamicamente. Suas respostas ajudam a priorizar animais compatíveis com sua rotina.</p>
        </section>
        <OnboardingForm />
      </div>
      <ScreenOnboardingRuntime />
    </main>
  );
}
