import globals from 'globals';

export default [
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: 'module',
      globals: { ...globals.browser, __APP_VERSION__: 'readonly' },
    },
    rules: {
      'no-undef': 'error',
      'no-import-assign': 'error',
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      // Tope de complejidad ciclomática: ninguna función puede crecer por encima de lo que ya hay (máx. actual 39).
      // Si una función se acerca, divídela por responsabilidades en vez de subir el número.
      complexity: ['error', 40],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.js', 'vite.config.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
    rules: { 'no-undef': 'error', 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }] },
  },
  {
    // Tests de interfaz: corren en happy-dom, con los globales del navegador.
    files: ['tests/ui/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
