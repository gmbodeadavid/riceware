import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile higher up the tree (e.g. in the
  // home directory) otherwise makes Turbopack warn about ambiguous roots.
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

export default nextConfig;
