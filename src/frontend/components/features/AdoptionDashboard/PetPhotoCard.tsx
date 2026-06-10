"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { PetProfile } from "@/types/adoption";
import type { CardAction, SwipeDirection } from "./AdoptionDashboard";
import { ChevronIcon, CrossIcon, PawIcon } from "./Icons";
import { ProfileSummary } from "./ProfileSummary";

interface PetPhotoCardProps {
  action?: CardAction | null;
  onActionComplete?: (direction: SwipeDirection) => void;
  pet: PetProfile;
}

const SWIPE_THRESHOLD = 90;
const EXIT_DISTANCE = 560;

export function PetPhotoCard({ action, onActionComplete, pet }: PetPhotoCardProps) {
  const photos = pet.photoUrls?.length ? pet.photoUrls : [pet.photoUrl];
  const [activePhoto, setActivePhoto] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const startX = useRef(0);
  const dragged = useRef(false);
  const processedActionId = useRef<number | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showPhoto(offset: number) {
    setActivePhoto((current) => (current + offset + photos.length) % photos.length);
  }

  useEffect(() => {
    setActivePhoto(0);
    setDragX(0);
    setIsExiting(false);
  }, [pet.id]);

  const animateDecision = useCallback((direction: SwipeDirection) => {
    if (isExiting) return;
    setIsDragging(false);
    setIsExiting(true);
    setDragX(direction === "right" ? EXIT_DISTANCE : -EXIT_DISTANCE);
    resetTimer.current = setTimeout(() => {
      setDragX(0);
      setIsExiting(false);
      onActionComplete?.(direction);
    }, 420);
  }, [isExiting, onActionComplete]);

  useEffect(() => {
    if (!action || processedActionId.current === action.id) return;
    processedActionId.current = action.id;
    animateDecision(action.direction);
  }, [action, animateDecision]);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (isExiting) return;
    startX.current = event.clientX;
    dragged.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (!isDragging || isExiting) return;
    const offset = event.clientX - startX.current;
    if (Math.abs(offset) > 8) dragged.current = true;
    setDragX(offset);
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    if (!isDragging || isExiting) return;
    setIsDragging(false);
    if (Math.abs(dragX) >= SWIPE_THRESHOLD) {
      animateDecision(dragX > 0 ? "right" : "left");
      return;
    }
    setDragX(0);
    if (!dragged.current && window.matchMedia("(max-width: 767px)").matches) {
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX >= bounds.left + bounds.width / 2) showPhoto(1);
    }
  }

  const decision = dragX > 0 ? "right" : dragX < 0 ? "left" : null;
  const decisionOpacity = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);

  return (
    <article
      className="animate-card-enter relative h-[58vh] min-h-[420px] w-full overflow-hidden rounded-r md:h-[72vh] md:max-h-[690px] md:min-h-[560px] md:max-w-[430px] md:rounded"
      aria-label={`Foto de ${pet.name}, perfil para adoção`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        setIsDragging(false);
        setDragX(0);
      }}
    >
      <div
        className={`relative h-full w-full touch-pan-y select-none ${isDragging ? "" : "transition-[transform,opacity] duration-300 ease-out"}`}
        style={{ transform: `translate3d(${dragX}px, 0, 0) rotate(${dragX / 24}deg)`, opacity: isExiting ? 0 : 1 }}
      >
        <div
          className="animate-photo-change absolute inset-0 bg-cover bg-center bg-black"
          style={{ backgroundImage: `url("${photos[activePhoto]}")` }}
          role="img"
          aria-label={`${pet.name} aguardando adoção, foto ${activePhoto + 1} de ${photos.length}`}
        />
        <div className="absolute inset-x-0 top-0 flex gap-3 p-2" aria-hidden="true">
          {photos.map((photo, index) => (
            <span className={`h-1 flex-1 rounded ${index === activePhoto ? "bg-white" : "bg-slate-600/80"}`} key={photo} />
          ))}
        </div>
        <div
          className={`pointer-events-none absolute top-20 flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-black uppercase tracking-widest ${
            decision === "right" ? "right-5 border-cyan-200 text-cyan-100" : "left-5 border-pink-400 text-pink-300"
          }`}
          style={{ opacity: decisionOpacity }}
        >
          {decision === "right" ? <><PawIcon className="h-4 w-4" /> Adotar</> : <><CrossIcon className="text-xl" /> Recusar</>}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent px-6 pb-5 pt-24 md:pb-6">
          <ProfileSummary pet={pet} compact />
        </div>
      </div>
      <button className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white/70 backdrop-blur-sm transition hover:bg-black/55 hover:text-white md:grid" onClick={(event) => { event.stopPropagation(); showPhoto(-1); }} onPointerDown={(event) => event.stopPropagation()} aria-label="Foto anterior">
        <ChevronIcon className="h-5 w-5 rotate-180" />
      </button>
      <button className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white/70 backdrop-blur-sm transition hover:bg-black/55 hover:text-white md:grid" onClick={(event) => { event.stopPropagation(); showPhoto(1); }} onPointerDown={(event) => event.stopPropagation()} aria-label="Próxima foto">
        <ChevronIcon className="h-5 w-5" />
      </button>
    </article>
  );
}
