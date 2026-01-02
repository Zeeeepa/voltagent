import Link from "@docusaurus/Link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";
import { AgentsAnimation } from "../agents-animation";
import { LineShadowText } from "../magicui/line-shadow-text";

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [commandText, setCommandText] = useState("npm create voltagent-app@latest");
  const [isTyping, setIsTyping] = useState(false);
  const originalCommand = "npm create voltagent-app@latest";
  const typingTimerRef = useRef(null);

  const thinkingMessages = ["Memory", "RAG", "Tool", "MCP", "Agent", "Supervisor"];

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleCommandClick = async () => {
    if (isTyping) return;

    setIsTyping(true);

    // Copy to clipboard
    await navigator.clipboard.writeText(originalCommand);

    // Clear the text character by character
    for (let i = commandText.length; i >= 0; i--) {
      await new Promise<void>((resolve) => {
        typingTimerRef.current = setTimeout(() => {
          setCommandText(originalCommand.substring(0, i));
          resolve();
        }, 20);
      });
    }

    // Show AI thinking messages in sequence
    for (let msgIndex = 0; msgIndex < thinkingMessages.length; msgIndex++) {
      setCommandText(thinkingMessages[msgIndex]);

      // Wait between each thinking message
      await new Promise((resolve) => {
        typingTimerRef.current = setTimeout(resolve, 500);
      });
    }

    // Type "Copied!" with a slight delay between characters
    const copiedText = "Copied to clipboard!";
    for (let i = 0; i <= copiedText.length; i++) {
      await new Promise<void>((resolve) => {
        typingTimerRef.current = setTimeout(() => {
          setCommandText(copiedText.substring(0, i));
          resolve();
        }, 40);
      });
    }

    // Add pulse effect class
    const commandElement = document.querySelector(".command-text");
    if (commandElement) {
      commandElement.classList.add("pulse-effect");
    }

    // Wait for 1.5 seconds
    await new Promise((resolve) => {
      typingTimerRef.current = setTimeout(resolve, 1500);
    });

    // Remove pulse effect
    if (commandElement) {
      commandElement.classList.remove("pulse-effect");
    }

    // Clear "Copied!" character by character
    for (let i = copiedText.length; i >= 0; i--) {
      await new Promise<void>((resolve) => {
        typingTimerRef.current = setTimeout(() => {
          setCommandText(copiedText.substring(0, i));
          resolve();
        }, 20);
      });
    }

    // Type the original command again
    for (let i = 0; i <= originalCommand.length; i++) {
      await new Promise<void>((resolve) => {
        typingTimerRef.current = setTimeout(() => {
          setCommandText(originalCommand.substring(0, i));
          resolve();
        }, 30);
      });
    }

    setIsTyping(false);
  };

  // Clean up any pending timers when component unmounts
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative max-w-7xl xs:px-4 lg:px-8 mx-auto landing-xs:mb-16 landing-md:mb-36">
      <div className="mt-16 md:mt-24" />
      <div className="grid xs:grid-cols-1 mx-4 lg:mx-0 lg:grid-cols-2 gap-8 items-center">
        <div>
          {/* Main Heading */}
          <h2
            className={`text-2xl text-left mb-2 font-bold transition-all duration-1000 tracking-[-0.025em] ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Link
              href="https://github.com/voltagent/voltagent/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-main-emerald no-underline hover:no-underline"
            >
              <span
                className="inline-block relative"
                onMouseEnter={() => setShowHeart(true)}
                onMouseLeave={() => setShowHeart(false)}
              >
                The end-to-end
                {showHeart && (
                  <span className="absolute -right-8 top-1 animate-[zap_1.5s_ease-in-out_infinite]">
                    <BoltIcon className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                  </span>
                )}
              </span>
            </Link>
          </h2>

          <h1
            className={`text-4xl sm:text-5xl text-neutral-100 md:text-6xl font-semibold text-left mb-6 transition-all duration-1000 tracking-[-0.025em] ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            AI Agent Engineering
            <LineShadowText
              className="text-main-emerald landing-md:mt-4 landing-xs:mt-2 ml-2 landing-sm:ml-0 italic"
              shadowColor={"#00d992"}
            >
              Platform
            </LineShadowText>
          </h1>

          <div
            className={`text-base sm:text-lg md:text-xl text-gray-400 text-left mb-12 transition-all duration-1000 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-white font-semibold">Core Framework</span>
                  <span className="text-white/40">→</span>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="px-2 py-1 rounded-full border border-white/10 text-white/80 bg-white/5">
                      Memory
                    </span>
                    <span className="px-2 py-1 rounded-full border border-white/10 text-white/80 bg-white/5">
                      RAG
                    </span>
                    <span className="px-2 py-1 rounded-full border border-white/10 text-white/80 bg-white/5">
                      Guardrails
                    </span>
                    <span className="px-2 py-1 rounded-full border border-white/10 text-white/80 bg-white/5">
                      Tools
                    </span>
                  </div>
                </div>
                <span className="text-gray-400 text-base ml-0">
                  Build agents with open-source TypeScript framework.
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-white font-semibold">VoltOps</span>
                  <span className="text-white/40">→</span>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="px-2 py-1 rounded-full border border-white/10 text-white/80 bg-white/5">
                      Observability
                    </span>
                    <span className="px-2 py-1 rounded-full border border-white/10 text-white/80 bg-white/5">
                      Automation
                    </span>
                    <span className="px-2 py-1 rounded-full border border-white/10 text-white/80 bg-white/5">
                      Deployment
                    </span>
                    <span className="px-2 py-1 rounded-full border border-white/10 text-white/80 bg-white/5">
                      Evals
                    </span>
                  </div>
                </div>
                <span className="text-gray-400 text-base ml-0">
                  Automate, debug, and deploy your agents with integrated console.
                </span>
              </div>
            </div>
            <span className="text-white text-base sm:text-lg md:text-xl">
              Ship enterprise multi-agent systems, all in one place.
            </span>
          </div>

          <div
            className={`flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-4 mb-12 transition-all duration-1000 delay-500 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Link
              to="/docs/"
              className="w-full sm:w-auto px-4 py-3 font-bold landing-sm:text-lg border-none landing-xs:text-md font-mono backdrop-blur-sm text-main-emerald cursor-pointer bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded-md transition duration-300 flex items-center outline-none justify-center sm:justify-start gap-2 hover:bg-[#0e2c24] no-underline"
            >
              <ChevronRightIcon className="landing-xs:w-4 landing-xs:h-4 landing-md:w-6 landing-md:h-6" />
              Get Started
            </Link>

            <button
              type="button"
              onClick={handleCommandClick}
              aria-label="Copy npm command to clipboard"
              className="w-full sm:w-auto flex cursor-pointer items-center justify-center border backdrop-blur-sm h-[53px] border-solid border-[#113328] rounded-md px-4 py-3 font-[monospace] text-[13px] hover:bg-[#0e2c24] transition duration-300 bg-transparent"
            >
              <span className="mr-2 text-main-emerald">$</span>
              <span className="command-text text-main-emerald min-w-[220px] text-left relative">
                {commandText}
                {isTyping && !thinkingMessages.includes(commandText) && commandText !== "" && (
                  <span className="animate-pulse">|</span>
                )}
              </span>
            </button>
          </div>
        </div>

        <div className="landing-xs:pl-0 landing-md:pl-12 h-full items-center">
          <AgentsAnimation />
        </div>
      </div>
    </div>
  );
}
