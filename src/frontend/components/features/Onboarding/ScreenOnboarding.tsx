"use client";

import { HelpCircle, MousePointer2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface TourStep {
  description: string;
  selector?: string;
  title: string;
}

interface ScreenTour {
  id: string;
  steps: TourStep[];
}

interface TargetRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

type PopoverSide = "top" | "right" | "bottom" | "left" | "center";

interface PopoverPlacement {
  arrowStyle: Record<string, number | string>;
  side: PopoverSide;
  style: Record<string, number | string>;
}

const tourStoragePrefix = "matchpet-screen-onboarding";
const spotlightPadding = 10;
const popoverMargin = 22;
const popoverMaxWidth = 544;
const popoverEstimatedHeight = 300;

const screenTours: Record<string, ScreenTour> = {
  "/": {
    id: "home",
    steps: [
      {
        title: "Bem-vindo ao MatchPet",
        description: "Aqui voce conhece a proposta da plataforma e inicia sua jornada como tutor interessado em adocao responsavel.",
        selector: "main h1",
      },
      {
        title: "Comece pelo cadastro",
        description: "Use Cadastrar ou Encontrar meu match para criar seu perfil e informar sua rotina antes de ver animais compativeis.",
        selector: 'a[href="/cadastro"]',
      },
      {
        title: "Entenda o fluxo",
        description: "A secao Como funciona resume as etapas: responder perguntas, descobrir perfis e conversar com a ONG.",
        selector: "#como-funciona",
      },
    ],
  },
  "/cadastro": {
    id: "cadastro",
    steps: [
      {
        title: "Cadastro do tutor",
        description: "Preencha seus dados iniciais para criar acesso e permitir que a ONG acompanhe seus interesses.",
        selector: "form",
      },
      {
        title: "Perfil de rotina",
        description: "Depois do cadastro, as respostas de onboarding ajudam o sistema a priorizar animais mais alinhados ao seu contexto.",
        selector: "main section",
      },
      {
        title: "Ja tem conta?",
        description: "Use Entrar no topo da pagina se voce ja possui cadastro e quer continuar o processo.",
        selector: 'a[href="/login"]',
      },
    ],
  },
  "/login": {
    id: "login",
    steps: [
      {
        title: "Entrada na conta",
        description: "Informe seu e-mail para acessar a area de descoberta, seus interesses e o acompanhamento com a ONG.",
        selector: "form",
      },
      {
        title: "Links e erros de acesso",
        description: "Se um link expirar, solicite um novo acesso. Mensagens de validacao aparecem acima do formulario.",
        selector: '[role="alert"], form',
      },
      {
        title: "Primeiro acesso",
        description: "Se ainda nao tiver conta, use o link de cadastro no fim do painel.",
        selector: 'a[href="/cadastro"]',
      },
    ],
  },
  "/onboarding": {
    id: "onboarding",
    steps: [
      {
        title: "Perguntas da ONG",
        description: "Responda as perguntas configuradas pela ONG. Elas formam os dados usados no matching.",
        selector: "form",
      },
      {
        title: "Respostas completas",
        description: "Campos obrigatorios precisam ser preenchidos para salvar o perfil e liberar recomendacoes mais consistentes.",
        selector: "form input, form select, form textarea, form button",
      },
      {
        title: "Matching mais preciso",
        description: "Quanto melhor sua rotina estiver descrita, mais facil fica comparar suas preferencias com os animais disponiveis.",
        selector: "main h1",
      },
    ],
  },
  "/discover": {
    id: "discover",
    steps: [
      {
        title: "Descoberta de animais",
        description: "A tela mostra um animal por vez, priorizado pela compatibilidade com seu perfil.",
        selector: 'article[aria-label*="perfil para adoção"]',
      },
      {
        title: "Trocar foto do animal",
        description: "No desktop, use as setas laterais do card para ver outras fotos. No celular, toque no lado direito da foto para avancar quando houver mais imagens.",
        selector: 'button[aria-label="Próxima foto"], button[aria-label="Foto anterior"], article[aria-label*="perfil para adoção"]',
      },
      {
        title: "Desfazer ultima acao",
        description: "Este botao retorna o ultimo animal descartado ou curtido para a pilha, quando existe historico disponivel.",
        selector: 'div[aria-label="Ações do perfil"] button[aria-label="Desfazer"]',
      },
      {
        title: "Recusar este perfil",
        description: "Use Recusar quando o animal nao combina com sua rotina. O card sai da fila e o proximo perfil e exibido.",
        selector: 'div[aria-label="Ações do perfil"] button:nth-of-type(2)',
      },
      {
        title: "Demonstrar interesse",
        description: "Use Adotar para registrar seu interesse no animal. Depois disso, a plataforma cria o registro e abre as opcoes de contato configuradas pela ONG.",
        selector: 'div[aria-label="Ações do perfil"] button:nth-of-type(3)',
      },
      {
        title: "Contato com a ONG",
        description: "Ao demonstrar interesse, o registro e criado e a plataforma oferece canais configurados pela ONG para continuar a conversa.",
        selector: 'nav[aria-label="Navegação desktop"], nav[aria-label="Navegacao desktop"]',
      },
    ],
  },
  "/interesses": {
    id: "interesses",
    steps: [
      {
        title: "Seus interesses",
        description: "Esta tela lista os animais em que voce demonstrou interesse durante a descoberta.",
        selector: "header",
      },
      {
        title: "Status da entrevista",
        description: "Cada card indica se ja existe entrevista vinculada ou se a ONG ainda precisa agendar.",
        selector: "article, section",
      },
      {
        title: "Detalhes do registro",
        description: "Abra Ver detalhes para acompanhar dados do animal, do tutor e da agenda associada.",
        selector: 'a[href^="/interessados/"], a[href="/discover"]',
      },
    ],
  },
  "/interessados": {
    id: "interessado-detalhe",
    steps: [
      {
        title: "Registro de interesse",
        description: "Aqui a ONG compara os dados do tutor e do animal envolvidos no interesse.",
        selector: "header",
      },
      {
        title: "Informacoes de matching",
        description: "Os paineis mostram campos que ajudam a avaliar compatibilidade e preparar o proximo contato.",
        selector: "main section",
      },
      {
        title: "Agendamento",
        description: "Use Marcar entrevista para abrir a agenda com um rascunho preenchido para esse interesse.",
        selector: "button",
      },
    ],
  },
  "/admin": {
    id: "admin",
    steps: [
      {
        title: "Painel administrativo",
        description: "Gerencie animais, tutores, interesses, perguntas, regras de matching e configuracoes da ONG.",
        selector: "main aside",
      },
      {
        title: "Recursos e formularios",
        description: "Escolha um recurso no menu, pesquise registros e use o painel de edicao para criar ou atualizar dados.",
        selector: "main section",
      },
      {
        title: "Fluxo de adocao",
        description: "As configuracoes daqui alimentam cadastro, onboarding, descoberta, contato e agenda.",
        selector: "main",
      },
    ],
  },
  "/calendario": {
    id: "calendario",
    steps: [
      {
        title: "Agenda administrativa",
        description: "Acompanhe entrevistas, visitas e retornos do processo de adocao em lista, mes ou semana.",
        selector: "header",
      },
      {
        title: "Filtros e eventos",
        description: "Filtre por status e selecione eventos existentes para revisar ou editar as informacoes.",
        selector: "main section",
      },
      {
        title: "Criacao de compromisso",
        description: "Preencha titulo, horario, tutor, animal e interesse para criar um evento conectado ao processo.",
        selector: "aside form, form",
      },
    ],
  },
};

export function ScreenOnboarding() {
  const pathname = usePathname();
  const tour = getTourForPath(pathname);
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  useEffect(() => {
    if (!tour) return;

    const storageKey = getStorageKey(tour.id);
    if (window.localStorage.getItem(storageKey) === "completed") return;

    setCurrentStep(0);
    setIsOpen(true);
  }, [tour]);

  useEffect(() => {
    if (!isOpen || !tour) {
      setTargetRect(null);
      return;
    }

    let frame = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const step = tour.steps[currentStep];

    function updateTargetRect(scrollIntoView = false) {
      const element = findTargetElement(step.selector);

      if (!element) {
        setTargetRect(null);
        return;
      }

      if (scrollIntoView) {
        element.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
      }

      frame = window.requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        setTargetRect({
          height: rect.height,
          left: rect.left,
          top: rect.top,
          width: rect.width,
        });
      });
    }

    updateTargetRect(true);
    timeout = setTimeout(() => updateTargetRect(false), 360);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    function handleViewportChange() {
      updateTargetRect(false);
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [currentStep, isOpen, tour]);

  if (!tour) return null;

  const activeTour = tour;
  const step = activeTour.steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === activeTour.steps.length - 1;
  const spotlight = targetRect ? toSpotlightRect(targetRect) : null;
  const popoverPlacement = getPopoverPlacement(spotlight);
  const cursorStyle = getCursorStyle(spotlight);

  function closeTour() {
    window.localStorage.setItem(getStorageKey(activeTour.id), "completed");
    setIsOpen(false);
  }

  function openHelp() {
    setCurrentStep(0);
    setIsOpen(true);
  }

  return (
    <>
      <button
        aria-label="Abrir ajuda desta tela"
        className="fixed bottom-5 right-5 z-40 inline-flex min-h-12 items-center gap-2 rounded-full border border-cyan-200/35 bg-[#111119]/95 px-4 text-xs font-black uppercase tracking-[0.16em] text-cyan-50 shadow-2xl shadow-black/40 backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-100 hover:bg-cyan-200 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e12] md:bottom-6 md:right-6"
        onClick={openHelp}
        type="button"
      >
        <HelpCircle className="h-4 w-4" />
        Ajuda
      </button>

      {isOpen && (
        <div aria-modal="true" className="fixed inset-0 z-50" role="dialog" aria-labelledby="screen-onboarding-title">
          <button className="absolute inset-0 cursor-default" onClick={closeTour} type="button" aria-label="Fechar tutorial" />
          {spotlight ? (
            <>
              <div
                className="pointer-events-none fixed rounded-[1.35rem] border-2 border-cyan-200/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.74),0_0_32px_rgba(103,232,249,0.34)] transition-all duration-300"
                style={{
                  height: spotlight.height,
                  left: spotlight.left,
                  top: spotlight.top,
                  width: spotlight.width,
                }}
              />
              <MousePointer2
                className="pointer-events-none fixed z-[61] h-9 w-9 -rotate-12 fill-cyan-100 text-slate-950 drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)] transition-all duration-300"
                style={cursorStyle}
              />
            </>
          ) : (
            <div className="pointer-events-none fixed inset-0 bg-black/74" />
          )}

          <div
            className="fixed z-[60] w-[min(calc(100vw-2rem),34rem)] overflow-hidden rounded-2xl border border-cyan-200/15 bg-[#14141b] text-white shadow-2xl shadow-black/55 transition-all duration-300"
            style={popoverPlacement.style}
          >
            {popoverPlacement.side !== "center" && (
              <span
                aria-hidden="true"
                className="pointer-events-none fixed z-[59] h-4 w-4 rotate-45 border border-cyan-200/15 bg-[#14141b] transition-all duration-300"
                style={popoverPlacement.arrowStyle}
              />
            )}
            <div className="absolute inset-x-0 top-0 h-1 bg-slate-800">
              <div
                className="h-full bg-cyan-200 transition-all duration-300"
                style={{ width: `${((currentStep + 1) / activeTour.steps.length) * 100}%` }}
              />
            </div>
            <div className="p-6 pt-7">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                  Tutorial da tela {currentStep + 1} de {activeTour.steps.length}
                </p>
                <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white" id="screen-onboarding-title">{step.title}</h2>
                <p className="text-sm leading-6 text-slate-300">{step.description}</p>
              </div>

              <div className="mt-6 flex gap-2" aria-hidden="true">
                {activeTour.steps.map((item, index) => (
                  <span
                    className={`h-2 flex-1 rounded-full ${index <= currentStep ? "bg-cyan-200" : "bg-white/10"}`}
                    key={item.title}
                  />
                ))}
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button className="sm:mr-auto" onClick={closeTour} type="button" variant="danger-outline">
                  Pular
                </Button>
                <Button disabled={isFirstStep} onClick={() => setCurrentStep((stepIndex) => Math.max(0, stepIndex - 1))} type="button" variant="outline">
                  Voltar
                </Button>
                <Button onClick={() => (isLastStep ? closeTour() : setCurrentStep((stepIndex) => stepIndex + 1))} type="button">
                  {isLastStep ? "Concluir" : "Prosseguir"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getTourForPath(pathname: string | null) {
  if (!pathname) return null;
  if (pathname.startsWith("/interessados/")) return screenTours["/interessados"];
  return screenTours[pathname] ?? null;
}

function getStorageKey(tourId: string) {
  return `${tourStoragePrefix}:${tourId}`;
}

function findTargetElement(selector?: string) {
  if (!selector) return null;

  return selector
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => Array.from(document.querySelectorAll<HTMLElement>(item)))
    .find((element): element is HTMLElement => Boolean(element && element.offsetParent !== null)) ?? null;
}

function toSpotlightRect(rect: TargetRect) {
  const maxWidth = window.innerWidth - spotlightPadding * 2;
  const maxHeight = window.innerHeight - spotlightPadding * 2;
  const left = Math.max(spotlightPadding, rect.left - spotlightPadding);
  const top = Math.max(spotlightPadding, rect.top - spotlightPadding);
  const width = Math.min(maxWidth, rect.width + spotlightPadding * 2, window.innerWidth - left - spotlightPadding);
  const height = Math.min(maxHeight, rect.height + spotlightPadding * 2, window.innerHeight - top - spotlightPadding);

  return { height, left, top, width };
}

function getPopoverPlacement(spotlight: TargetRect | null): PopoverPlacement {
  if (!spotlight) {
    return {
      arrowStyle: {},
      side: "center",
      style: {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      },
    };
  }

  const width = Math.min(window.innerWidth - 32, popoverMaxWidth);
  const height = Math.min(window.innerHeight - 32, popoverEstimatedHeight);
  const spaces = {
    top: spotlight.top,
    right: window.innerWidth - spotlight.left - spotlight.width,
    bottom: window.innerHeight - spotlight.top - spotlight.height,
    left: spotlight.left,
  };
  const preferredSides = getPreferredSides(spotlight);
  const side = preferredSides.find((item) => hasEnoughSpace(item, spaces, width, height))
    ?? preferredSides.sort((a, b) => scoreSide(b, spaces) - scoreSide(a, spaces))[0];
  const style = getSideStyle(side, spotlight, width, height);
  const arrowStyle = getArrowStyle(side, spotlight, style, width, height);

  return { arrowStyle, side, style };
}

function getPreferredSides(spotlight: TargetRect): PopoverSide[] {
  const horizontalCenter = spotlight.left + spotlight.width / 2;
  const verticalCenter = spotlight.top + spotlight.height / 2;
  const verticalPreference: PopoverSide = verticalCenter < window.innerHeight / 2 ? "bottom" : "top";
  const horizontalPreference: PopoverSide = horizontalCenter < window.innerWidth / 2 ? "right" : "left";
  const secondaryVertical: PopoverSide = verticalPreference === "bottom" ? "top" : "bottom";
  const secondaryHorizontal: PopoverSide = horizontalPreference === "right" ? "left" : "right";

  return [verticalPreference, horizontalPreference, secondaryVertical, secondaryHorizontal];
}

function hasEnoughSpace(side: PopoverSide, spaces: Record<Exclude<PopoverSide, "center">, number>, width: number, height: number) {
  if (side === "top" || side === "bottom") return spaces[side] >= height + popoverMargin;
  if (side === "left" || side === "right") return spaces[side] >= width + popoverMargin;
  return false;
}

function scoreSide(side: PopoverSide, spaces: Record<Exclude<PopoverSide, "center">, number>) {
  if (side === "center") return -1;
  return spaces[side];
}

function getSideStyle(side: PopoverSide, spotlight: TargetRect, width: number, height: number): Record<string, number | string> {
  if (side === "top") {
    return {
      left: clamp(spotlight.left + spotlight.width / 2 - width / 2, 16, window.innerWidth - width - 16),
      top: Math.max(16, spotlight.top - height - popoverMargin),
      width,
    };
  }

  if (side === "bottom") {
    return {
      left: clamp(spotlight.left + spotlight.width / 2 - width / 2, 16, window.innerWidth - width - 16),
      top: Math.min(window.innerHeight - height - 16, spotlight.top + spotlight.height + popoverMargin),
      width,
    };
  }

  if (side === "left") {
    return {
      left: Math.max(16, spotlight.left - width - popoverMargin),
      top: clamp(spotlight.top + spotlight.height / 2 - height / 2, 16, window.innerHeight - height - 16),
      width,
    };
  }

  return {
    left: Math.min(window.innerWidth - width - 16, spotlight.left + spotlight.width + popoverMargin),
    top: clamp(spotlight.top + spotlight.height / 2 - height / 2, 16, window.innerHeight - height - 16),
    width,
  };
}

function getArrowStyle(side: PopoverSide, spotlight: TargetRect, style: Record<string, number | string>, width: number, height: number): Record<string, number | string> {
  const left = Number(style.left);
  const top = Number(style.top);

  if (side === "top") {
    return {
      left: clamp(spotlight.left + spotlight.width / 2 - 8, left + 20, left + width - 36),
      top: top + height - 8,
    };
  }

  if (side === "bottom") {
    return {
      left: clamp(spotlight.left + spotlight.width / 2 - 8, left + 20, left + width - 36),
      top: top - 8,
    };
  }

  if (side === "left") {
    return {
      left: left + width - 8,
      top: clamp(spotlight.top + spotlight.height / 2 - 8, top + 20, top + height - 36),
    };
  }

  if (side === "right") {
    return {
      left: left - 8,
      top: clamp(spotlight.top + spotlight.height / 2 - 8, top + 20, top + height - 36),
    };
  }

  return {};
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function getCursorStyle(spotlight: TargetRect | null) {
  if (!spotlight) return { left: "calc(50% + 13rem)", top: "calc(50% - 9rem)" };

  return {
    left: Math.min(window.innerWidth - 52, spotlight.left + spotlight.width * 0.72),
    top: Math.min(window.innerHeight - 52, spotlight.top + spotlight.height * 0.34),
  };
}
