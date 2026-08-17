import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deployment D-1: Node standalone output for the Scaleway container.
  output: "standalone",
  // Monorepo: trace dependencies from the repo root, not apps/webapp
  // (see next docs on `output` — required for correct standalone in workspaces).
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
