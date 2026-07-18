import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Moss ships a native Rust (napi) addon — keep it out of the server bundle.
  serverExternalPackages: ["@moss-dev/moss", "@moss-dev/moss-core"],
};

export default nextConfig;
