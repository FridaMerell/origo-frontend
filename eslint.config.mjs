import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Spärrar mot kod som skrivs om i varje app i stället för att delas från app/lib och app/components.
const SHARED = {
  dateKey: {
    selector:
      "CallExpression[callee.property.name=/^(slice|split|substring)$/][callee.object.callee.property.name='toISOString']",
    message:
      "toISOString() är UTC-dygnet. Använd isoDateKey() från app/lib/formatters för datumnycklar, eller lägg till en delad helper där.",
  },
  dateTimeFormat: {
    selector: "NewExpression[callee.object.name='Intl'][callee.property.name='DateTimeFormat']",
    message: "Datumformat hör hemma i app/lib/formatters. Använd eller lägg till en helper där.",
  },
  toLocaleDate: {
    selector: "CallExpression[callee.property.name=/^toLocale(Date|Time)String$/]",
    message: "Datumformat hör hemma i app/lib/formatters. Använd eller lägg till en helper där.",
  },
  geolocation: {
    selector: "MemberExpression[object.name='navigator'][property.name='geolocation']",
    message: "Använd getCurrentCoords från app/components/ui/CurrentLocationButton.",
  },
};

const syntaxRule = (...omit) => [
  "error",
  ...Object.entries(SHARED)
    .filter(([key]) => !omit.includes(key))
    .map(([, rule]) => rule),
];

const APPS = ["apsis", "caelus", "flux", "konto", "opus", "tempus", "verso"];
const TESTS = ["**/*.test.ts", "**/*.test.tsx"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.{ts,tsx}"],
    ignores: TESTS,
    rules: {
      "no-restricted-syntax": syntaxRule(),
      "no-restricted-globals": ["error", { name: "confirm", message: "Använd useConfirmDialog från app/components/ui." }],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "confirm", message: "Använd useConfirmDialog från app/components/ui." },
      ],
    },
  },
  {
    files: ["app/lib/formatters.ts"],
    rules: { "no-restricted-syntax": syntaxRule("dateKey", "dateTimeFormat", "toLocaleDate") },
  },
  {
    files: ["app/components/ui/CurrentLocationButton.tsx"],
    rules: { "no-restricted-syntax": syntaxRule("geolocation") },
  },
  // En app importerar aldrig från en annan app; delad kod flyttas till app/lib eller app/components.
  ...APPS.map((app) => ({
    files: [`app/${app}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: APPS.filter((other) => other !== app).flatMap((other) => [`@/app/${other}`, `@/app/${other}/**`]),
              message: "Importera inte från en annan app. Flytta koden till app/lib eller app/components.",
            },
          ],
        },
      ],
    },
  })),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
