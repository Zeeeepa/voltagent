import {
  HtmlClassNameProvider,
  ThemeClassNames,
} from "@docusaurus/theme-common";
import Layout from "@theme/Layout";
import clsx from "clsx";
import React from "react";
import { Footer } from "../components/footer";
import { Manifesto } from "../components/manifesto";

export default function ManifestoPage() {
  return (
    <Layout title="Why we built VoltAgent?" description="VoltAgent Manifesto">
      <main className="relative w-full overflow-hidden margin-vert--lg px-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-xs:mb-16 landing-md:mb-24">
          <Manifesto />
        </div>
      </main>
      <Footer />
    </Layout>
  );
}
