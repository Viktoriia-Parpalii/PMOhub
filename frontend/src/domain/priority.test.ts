import { describe, expect, it } from 'vitest';
import { getPriorityBadgeStyle } from './priority';

describe('priority badge presentation', () => {
  it.each([
    ['Critical', '#e11d48'],
    ['High', '#ea580c'],
    ['Medium', '#d97706'],
    ['Low', '#059669'],
  ])('uses the configured %s colour across all initiative views', (priority, color) => {
    expect(getPriorityBadgeStyle(priority, [{ id: priority, name: priority, color, is_active: true }]).color).toBe(color);
  });
});
