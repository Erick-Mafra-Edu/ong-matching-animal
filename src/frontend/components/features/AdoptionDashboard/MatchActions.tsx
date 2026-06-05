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
      <Button variant="outline" className="h-11 w-11 shrink-0 px-0 text-2xl" onClick={onUndo} disabled={disabled || !onUndo} aria-label="Desfazer">
        <UndoIcon />
      </Button>
      <Button variant="danger" className="min-w-0 flex-1 px-3 sm:min-w-[132px] sm:flex-none" disabled={disabled} onClick={onReject}>
        <CrossIcon className="text-2xl leading-none" /> Recusar
      </Button>
      <Button className="min-w-0 flex-1 px-3 sm:min-w-[132px] sm:flex-none" disabled={disabled} onClick={onAdopt}>
        <PawIcon className="h-4 w-4" /> Adotar
      </Button>
    </div>
  );
}
