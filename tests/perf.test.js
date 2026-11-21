// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { AUTO_LITE_MS, autoLiteActive } from '../src/ui/perf.js';

describe('modo ligero automático', () => {
  it('dura 3 días y después se vuelve a medir; el «auto» antiguo sin fecha ya no vale', () => {
    const now = 1_800_000_000_000;
    expect(autoLiteActive(`auto:${now - 1000}`, now)).toBe(true);
    expect(autoLiteActive(`auto:${now - AUTO_LITE_MS - 1}`, now)).toBe(false);
    expect(autoLiteActive('auto', now)).toBe(false);
    expect(autoLiteActive('on', now)).toBe(false);
    expect(autoLiteActive(null, now)).toBe(false);
  });
});
