/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  transpilePackages: ["@workspace/ui", "@workspace/car-import-taxes"],
}

export default nextConfig
