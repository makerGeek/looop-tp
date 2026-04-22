import createMDX from "@next/mdx";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  reactStrictMode: true,
  experimental: {
    mdxRs: false,
  },
  webpack: (config, { isServer }) => {
    // When NODE_ENV=test, wrap client modules under src/ with istanbul instrumentation.
    // SWC still handles the original transform; this post-rule only adds counters.
    if (process.env.NODE_ENV === "test" && !isServer) {
      const srcRoot = path.join(__dirname, "src");
      config.module.rules.push({
        test: /\.(js|jsx|ts|tsx)$/,
        include: srcRoot,
        exclude: [
          /sandpack[\\/]starters/,
          /content/,
          /\.test\./,
          /\.spec\./,
        ],
        enforce: "post",
        use: {
          loader: "babel-loader",
          options: {
            babelrc: false,
            configFile: false,
            plugins: [
              [
                "babel-plugin-istanbul",
                {
                  extension: [".js", ".jsx", ".ts", ".tsx"],
                },
              ],
            ],
          },
        },
      });
    }
    return config;
  },
};

export default withMDX(nextConfig);
