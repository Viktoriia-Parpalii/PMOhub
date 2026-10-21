import { describe, expect, it } from 'vitest';
import { dataScopeForTab, hrefForTab, tabFromPath } from './appNavigation';

describe('navigation data scope', () => {
  it('activates only the project backlog scope before the backlog renders', () => {
    expect(dataScopeForTab('backlog', new Date(2027, 4, 10))).toEqual({ mode: 'backlog', kind: 'project', year: 2027 });
  });

  it('scopes portfolio tabs to the current period', () => {
    expect(dataScopeForTab('tasks', new Date(2027, 4, 10))).toEqual({ mode: 'tasks', year: 2027, quarter: 'Q2' });
  });

  it('maps application pages to stable browser URLs', () => {
    expect(hrefForTab('dashboard')).toBe('/analytics');
    expect(hrefForTab('projects', '/pmo/')).toBe('/pmo/projects');
    expect(tabFromPath('/tasks')).toBe('tasks');
    expect(tabFromPath('/pmo/backlog/', '/pmo/')).toBe('backlog');
    expect(tabFromPath('/unknown')).toBeNull();
  });
});
