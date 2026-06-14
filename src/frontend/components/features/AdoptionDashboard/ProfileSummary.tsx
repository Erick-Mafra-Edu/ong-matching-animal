import { Badge } from "@/components/ui/Badge";
import type { PetProfile } from "@/types/adoption";
import { VerifiedIcon } from "./Icons";

interface ProfileSummaryProps {
  pet: PetProfile;
  compact?: boolean;
}

export function ProfileSummary({ pet, compact = false }: ProfileSummaryProps) {
  return (
    <section className={compact ? "space-y-3" : "space-y-4"} aria-label={`Informações de ${pet.name}`}>
      <div className="flex items-center gap-2">
        <h1 className={`${compact ? "text-xl" : "text-2xl"} font-bold tracking-tight text-cyan-100`}>
          {pet.name} <span className="font-normal text-white">{pet.age}</span>
        </h1>
        {pet.verified && <VerifiedIcon className="h-4 w-4" />}
      </div>
      <div className={`flex flex-wrap gap-1.5 ${compact ? "md:hidden" : ""}`}>
        {pet.traits.map((trait, index) => (
          <span
            className="animate-badge-enter"
            key={`${trait}-${index}`}
            style={{ animationDelay: `${280 + index * 70}ms` }}
          >
            <Badge>{trait}</Badge>
          </span>
        ))}
      </div>
    </section>
  );
}
