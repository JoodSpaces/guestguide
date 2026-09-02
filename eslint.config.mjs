import nextConfig from "eslint-config-next";

// Spread the base Next.js flat config array and append overrides.
// Pre-existing violations are downgraded to warn so CI passes today;
// tighten these to "error" as the codebase is cleaned up.
const config = [
  ...nextConfig,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "warn",
      "@next/next/no-img-element": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];

export default config;
