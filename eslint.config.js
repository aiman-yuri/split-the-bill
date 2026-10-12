// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Money logic must stay plain TypeScript so it runs in Node with no device (Constitution III).
    files: ["src/bill/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["react", "react-native", "expo"],
          patterns: ["react-native/*", "expo-*", "@expo/*"],
        },
      ],
    },
  },
]);
