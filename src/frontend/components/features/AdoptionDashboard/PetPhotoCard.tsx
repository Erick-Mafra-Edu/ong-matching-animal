import type { PetProfile } from "@/types/adoption";
import { ProfileSummary } from "./ProfileSummary";

interface PetPhotoCardProps {
  pet: PetProfile;
}

export function PetPhotoCard({ pet }: PetPhotoCardProps) {
  return (
    <article
      className="relative h-[58vh] min-h-[420px] w-full overflow-hidden rounded-r md:h-[72vh] md:max-h-[690px] md:min-h-[560px] md:max-w-[430px] md:rounded"
      aria-label={`Foto de ${pet.name}, perfil para adoção`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${pet.photoUrl}")` }}
        role="img"
        aria-label={`${pet.name} aguardando adoção`}
      />
      <div className="absolute inset-x-0 top-0 flex gap-3 p-2" aria-hidden="true">
        <span className="h-1 flex-1 rounded bg-white" />
        <span className="h-1 flex-1 rounded bg-slate-600/80" />
        <span className="h-1 flex-1 rounded bg-slate-600/80" />
        <span className="h-1 flex-1 rounded bg-slate-600/80" />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent px-6 pb-5 pt-24 md:pb-6">
        <ProfileSummary pet={pet} compact />
      </div>
    </article>
  );
}
