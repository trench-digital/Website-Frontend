'use client';

import PipBoyLayout from "@/components/PipBoyLayout";
import HologramImage from "@/components/HologramImage";
import CollectionStats from "@/components/CollectionStats";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faMagnifyingGlass, 
  faBrain, 
  faLink, 
  faChartLine,
  faChartBar
} from "@fortawesome/free-solid-svg-icons";
import { 
  faTwitter,
  faTelegram,
  faGithub
} from "@fortawesome/free-brands-svg-icons";
import Link from "next/link";

export default function Home() {
  return (
    <PipBoyLayout>
      <div className="flex flex-col items-center w-full pip-border h-full overflow-auto">
        <div className="flex flex-col items-center pt-4 w-full">
          <HologramImage
            images={["/holo-1.png", "/holo-2.png"]}
            width={250}
            height={250}
            alt="Hologram Character"
          />
          <h2 className="text-xl mt-10 text-[var(--pip-glow-green)] drop-shadow-[0_0_4px_var(--pip-glow-green)] font-bold">WELCOME TO TRENCH DIGITAL BETA!</h2>
          <h3 className="text-lg text-center mb-5 text-white drop-shadow-[0_0_3px_var(--pip-glow-green)]">
            The Intelligence Layer for Pump.Fun
          </h3>
          
          {/* Collection Sizes */}
          <CollectionStats />
        </div>

        <div className="p-3 w-full flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <div className="pip-border px-6 p-4 hover:bg-[#041607] transition-colors duration-300 flex flex-col h-full w-full">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 flex items-center justify-center mr-2">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[var(--pip-glow-green)] text-xl drop-shadow-[0_0_3px_var(--pip-glow-green)]" />
                </div>
                <h4 className="text-base font-bold text-white drop-shadow-[0_0_2px_var(--pip-glow-green)]">Real-time Tracking</h4>
              </div>
              <p className="text-sm opacity-90 text-gray-100">
                Instant tracking of Pump.Fun tokens, trades, and calls.
              </p>
            </div>

            <div className="pip-border px-6 p-4 hover:bg-[#041607] transition-colors duration-300 flex flex-col h-full w-full">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 flex items-center justify-center mr-2">
                  <FontAwesomeIcon icon={faBrain} className="text-[var(--pip-glow-green)] text-xl drop-shadow-[0_0_3px_var(--pip-glow-green)]" />
                </div>
                <h4 className="text-base font-bold text-white drop-shadow-[0_0_2px_var(--pip-glow-green)]">AI-Powered Analysis</h4>
              </div>
              <p className="text-sm opacity-90 text-gray-100">
                AI precisely identifies narratives and themes from token
                metadata.
              </p>
            </div>

            <div className="pip-border px-6 p-4 hover:bg-[#041607] transition-colors duration-300 flex flex-col h-full w-full">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 flex items-center justify-center mr-2">
                  <FontAwesomeIcon icon={faLink} className="text-[var(--pip-glow-green)] text-xl drop-shadow-[0_0_3px_var(--pip-glow-green)]" />
                </div>
                <h4 className="text-base font-bold text-white drop-shadow-[0_0_2px_var(--pip-glow-green)]">Category Grouping</h4>
              </div>
              <p className="text-sm opacity-90 text-gray-100">
                Groups similar tokens together to identify emerging trends.
              </p>
            </div>

            <div className="pip-border px-6 p-4 hover:bg-[#041607] transition-colors duration-300 flex flex-col h-full w-full">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 flex items-center justify-center mr-2">
                  <FontAwesomeIcon icon={faChartLine} className="text-[var(--pip-glow-green)] text-xl drop-shadow-[0_0_3px_var(--pip-glow-green)]" />
                </div>
                <h4 className="text-base font-bold text-white drop-shadow-[0_0_2px_var(--pip-glow-green)]">Multi-timeframe Analysis</h4>
              </div>
              <p className="text-sm opacity-90 text-gray-100">
                Track performance across multiple timeframes (30m-24h).
              </p>
            </div>
          </div>

          <div className="mt-6 md:mt-8 lg:mt-10">
            <p className="text-center text-sm text-gray-100 drop-shadow-[0_0_1px_var(--pip-glow-green)]">
              Stay ahead of the curve with Trench Digital - your strategic
              advantage in the Solana memecoin battlefield.
            </p>
            
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mt-6 mb-4">
              <Link href="https://x.com/trench_digital" target="_blank" rel="noopener noreferrer" className="text-[var(--pip-glow-green)] hover:opacity-80 transition-opacity my-1 drop-shadow-[0_0_2px_var(--pip-glow-green)] hover:drop-shadow-[0_0_4px_var(--pip-glow-green)]">
                <div className="flex items-center">
                  <div className="w-6 h-6 flex items-center justify-center mr-2">
                    <FontAwesomeIcon icon={faTwitter} size="lg" fixedWidth />
                  </div>
                  <span className="text-sm">Twitter</span>
                </div>
              </Link>
              <Link href="https://github.com/trench-digital" target="_blank" rel="noopener noreferrer" className="text-[var(--pip-glow-green)] hover:opacity-80 transition-opacity my-1 drop-shadow-[0_0_2px_var(--pip-glow-green)] hover:drop-shadow-[0_0_4px_var(--pip-glow-green)]">
                <div className="flex items-center">
                  <div className="w-6 h-6 flex items-center justify-center mr-2">
                    <FontAwesomeIcon icon={faGithub} size="lg" fixedWidth />
                  </div>
                  <span className="text-sm">GitHub</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PipBoyLayout>
  );
}
