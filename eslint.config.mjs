import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // O site antigo (HTML estático + bundle IIFE) segue no repositório até a
    // migração ser conferida lado a lado. Não faz sentido lintar aquele código.
    ignores: ["js/**", "tools/**", ".next/**"],
  },
];

export default eslintConfig;
