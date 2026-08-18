import { describe, expect, it } from 'vitest';
import { getHealthColors, getHealthLabel, getHealthStatusPresentation } from './health';

describe('health status presentation', () => {
  it.each([
    ['DEFAULT', 'Без статусу', 'bg-slate-100'],
    ['GRAY', 'Без статусу', 'bg-slate-100'],
    ['GREEN', 'Виконано', 'bg-emerald-100'],
    ['YELLOW', 'В процесі', 'bg-amber-100'],
    ['RED', 'На паузі / блоковано', 'bg-rose-100'],
  ] as const)('uses the shared %s presentation', (status, label, background) => {
    expect(getHealthLabel(status)).toBe(label);
    expect(getHealthStatusPresentation(status).badgeClass).toContain(background);
    expect(getHealthColors(status).bg).toBe(background);
  });
});
