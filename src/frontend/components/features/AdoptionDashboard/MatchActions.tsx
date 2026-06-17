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
      <Button variant="outline" className="h-11 w-11 shrink-0 px-0 text-slate-100" onClick={onUndo} disabled={disabled || !onUndo} aria-label="Desfazer">
        <UndoIcon className="h-5 w-5" />
      </Button>
      <Button variant="danger" className="min-w-0 flex-1 px-3 sm:min-w-[132px] sm:flex-none" disabled={disabled} onClick={onReject}>
        <CrossIcon className="h-5 w-5 mr-1.5" /> Recusar
      </Button>
      <Button className="min-w-0 flex-1 px-3 sm:min-w-[132px] sm:flex-none" disabled={disabled} onClick={onAdopt}>
        <PawIcon className="h-5 w-5 mr-1.5" /> Adotar
      </Button>
    </div>
  );
}
