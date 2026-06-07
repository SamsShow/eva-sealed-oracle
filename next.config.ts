import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // EVA's Brain runs in route handlers; the MemWal SDK is server-only.
  serverExternalPackages: ["@mysten-incubation/memwal"],
};

export default nextConfig;
