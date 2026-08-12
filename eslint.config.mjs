import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    settings: {
      react: {
        version: "19.0",
      },
    },
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/purity": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/immutability": "off",
    },
  },
];

export default eslintConfig;
