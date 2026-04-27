/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "nextjs.org" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "auth.trylovify.com" },
      { protocol: "https", hostname: "trylovify.com" },
    ],
  },
};

export default nextConfig;
