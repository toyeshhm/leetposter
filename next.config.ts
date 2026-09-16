import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // problemTests reads src/problems/tests/<id>.json at runtime, so tracing has to be told: nothing
  // imports those files, and an untraced read is a 500 on Vercel that never shows up locally.
  outputFileTracingIncludes: { "/api/problems/[id]/tests": ["./src/problems/tests/**"] },
};

export default nextConfig;
