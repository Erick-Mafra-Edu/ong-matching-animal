import { Button } from "@/components/ui/Button";

interface DashboardStateProps {
  status: "loading" | "empty" | "error";
}

const messages = {
  loading: ["Buscando perfis...", "Estamos procurando uma combinação para você."],
  empty: ["Nenhum perfil disponível", "Volte em breve para conhecer novos candidatos."],
  error: ["Não foi possível carregar", "Tente novamente em alguns instantes."],
};

export function DashboardState({ status }: DashboardStateProps) {
  const [title, description] = messages[status];
  return (
    <section className="grid min-h-screen w-full place-items-center px-6 text-center" aria-live="polite">
      <div className="max-w-sm space-y-3">
        <h1 className="text-2xl font-bold text-cyan-100">{title}</h1>
        <p className="text-sm text-slate-400">{description}</p>
        {status === "error" && <Button className="mt-4">Tentar novamente</Button>}
      </div>
    </section>
  );
}
