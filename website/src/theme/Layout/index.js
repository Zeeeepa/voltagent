import { useLocation } from "@docusaurus/router";
import Layout from "@theme-original/Layout";
import React from "react";

export default function LayoutWrapper(props) {
  return (
    <>
      <Layout {...props} />
    </>
  );
}
