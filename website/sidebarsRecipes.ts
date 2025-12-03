import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Recipes & Guides sidebar configuration
 */
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "doc",
      id: "overview",
      label: "Overview",
    },
    {
      type: "category",
      label: "Guides",
      items: [
        {
          type: "doc",
          id: "slack-agent",
          label: "Slack Agent",
        },
      ],
    },
  ],
};

export default sidebars;
