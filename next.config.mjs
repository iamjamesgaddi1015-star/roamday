/** @type {import('next').NextConfig} */
export default {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  experimental: { cpus: 2 },
};
