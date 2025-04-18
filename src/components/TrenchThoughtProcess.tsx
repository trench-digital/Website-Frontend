"use client";

import { useEffect, useRef } from "react";
import { useGlobalState } from "@/context/GlobalStateContext";
import DOMPurify from 'dompurify';

export default function TrenchThoughtProcess() {
  const { apiStatus, wsStatus, reconnectWebSocket, thoughts } = useGlobalState();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new thoughts are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [thoughts]);

  // Handle resize when connection status changes or thoughts are added
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [wsStatus, thoughts.length]);

  // Function to render thought with formatted elements
  const renderThought = (thought: string) => {
    // Replace token links
    let formattedThought = thought.replace(
      /<token-link data-mint="([^"]+)">([^<]+)<\/token-link>/g,
      (match, mint, name) => {
        // Sanitize both mint and name values
        const sanitizedMint = DOMPurify.sanitize(mint, { ALLOWED_TAGS: [] }); // Strip all HTML
        const sanitizedName = DOMPurify.sanitize(name, { ALLOWED_TAGS: [] }); // Strip all HTML
        return `<a href="/creation/${sanitizedMint}" target="_blank" rel="noopener noreferrer" class="token-link">${sanitizedName}</a>`;
      }
    );
    
    // Detect "from username" pattern and wrap with caller tags
    formattedThought = formattedThought.replace(
      /from\s+([A-Za-z0-9_]+)/g,
      (match, username) => {
        return `from <caller>${username}</caller>`;
      }
    );
    
    // Detect more specific call format with timestamps
    formattedThought = formattedThought.replace(
      /\[\d+:\d+:\d+ [AP]M\] New call.*from\s+([A-Za-z0-9_]+)/g,
      (match, username) => {
        // Only replace the username part
        return match.replace(username, `<caller>${username}</caller>`);
      }
    );
    
    // Specifically handle the exact format from the example
    formattedThought = formattedThought.replace(
      /from\s+([A-Za-z0-9_]+\d+)/g,
      (match, username) => {
        return `from <caller>${username}</caller>`;
      }
    );
    
    // Replace keywords with sanitized content
    formattedThought = formattedThought.replace(
      /<keywords>([^<]+)<\/keywords>/g,
      (match, content) => {
        const sanitizedContent = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] });
        // Split by commas or spaces and filter out empty strings
        const keywords = sanitizedContent.split(/[,\s]+/).filter(keyword => keyword.trim());
        
        // Create a link for each keyword
        return keywords.map(keyword => 
          `<a href="/keyword/${encodeURIComponent(keyword.trim())}" target="_blank" rel="noopener noreferrer" class="keyword">${keyword.trim()}</a>`
        ).join(' ');
      }
    );
    
    // Replace connection messages with sanitized content
    formattedThought = formattedThought.replace(
      /<connection>([^<]+)<\/connection>/g,
      (match, content) => {
        const sanitizedContent = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] });
        return `<span class="connection">${sanitizedContent}</span>`;
      }
    );

    // Replace waiting messages with sanitized content
    formattedThought = formattedThought.replace(
      /<waiting>([^<]+)<\/waiting>/g,
      (match, content) => {
        const sanitizedContent = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] });
        return `<span class="waiting">${sanitizedContent}</span>`;
      }
    );
    
    // Replace caller names with links to their profile
    formattedThought = formattedThought.replace(
      /<caller>([^<]+)<\/caller>/g,
      (match, username) => {
        const sanitizedUsername = DOMPurify.sanitize(username, { ALLOWED_TAGS: [] });
        return `<a href="/kol/${encodeURIComponent(sanitizedUsername)}" target="_blank" rel="noopener noreferrer" class="caller-link">${sanitizedUsername}</a>`;
      }
    );
    
    // Final sanitization of the entire HTML string with specific allowed tags and attributes
    const sanitizedHtml = DOMPurify.sanitize(formattedThought, {
      ALLOWED_TAGS: ['span', 'a'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      ALLOW_DATA_ATTR: false,
      ADD_ATTR: ['target'], // Ensure target="_blank" is allowed
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM: false,
      SANITIZE_DOM: true
    });
    
    return (
      <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
    );
  };

  // Show appropriate message when no thoughts
  if (thoughts.length === 0) {
    const timestamp = new Date().toLocaleTimeString();
    let message = '';
    
    if (apiStatus === 'online') {
      if (wsStatus === 'connecting') {
        message = `[${timestamp}] Connecting to TRENCH thought process...`;
      } else if (wsStatus === 'disconnected') {
        message = `[${timestamp}] TRENCH thought process offline. Waiting to reconnect...`;
      }
    }

    if (message) {
      return (
        <div className="font-mono text-sm h-full overflow-y-auto terminal-scroll">
          <div className="mb-2 terminal-line">
            <span className="text-yellow-400">&gt;</span> {renderThought(message)}
          </div>
        </div>
      );
    }
  }

  return (
    <div
      ref={containerRef}
      className="font-mono text-sm h-full w-full overflow-y-auto terminal-scroll pb-6"
    >
      {thoughts.map((thought, index) => (
        <div
          key={index}
          className="mb-2 terminal-line"
          style={{
            animation: `fadeIn 0.3s ease-in-out ${index * 0.1}s both`,
          }}
        >
          <span className="text-yellow-400">&gt;</span> {renderThought(thought)}
        </div>
      ))}

      {/* Reconnect button when disconnected */}
      {wsStatus === 'disconnected' && apiStatus === 'online' && (
        <div className="mt-2 text-center">
          <button 
            onClick={() => reconnectWebSocket()}
            className="text-[var(--pip-glow-green)] hover:text-white border border-[var(--pip-glow-green)] px-3 py-1 rounded text-xs transition-colors duration-200"
          >
            Reconnect to TRENCH
          </button>
        </div>
      )}

      {/* Blinking cursor effect */}
      <div className="terminal-cursor">_</div>

      <style jsx>{`
        .terminal-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--pip-glow-green) rgba(0, 0, 0, 0.3);
          -webkit-overflow-scrolling: touch;
          padding-right: 5px; /* Prevent content from touching scrollbar in Chrome */
          height: 100%; /* Ensure it always takes full height */
          width: 100%; /* Ensure it always takes full width */
          padding-bottom: 2rem; /* Extra padding at the bottom */
        }

        .terminal-scroll::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .terminal-scroll::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
        }

        .terminal-scroll::-webkit-scrollbar-thumb {
          background-color: var(--pip-glow-green);
          border-radius: 4px;
        }

        .terminal-cursor {
          display: inline-block;
          width: 10px;
          height: 1.2em;
          background-color: var(--pip-glow-green);
          animation: blink 1s step-end infinite;
          margin-left: 2px;
          vertical-align: middle;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .terminal-line {
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
      `}</style>

      <style jsx global>{`
        .token-link {
          color: var(--pip-glow-green);
          font-weight: bold;
          text-decoration: underline;
          text-shadow: 0 0 5px var(--pip-glow-green);
          transition: all 0.2s ease;
        }
        
        .token-link:hover {
          color: white;
          text-shadow: 0 0 8px var(--pip-glow-green);
        }
        
        .keyword {
          font-weight: bold;
          color: #ffcc00;
          text-shadow: 0 0 5px #ffcc00;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        
        .keyword:hover {
          color: white;
          text-shadow: 0 0 8px #ffcc00;
        }
        
        .connection {
          color: var(--pip-glow-green);
          font-weight: bold;
          text-shadow: 0 0 5px var(--pip-glow-green);
        }

        .waiting {
          color: #888888;
          font-style: italic;
        }
        
        .caller-link {
          color: #4da6ff;
          font-weight: bold;
          text-decoration: underline;
          text-shadow: 0 0 5px #4da6ff;
          transition: all 0.2s ease;
        }
        
        .caller-link:hover {
          color: white;
          text-shadow: 0 0 8px #4da6ff;
        }
      `}</style>
    </div>
  );
}
