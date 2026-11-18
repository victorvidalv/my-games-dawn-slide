// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { bootApp } from './app.js';

describe('interfaz: arranque', () => {
  it('abre el menú principal sin errores', async () => {
    const app = await bootApp();
    expect(app.$('menu')).not.toBeNull();
    expect(app.S.run).toBeNull();
  });
});
