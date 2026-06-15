import os from "node:os";
import type { NextConfig } from "next";

function localDevOrigins(): string[] {
  const configuredOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const networkOrigins = Object.values(os.networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);

  return Array.from(new Set([...configuredOrigins, ...networkOrigins]));
}

const nextConfig: NextConfig = {
  allowedDevOrigins: localDevOrigins(),
  transpilePackages: ["@guga-flow/shared-types"],
};

export default nextConfig;
