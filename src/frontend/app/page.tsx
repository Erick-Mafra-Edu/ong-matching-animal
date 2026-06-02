import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0e0e12] text-white">
      <section className="relative isolate min-h-screen overflow-hidden px-6 pb-16 pt-6 sm:px-10 lg:px-16">
        <div className="absolute -left-32 top-12 -z-10 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -right-36 bottom-0 -z-10 h-[460px] w-[460px] rounded-full bg-pink-500/15 blur-3xl" />
        <nav className="mx-auto flex max-w-6xl items-center justify-between">
          <Link className="text-lg font-black tracking-tight text-cyan-100" href="/">MATCH<span className="text-pink-400">PET</span></Link>
          <Link className="rounded-full border border-white/15 px-5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-50 transition hover:border-cyan-200 hover:bg-cyan-200/10" href="/login">Entrar</Link>
        </nav>
        <div className="mx-auto grid max-w-6xl items-center gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="animate-details-enter space-y-7">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Tecnologia para adoção responsável</p>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">Encontre uma conexão que cabe na sua vida.</h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">O MatchPet aproxima adotantes e animais acolhidos por ONGs usando preferências reais, rotina e compatibilidade. Menos escolhas por impulso. Mais encontros duradouros.</p>
            <div className="flex flex-wrap gap-3">
              <Link className="rounded-full bg-cyan-200 px-6 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-100" href="/login">Encontrar meu match</Link>
              <a className="rounded-full border border-white/15 px-6 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-200 transition hover:border-white/40" href="#como-funciona">Como funciona</a>
            </div>
          </div>
          <div className="animate-card-enter relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-cyan-300/20 to-pink-400/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl">
              <div className="h-[480px] bg-[url('https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=90')] bg-cover bg-center" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent px-6 pb-6 pt-24">
                <p className="text-2xl font-black text-cyan-50">Yolo <span className="font-normal text-white">2 anos</span></p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-cyan-100"><span className="rounded-full border border-cyan-300/60 px-3 py-1">Companheiro</span><span className="rounded-full border border-cyan-300/60 px-3 py-1">Vacinado</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="border-t border-white/10 bg-black/25 px-6 py-20 sm:px-10 lg:px-16" id="como-funciona">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Como funciona</p>
          <h2 className="mt-3 max-w-xl text-3xl font-black sm:text-4xl">Um processo simples com decisões mais conscientes.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Conte sua rotina", "Responda perguntas personalizadas pela ONG sobre espaço, hábitos e preferências."],
              ["02", "Descubra perfis", "Veja animais priorizados pela compatibilidade e conheça cada história com calma."],
              ["03", "Inicie a conversa", "Demonstre interesse e avance com a ONG para uma adoção responsável."],
            ].map(([number, title, description]) => (
              <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6" key={number}>
                <span className="text-xs font-black tracking-[0.2em] text-pink-300">{number}</span>
                <h3 className="mt-5 text-xl font-bold text-cyan-50">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
