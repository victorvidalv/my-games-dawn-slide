import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Cada archivo en su propio hilo; los tests pesados reparten además su trabajo en un pool de worker_threads
    // (tests/parallel). FULL=1 npm test → revisión exhaustiva en vez de la muestra determinista.
    pool: 'threads',
    // En CI (runners de 2-4 núcleos) solo 2 archivos a la vez: los tests pesados ya abren su propio pool de hilos y, si
    // además compiten todos los archivos entre sí, el banco de tableros no termina a tiempo.
    ...(process.env.CI ? { maxWorkers: 2 } : {}),
    testTimeout: 60000,
    hookTimeout: 600000,
  },
});
