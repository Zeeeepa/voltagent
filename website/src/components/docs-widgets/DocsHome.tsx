import Link from "@docusaurus/Link";
import {
  ArrowRightIcon,
  BoltIcon,
  ChartBarIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
// @ts-expect-error - Docusaurus theme component
import CodeBlock from "@theme/CodeBlock";

const codeExample = `import { VoltAgent, Agent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "my-voltagent-app",
  instructions: "A helpful assistant that answers questions",
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { agent },
  server: honoServer(),
});`;

const coreFeatures = ["Memory", "RAG", "Guardrails", "Tools", "MCP", "Voice", "Workflow"];

const voltOpsFeatures = [
  {
    title: "Observability",
    description:
      "Debug agent behavior with detailed traces. See every tool call, LLM request, and decision path.",
    href: "/observability-docs/",
    icon: MagnifyingGlassIcon,
  },
  {
    title: "Evaluation",
    description:
      "Score agent outputs against test datasets. Catch regressions before they hit production.",
    href: "/evaluation-docs/",
    icon: ChartBarIcon,
  },
  {
    title: "Prompt Management",
    description: "Version control your prompts. A/B test changes and rollback when needed.",
    href: "/prompt-engineering-docs/",
    icon: DocumentTextIcon,
  },
  {
    title: "Deployment",
    description: "Ship agents with one click. Connect your GitHub repo and deploy automatically.",
    href: "/deployment-docs/",
    icon: RocketLaunchIcon,
  },
  {
    title: "Automation",
    description: "Trigger workflows based on events. Build complex pipelines without extra code.",
    href: "/actions-triggers-docs/",
    icon: BoltIcon,
  },
  {
    title: "Guardrails",
    description: "Validate inputs and outputs. Block harmful content and enforce safety rules.",
    href: "/docs/guardrails/overview/",
    icon: ShieldCheckIcon,
  },
];

const quickLinks = [
  { title: "Quick Start Guide", href: "/docs/quick-start/" },
  { title: "Recipes & Guides", href: "/recipes-and-guides/" },
  { title: "API Reference", href: "/docs/api/overview/" },
  {
    title: "Examples on GitHub",
    href: "https://github.com/voltagent/voltagent/tree/main/examples",
    external: true,
  },
];

export default function DocsHome() {
  return (
    <div className="docs-home -mt-8  ">
      {/* Hero Section - Centered */}
      <div className="text-center pt-16 pb-12 mb-8 overflow-visible">
        <div
          className="text-4xl md:text-6xl font-semibold mb-6 leading-normal pb-2"
          style={{
            background: "linear-gradient(to right, #ffffff, #a1a1aa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Build · Observe · Ship
          <br />
          AI Agents
        </div>
        <div className="text-lg text-white max-w-xl mx-auto">
          AI Agent Engineering Platform for <span className="text-[#b2b2b2]">development</span>,{" "}
          <span className="text-[#b2b2b2]">observability</span>,{" "}
          <span className="text-[#b2b2b2]">evaluation</span>, and{" "}
          <span className="text-[#b2b2b2]">deployment</span> in one place.
        </div>
      </div>

      {/* VoltAgent Core Section */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-semibold">Core</span>
          <span className="text-lg text-[#b2b2b2]">Open Source TypeScript Framework</span>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {coreFeatures.map((feature) => (
            <span
              key={feature}
              className="px-3 py-1 text-sm rounded-full bg-zinc-800/50 text-zinc-300 border border-zinc-700/50"
            >
              {feature}
            </span>
          ))}
          <span className="px-3 py-1 text-sm rounded-full bg-zinc-800/50 text-zinc-500 border border-zinc-700/50">
            and more...
          </span>
        </div>

        {/* Code Block */}
        <CodeBlock language="typescript">{codeExample}</CodeBlock>
      </div>

      {/* VoltOps Console Section */}
      <div className="mb-12 bg-black">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-semibold">VoltOps Console</span>
          <span className="text-lg text-[#b2b2b2]">Cloud / Self-Hosted Platform</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {voltOpsFeatures.map((feature) => (
            <Link to={feature.href} className="no-underline hover:no-underline">
              <div
                key={feature.title}
                className="group p-5 cursor-pointer rounded-lg border border-solid border-zinc-800 hover:border-zinc-700 transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <feature.icon className="w-5 h-5 text-[#00d992]" />
                  <span className=" text-white">{feature.title}</span>
                </div>

                <p className="text-sm text-zinc-400 mb-4 leading-relaxed">{feature.description}</p>
                <span className="inline-flex items-center gap-1 text-zinc-400 group-hover:text-white text-sm transition-all">
                  Learn more <ArrowRightIcon className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <hr className="border-zinc-800 my-10" />

      {/* Quick Links Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-zinc-400">Quick Links</h2>
        <div className="flex flex-wrap gap-6">
          {quickLinks.map((link) => (
            <Link
              key={link.title}
              to={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="text-emerald-500 hover:text-emerald-400 font-medium flex items-center gap-1 transition-colors"
            >
              {link.title} <ArrowRightIcon className="w-3 h-3" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
