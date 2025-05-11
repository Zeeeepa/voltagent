import Layout from "@theme/Layout";
import React from "react";
import { Footer } from "../components/footer";
import { PrivacyPolicy } from "../components/privacy-policy";

export default function PrivacyPolicyPage() {
  return (
    <Layout title="Privacy Policy" description="VoltAgent Privacy Policy">
      <main className="flex-1 mt-4">
        <PrivacyPolicy />
        <Footer />
      </main>
    </Layout>
  );
}
