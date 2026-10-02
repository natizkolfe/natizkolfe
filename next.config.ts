import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next 16 turns this on by default. Hydration then waits on the dev
    // debug-channel WebSocket, and a failed socket leaves every client page
    // stuck on its server-rendered loading state.
    reactDebugChannel: false,
  },
};

export default nextConfig;
