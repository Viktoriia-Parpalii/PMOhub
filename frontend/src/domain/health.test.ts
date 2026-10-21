import { describe, expect, it } from 'vitest';
import { getHealthLabel, getInitiativeStatus, getInitiativeStatusStyle } from './health';

describe('health status presentation', () => {
  it.each([
    ['DEFAULT', 'Без статусу', '#94a3b8'],
    ['GRAY', 'Без статусу', '#94a3b8'],
    ['GREEN', 'Виконано', '#10b981'],
    ['YELLOW', 'В процесі', '#f59e0b'],
    ['RED', 'На паузі / блоковано', '#f43f5e'],
  ] as const)('uses the shared %s presentation', (status, label, color) => {
    expect(getHealthLabel(status)).toBe(label);
    expect(getInitiativeStatus(status).color).toBe(color);
    expect(getInitiativeStatusStyle(status, [{ id: status, name: label, color, is_active: true }]).color).toBe(color);
  });
});
