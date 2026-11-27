import { describe, it, expect } from 'vitest';
import { PLAN } from '../src/game/unlock-plan.js';
import { STATS } from '../src/game/achievements.js';
import { DAILY_TOTAL_BOARDS, CHALLENGES } from '../src/game/daily.js';
import { REGULAR } from '../scripts/lib/unlock-model.mjs';

const reqs = Object.entries(PLAN).flatMap(([type, items]) =>
  Object.entries(items).flatMap(([id, list]) => list.map(([stat, goal]) => ({ key: `${type}:${id}`, stat, goal }))),
);

describe('metas de desbloqueo del plan', () => {
  it('cada estadística existe y el modelo de progresión tiene su curva (si no, analyze-unlocks se cae)', () => {
    for (const { key, stat } of reqs) {
      expect(STATS[stat], `${key}: ${stat} no es una estadística`).toBeTypeOf('function');
      expect(REGULAR[stat], `${key}: ${stat} sin curva en unlock-model.mjs`).toBeTypeOf('function');
    }
  });

  it('ninguna meta pide más de lo que el Desafío único puede dar', () => {
    for (const { key, stat, goal } of reqs) {
      if (stat === 'dailyKinds') expect(goal, key).toBeLessThanOrEqual(CHALLENGES.length);
      if (stat === 'dailyBestBoard') expect(goal, key).toBeLessThanOrEqual(DAILY_TOTAL_BOARDS);
    }
  });

  it('el Desafío suma como mucho 1 al día: las metas del modelo no superan 1 por día', () => {
    for (const stat of ['dailySolved', 'dailyGold', 'masterSolved'])
      expect(REGULAR[stat](100), stat).toBeLessThanOrEqual(100);
    expect(REGULAR.dailyGold(100)).toBeLessThan(REGULAR.dailySolved(100));
  });
});
