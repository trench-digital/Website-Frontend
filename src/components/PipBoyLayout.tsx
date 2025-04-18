"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ApiStatus from "./ApiStatus";
import TrenchThoughtProcess from "./TrenchThoughtProcess";
import SolPrice from "./SolPrice";
import Image from "next/image";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTerminal, faTimes, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useGlobalState } from "@/context/GlobalStateContext";

export default function PipBoyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [showThoughtProcess, setShowThoughtProcess] = useState(false);
  const { wsStatus } = useGlobalState();
  const isLoading = wsStatus === 'connecting';

  // Auto-close mobile view when screen grows
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setShowThoughtProcess(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  console.log("PipBoyLayout rendered with pathname:", pathname);

  // Check if we're on the home page
  const isHomePage = pathname === "/";

  // Dynamic grid layout based on current page
  const gridLayoutClass = isHomePage 
    ? "w-full h-full grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-3 md:gap-6"
    : "w-full h-full";

  // Shared TrenchThoughtProcess component with header
  const thoughtProcessPanel = (isMobile: boolean) => (
    <div className={`${isMobile ? '' : 'pip-border'} h-full w-full flex flex-col overflow-hidden`}>
      <h3 className={`text-lg ${isMobile ? 'p-3' : 'mb-2 md:mb-3 pb-2'} border-b border-[var(--pip-glow-green)] bg-[var(--pip-bg-color)] flex-shrink-0 flex items-center gap-2 z-10`}>
        <div className={`transition-all duration-1000 ease-out flex items-center gap-2 ${isLoading ? 'scale-125' : 'scale-100'}`}>
          <FontAwesomeIcon 
            icon={faTerminal} 
            className={`text-[var(--pip-glow-green)] drop-shadow-[0_0_3px_var(--pip-glow-green)] transition-all duration-1000`}
          />
        </div>
        <span className={`ml-1 transition-all duration-1000 text-[var(--pip-glow-green)] drop-shadow-[0_0_3px_var(--pip-glow-green)] ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
         REALTIME THOUGHT PROCESS
        </span>
        {isLoading && (
          <FontAwesomeIcon 
            icon={faSpinner} 
            className="text-[var(--pip-glow-green)] drop-shadow-[0_0_3px_var(--pip-glow-green)] animate-spin ml-2"
            size="xs"
          />
        )}
      </h3>
      <div className="flex-grow h-full w-full relative">
        <div className="absolute inset-0 overflow-auto pb-6">
          <TrenchThoughtProcess />
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen h-screen max-h-screen p-3 sm:p-3 md:p-4 gap-1 sm:gap-2 md:gap-3 font-[family-name:var(--font-geist-mono)]">
      {/* Header */}
      <header className="relative w-full py-0 mb-0">
        <div className="flex flex-row items-center">
          <div
            className="hidden sm:block flex-1 border-t-2 border-[var(--pip-glow-green)] opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, var(--pip-glow-green), var(--pip-transparent))",
              backgroundRepeat: "no-repeat",
              backgroundSize: "3px 3vh",
              backgroundPosition: "left",
            }}
          ></div>

          <div className="flex items-center ml-0 sm:ml-2 md:ml-4 w-16 sm:w-20 md:w-24">
            <SolPrice />
          </div>

          <div className="flex-auto flex justify-center items-center py-0">
            {/* Logo instead of Hologram mascot */}
            <Link href="/">
              <Image
                src="/logo.png"
                alt="Logo"
                width={120}
                height={120}
                className="w-[70px] h-auto sm:w-[90px] md:w-[110px] -my-1"
                priority
              />
            </Link>
          </div>

          <div className="flex items-center mr-0 sm:mr-2 md:mr-4 w-16 sm:w-20 md:w-24 justify-end">
            <ApiStatus />
          </div>

          <div
            className="hidden sm:block flex-1 border-t-2 border-[var(--pip-glow-green)] opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, var(--pip-glow-green), var(--pip-transparent))",
              backgroundRepeat: "no-repeat",
              backgroundSize: "3px 3vh",
              backgroundPosition: "right",
            }}
          ></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-start justify-center h-full w-full overflow-hidden">
        <div className={gridLayoutClass}>
          <div className="h-full w-full overflow-auto flex flex-col">{children}</div>

          {/* Trench's Thought Process Panel - Desktop */}
          {isHomePage && (
            <div className="hidden lg:flex h-full w-full">
              {thoughtProcessPanel(false)}
            </div>
          )}
          
          {/* Mobile Thought Process Toggle Button - Only on Home Page */}
          {isHomePage && (
            <div className="lg:hidden fixed bottom-20 right-4 z-20">
              <button 
                onClick={() => setShowThoughtProcess(!showThoughtProcess)}
                className="pip-border text-sm p-2 rounded-full w-12 h-12 flex items-center justify-center"
                aria-label="Toggle Trench's Thought Process"
              >
                {showThoughtProcess ? (
                  <FontAwesomeIcon icon={faTimes} className="text-[var(--pip-glow-green)] text-xl drop-shadow-[0_0_3px_var(--pip-glow-green)]" />
                ) : (
                  <FontAwesomeIcon icon={faTerminal} className="text-[var(--pip-glow-green)] text-xl drop-shadow-[0_0_3px_var(--pip-glow-green)]" />
                )}
              </button>
            </div>
          )}
          
          {/* Mobile Thought Process Panel - Only shown when toggled and on Home Page */}
          {isHomePage && showThoughtProcess && (
            <div className="lg:hidden fixed inset-0 z-10 bg-black bg-opacity-90 flex flex-col h-full w-full">
              <div className="pip-border w-full h-full overflow-hidden flex flex-col">
                <div className="flex-grow overflow-hidden flex flex-col">
                  {thoughtProcessPanel(true)}
                </div>
                <div className="h-16 flex-shrink-0"></div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer>
        <div className="flex flex-col sm:flex-row items-center">
          <div
            className="hidden sm:block flex-1 border-b-2 border-[var(--pip-glow-green)] opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(to top, var(--pip-glow-green), var(--pip-transparent))",
              backgroundRepeat: "no-repeat",
              backgroundSize: "3px 5vh",
              backgroundPosition: "left",
            }}
          ></div>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 px-2 sm:px-4 w-full sm:w-auto">
            <Link
              href="/"
              className={`pip-button ${
                pathname === "/" ? "pip-button-active" : ""
              } text-center text-sm sm:text-base`}
            >
              [A] HOME
            </Link>

            <Link
              href="/keywords"
              className={`pip-button ${
                pathname === "/keywords" || pathname.startsWith("/keyword/") ? "pip-button-active" : ""
              } text-center text-sm sm:text-base`}
            >
              [B] KEYWORDS
            </Link>

            <Link
              href="/creations"
              className={`pip-button ${
                pathname === "/creations" || pathname.startsWith("/creation/") ? "pip-button-active" : ""
              } text-center text-sm sm:text-base`}
            >
              [C] TOKENS
            </Link>

            <Link
              href="/kols"
              className={`pip-button ${
                pathname === "/kols" ? "pip-button-active" : ""
              } text-center text-sm sm:text-base`}
            >
              [D] KOLS
            </Link>
          </div>

          <div
            className="hidden sm:block flex-1 border-b-2 border-[var(--pip-glow-green)] opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(to top, var(--pip-glow-green), var(--pip-transparent))",
              backgroundRepeat: "no-repeat",
              backgroundSize: "3px 5vh",
              backgroundPosition: "right",
            }}
          ></div>
        </div>
      </footer>
    </div>
  );
}