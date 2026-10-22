import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Redirect here rather than in a page: a page that only calls redirect() can't render,
  // so it fails Next's instant-navigation check in dev.
  async redirects() {
    return [{ source: "/", destination: "/approvals", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
