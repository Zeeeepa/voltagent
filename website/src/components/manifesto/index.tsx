import confetti from "canvas-confetti";
import React, { useEffect, useState } from "react";

const SUDO_CODE = ["s", "u", "d", "o"];

export function Manifesto() {
  const [_, setKeys] = useState<string[]>([]);
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      setKeys((prevKeys) => {
        const updatedKeys = [...prevKeys, key];
        if (updatedKeys.length > SUDO_CODE.length) {
          updatedKeys.shift();
        }
        if (updatedKeys.join("") === SUDO_CODE.join("")) {
          setShowEasterEgg(true);
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
          setTimeout(() => setShowEasterEgg(false), 60000);
        }
        return updatedKeys;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleEasterEggClose = () => {
    setShowEasterEgg(false);
  };

  return (
    <div className="relative max-w-4xl mx-auto px-4">
      <div className="mb-6">
        <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-3 font-semibold text-main-emerald tracking-wide uppercase">
          Manifesto
        </h2>
        <p className="mt-1 landing-xs:text-2xl landing-md:text-3xl landing-xs:mb-2 landing-md:mb-3 landing-xs:font-bold landing-md:font-extrabold text-white sm:tracking-tight">
          Why We Built VoltAgent
        </p>
        <p className="max-w-2xl landing-md:text-sm landing-xs:text-xs text-[#dcdcdc]">
          Simplifying AI in the JavaScript ecosystem.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-col space-y-4 max-w-4xl">
        <p className="text-[#dcdcdc] leading-relaxed">
          We're developers, like you, and we started this project based on our
          own experiences. We've built over 15 open-source projects before this,
          and each one taught us something new. Our biggest project, Refine,
          showed us how powerful working with a community can be. During our
          time building Refine—one of us as co-founder and CTO, the other as
          Growth Lead—we saw amazing things happen when the community came
          together. That experience changed us, and we're incredibly thankful to
          everyone in the Refine community.
        </p>

        <p className="text-[#dcdcdc] leading-relaxed">
          Now, we're starting something new and exciting: VoltAgent. We know AI
          development can often feel like working with a confusing "black box,"
          regardless of the language. However, the AI ecosystem is heavily
          dominated by Python, which has more mature tools and established
          practices. We felt this left JavaScript developers without adequate
          solutions. That's why we're building VoltAgent – to bring better
          clarity and best practices specifically to the JavaScript AI world.
        </p>

        <p className="text-[#dcdcdc] leading-relaxed">
          We looked into No-Code tools too. Their visual approach to making AI
          less complex was interesting. Building workflows visually was neat and
          made things easier to understand. However, we quickly ran into
          problems: we felt locked in and couldn't customize things the way we
          wanted. We realized we needed the flexibility of code, but also the
          clear view that visual tools provided.
        </p>

        <p className="text-[#dcdcdc] leading-relaxed">
          And that's why VoltAgent exists. We're creating the tool we always
          wanted – one that combines the great developer experience you get with
          code, and the easy-to-understand insights from No-Code tools. Our goal
          is to make AI development easier, clearer, and more powerful, and we
          want to build it together with the community. We're just getting
          started and we're excited to have you join us.
        </p>
        <p className="text-[#dcdcdc] leading-relaxed">
          Thanks to all the amazing tools in the AI development and
          observability ecosystem that inspired us.
        </p>
      </div>

      {/* Footer */}
      <div className="text-center mt-16 pt-8 border-t border-white/10">
        <p className="font-medium text-white mb-2 text-sm">VoltAgent Team</p>
        <p className="text-xs text-[#dcdcdc] font-mono">
          Permission denied? Try sudo...
        </p>
      </div>

      {/* Easter Egg Modal */}
      {showEasterEgg && (
        <dialog
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleEasterEggClose}
          onKeyDown={(e) => e.key === "Escape" && handleEasterEggClose()}
          open
        >
          <div
            className="bg-gray-800 p-5 rounded-xl max-w-2xl w-full text-left shadow-xl border border-gray-700 flex flex-col"
            style={{ fontFamily: "sans-serif" }}
          >
            {/* Chat Header */}
            <div className="text-center mb-4 pb-3 border-b border-gray-600">
              <h3 className="text-lg font-medium text-white">
                VoltAgent Insights ✨
              </h3>
            </div>

            {/* Chat Body - Added max height and overflow */}
            <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-2 flex-grow custom-scrollbar">
              {/* Fun Facts Section (as system message/block) */}
              <div className="p-3 rounded-lg bg-gray-700/60">
                <p className="text-teal-400 font-semibold mb-2 text-[13px]">
                  Did you know?
                </p>
                {/* Kept monospace for facts list for alignment */}
                <pre className="whitespace-pre-wrap text-gray-300 text-xs font-mono leading-relaxed">
                  {`[1] First VoltAgent prototype was sketched on a coffee shop napkin ☕️
[2] Debugging LLM hallucinations took way more coffee than expected...
[3] We argued for 3 days straight about visualizing agent state 🤔
[4] Our internal Slack bot crashed parsing a 50-level nested JSON response
[5] We almost named the project 'JSAgentFlow' (good call changing it!)
[6] Most complex test agent had 12 interconnected nodes 🤯
[7] The 'aha!' moment for observability came during a late-night debugging session 🔥
[8] Lines of JS code written for VoltAgent: Still counting... and refactoring!
[9] Favorite team debugging snack: Probably gummy bears 🐻
[10] We truly believe JS deserves first-class AI tooling! 🚀`}
                </pre>
              </div>

              {/* Benchmark Section (as another system message/block) */}
              <div className="p-3 rounded-lg bg-gray-700/60">
                <p className="text-teal-400 font-semibold mb-2 text-[13px]">
                  Agent Development Benchmark (Conceptual):
                </p>
                {/* Kept monospace for table */}
                <pre className="text-gray-300 text-xs font-mono">
                  {`
┌────────────────────┬───────────────┬──────────────┐
│ Metric             │ Manual JS       │ VoltAgent  │
├────────────────────┼───────────────┼──────────────┤
│ Agent Setup Time   │    ~4 hours   │   ~15 mins   │
│ Debugging Time     │   ??? hours   │   ~30 mins   │
│ Observability      │ Low (console) │  High (UI)   │
│ State Mgmt Lines   │    200+ LoC   │    ~20 LoC   │
│ Iteration Speed    │      Slow     │     Fast     │
└────────────────────┴───────────────┴──────────────┘`}
                </pre>
              </div>

              {/* Final bot message */}
              <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-600/30 to-sky-600/30 text-gray-300 text-xs italic">
                VoltAgent aims to bring this level of clarity and speed to your
                AI projects!
              </div>
            </div>

            {/* Footer - Updated text */}
            <div className="text-gray-500 text-xs mt-4 text-center pt-3 border-t border-gray-600">
              Press ESC or click outside to close
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
