import { describe, expect, it } from 'vitest';
import { dataScopeForTab } from './appNavigation';

describe('navigation data scope', () => {
  it('activates only the project backlog scope before the backlog renders', () => {
    expect(dataScopeForTab('backlog', new Date(2027, 4, 10))).toEqual({ mode: 'backlog', kind: 'project', year: 2027 });
  });

  it('scopes portfolio tabs to the current period', () => {
    expect(dataScopeForTab('tasks', new Date(2027, 4, 10))).toEqual({ mode: 'tasks', year: 2027, quarter: 'Q2' });
  });
});
