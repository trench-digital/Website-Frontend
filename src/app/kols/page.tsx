'use client';

import PipBoyLayout from "@/components/PipBoyLayout";
import HologramImage from "@/components/HologramImage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserAstronaut } from "@fortawesome/free-solid-svg-icons";

export default function KOLsPage() {
  return (
    <PipBoyLayout>
      <div className="flex flex-col items-center justify-center w-full pip-border h-full overflow-auto">
        <HologramImage
          images={["/holo-1.png", "/holo-2.png"]}
          width={250}
          height={250}
          alt="Hologram Character"
        />
        
        <div className="flex items-center mt-8">
          <FontAwesomeIcon 
            icon={faUserAstronaut} 
            className="text-[var(--pip-glow-green)] text-3xl mr-3 drop-shadow-[0_0_5px_var(--pip-glow-green)]" 
          />
          <h1 className="text-4xl font-bold text-[var(--pip-glow-green)] drop-shadow-[0_0_5px_var(--pip-glow-green)]">
            KOLs
          </h1>
        </div>
        
        <h2 className="text-5xl font-vt323 animate-pulse text-[var(--pip-glow-green)] drop-shadow-[0_0_8px_var(--pip-glow-green)] mt-6">
          IN PROGRESS...
        </h2>
        
        <p className="mt-6 text-center text-white opacity-80 max-w-md">
          Follow our announcement channels to be the first to know when KOL tracking goes live.
        </p>
      </div>
    </PipBoyLayout>
  );
}
