import { describe, expect, it } from 'vitest';
import { getPriorityBadgeClass } from './priority';

describe('priority badge presentation', () => {
  it.each([
    ['Critical', 'bg-rose-100'],
    ['High', 'bg-orange-100'],
    ['Medium', 'bg-amber-100'],
    ['Low', 'bg-emerald-100'],
  ])('uses the same %s colour across all initiative views', (priority, background) => {
    expect(getPriorityBadgeClass(priority)).toContain(background);
  });
});
