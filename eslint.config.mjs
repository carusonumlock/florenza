import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/* O eslint-config-next 16 já exporta config plano. Usar o FlatCompat aqui, como
 * o template antigo fazia, quebra com "Converting circular structure to JSON". */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [".next/**", "tools/**", "public/**"],
  },
];

export default eslintConfig;
