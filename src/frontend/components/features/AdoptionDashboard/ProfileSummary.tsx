import { Badge } from "@/components/ui/Badge";
import type { PetProfile } from "@/types/adoption";
import { VerifiedIcon } from "./Icons";

interface ProfileSummaryProps {
  pet: PetProfile;
  compact?: boolean;
  tone?: "dark" | "light";
}

export function ProfileSummary({ pet, compact = false, tone = "light" }: ProfileSummaryProps) {
  const isDark = tone === "dark";
  const nameColor = isDark ? "text-white" : "text-slate-950";
  const metaColor = isDark ? "text-slate-200" : "text-slate-700";

  return (
    <section className={compact ? "space-y-3" : "space-y-4"} aria-label={`Informações de ${pet.name}`}>
      <div className="flex items-center gap-2">
        <h1 className={`${compact ? "text-xl" : "text-2xl"} font-bold tracking-tight ${nameColor}`}>
          {pet.name} <span className={`font-normal ${metaColor}`}>{pet.age}</span>
        </h1>
        {pet.verified && <VerifiedIcon className={`h-4 w-4 ${metaColor}`} />}
      </div>
      <div className={`flex flex-wrap gap-1.5 ${compact ? "md:hidden" : ""}`}>
        {pet.traits.map((trait, index) => (
          <span
            className="animate-badge-enter"
            key={`${trait}-${index}`}
            style={{ animationDelay: `${280 + index * 70}ms` }}
          >
            <Badge className={isDark ? "border-cyan-100/35 bg-cyan-100/15 text-cyan-50" : "border-amber-600/45 bg-amber-100/65 text-amber-900"}>{trait}</Badge>
          </span>
        ))}
      </div>
    </section>
  );
}
