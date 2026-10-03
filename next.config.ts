import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site is opened at the LAN address, not localhost. Without this, the
  // dev live-reload socket is blocked and the page fully reloads, clearing inputs.
  allowedDevOrigins: ["10.0.0.91", "127.0.0.1", "*.trycloudflare.com"],
  experimental: {
    // Next 16 turns this on by default. Hydration then waits on the dev
    // debug-channel WebSocket, and a failed socket leaves every client page
    // stuck on its server-rendered loading state.
    reactDebugChannel: false,
  },
};

export default nextConfig;
