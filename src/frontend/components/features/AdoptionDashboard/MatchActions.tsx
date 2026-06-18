import { Button } from "@/components/ui/Button";
import { CrossIcon, PawIcon, UndoIcon } from "./Icons";

interface MatchActionsProps {
  disabled?: boolean;
  onAdopt?: () => void;
  onReject?: () => void;
  onUndo?: () => void;
}

export function MatchActions({ disabled = false, onAdopt, onReject, onUndo }: MatchActionsProps) {
  return (
    <div className="flex w-full items-center justify-between gap-4" aria-label="Ações do perfil">
      <button
        aria-label="Desfazer"
        className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-400 bg-white text-slate-700 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-accent-600 hover:bg-accent-500/10 hover:text-accent-700 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/20 dark:bg-transparent dark:text-slate-100 dark:disabled:border-white/10 dark:disabled:text-slate-400"
        disabled={disabled || !onUndo}
        onClick={onUndo}
        title="Desfazer"
        type="button"
      >
        <UndoIcon className="h-5 w-5" />
        <span className="sr-only">Desfazer</span>
      </button>
      <Button variant="danger" className="min-w-0 flex-1 px-3 sm:min-w-[132px] sm:flex-none" disabled={disabled} onClick={onReject}>
        <CrossIcon className="h-5 w-5 mr-1.5" /> Recusar
      </Button>
      <Button className="min-w-0 flex-1 px-3 sm:min-w-[132px] sm:flex-none" disabled={disabled} onClick={onAdopt}>
        <PawIcon className="h-5 w-5 mr-1.5" /> Adotar
      </Button>
    </div>
  );
}
