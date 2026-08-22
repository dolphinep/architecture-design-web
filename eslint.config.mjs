import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** eslint-config-next 16 ships native flat config — no FlatCompat shim needed. */
const eslintConfig = [
  { ignores: [".next/**", "out/**", "node_modules/**"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default eslintConfig;
