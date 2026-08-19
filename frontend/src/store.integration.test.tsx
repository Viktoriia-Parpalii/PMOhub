import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProvider, useAppContext, validateExportData } from './store';

const Probe = () => {
  const { currentUser, users, projects, departments, login, getFullDataSnapshot, importFullData } = useAppContext();
  return <>
    <span data-testid="user">{currentUser?.email ?? 'none'}</span>
    <span data-testid="projects">{projects.length}</span>
    <span data-testid="departments">{departments.map(item => item.id).join(',')}</span>
    <button onClick={() => login(users[0])}>login</button>
    <button onClick={() => {
      const snapshot = getFullDataSnapshot();
      importFullData({ ...snapshot, departments: [...snapshot.departments, { id: 'D-MERGED', name: 'Merged', capacity_limit_points: 1, is_active: true }] }, 'merge');
    }}>merge</button>
    <button onClick={() => {
      const snapshot = getFullDataSnapshot();
      importFullData({ ...snapshot, projects: [], tasks: [], departments: [{ id: 'D-REPLACED', name: 'Replaced', capacity_limit_points: 1, is_active: true }] }, 'replace');
    }}>replace</button>
  </>;
};

const InitiativeFlowProbe = () => {
  const currentYear = new Date().getFullYear();
  const { users, projects, login, addProject, moveCard, deleteProject } = useAppContext();
  return <>
    <span data-testid="flow-projects">{projects.map(item => `${item.id}:${item.quarter}`).join('|')}</span>
    <button onClick={() => login(users[0])}>flow-login</button>
    <button onClick={() => addProject({
      id: 'FLOW-B', name: 'Flow', strategic_goal: 'Multiline\ngoal', implementer_dept_ids: ['D1'],
      cross_functional_dept_ids: [], year: currentYear, quarter: 'Q1', health_status: 'DEFAULT',
      checklist: [], is_backlog: true, yearSnapshots: { [String(currentYear)]: { name: 'Flow', strategic_goal: 'Multiline\ngoal', implementer_dept_ids: ['D1'], cross_functional_dept_ids: [], year: currentYear, history: [] } },
    })}>add-backlog</button>
    <button onClick={() => addProject({
      id: 'FLOW-C', backlog_id: 'FLOW-B', name: 'Flow', strategic_goal: '', implementer_dept_ids: ['D1'],
      cross_functional_dept_ids: [], year: currentYear, quarter: 'Q3', health_status: 'DEFAULT', is_backlog: false,
      checklist: [{ id: 'FLOW-I', text: 'Item', is_completed: false, weightId: 'TW-S', implementer_dept_ids: ['D1'] }],
    })}>add-card</button>
    <button onClick={() => moveCard('FLOW-C', currentYear, 'Q4', true)}>move-card</button>
    <button onClick={() => deleteProject('FLOW-C')}>delete-card</button>
  </>;
};

const SnapshotProbe = () => {
  const { users, projects, login, savePassport, createBacklogSnapshot } = useAppContext();
  const master = projects.find(item => item.id === 'PRJ-B-PLATFORM')!;
  const futureMaster = projects.find(item => item.is_backlog && item.initiative_chain_id === master.initiative_chain_id && item.year === 2027);
  return <>
    <span data-testid="snapshot-2025">{master.yearSnapshots?.['2025']?.strategic_goal}</span>
    <span data-testid="snapshot-2026">{master.yearSnapshots?.['2026']?.strategic_goal}</span>
    <span data-testid="snapshot-2027">{futureMaster?.yearSnapshots?.['2027']?.strategic_goal ?? 'none'}</span>
    <button onClick={() => login(users[0])}>snapshot-login</button>
    <button onClick={() => savePassport({ kind: 'project', source: { type: 'backlog', masterId: master.id, year: 2026 }, passportPatch: { strategic_goal: 'Updated\nwithout limit' }, targets: { backlogYears: [], cardIds: [] } })}>save-current</button>
    <button onClick={() => createBacklogSnapshot('project', master.id, 2026, 2027)}>create-future</button>
    <button onClick={() => savePassport({ kind: 'project', source: { type: 'backlog', masterId: master.id, year: 2026 }, passportPatch: { strategic_goal: 'Explicit future' }, targets: { backlogYears: [2027], cardIds: [] } })}>save-future</button>
    <button onClick={() => savePassport({ kind: 'project', source: { type: 'backlog', masterId: master.id, year: 2026 }, passportPatch: { strategic_goal: 'Must rollback' }, targets: { backlogYears: [], cardIds: ['missing'] } })}>invalid-atomic</button>
  </>;
};

const DictionaryDeletionProbe = () => {
  const { users, login, departments, managers, priorities, deleteDepartment, deleteManager, deletePriority } = useAppContext();
  const [result, setResult] = React.useState('');
  return <>
    <span data-testid="dictionary-result">{result}</span>
    <span data-testid="dictionary-counts">{departments.length}:{managers.length}:{priorities.length}</span>
    <button onClick={() => login(users[0])}>dictionary-login</button>
    <button onClick={() => setResult(deleteDepartment('D1').message)}>delete-used-department</button>
    <button onClick={() => setResult(deleteManager('M1').message)}>delete-used-manager</button>
    <button onClick={() => setResult(deletePriority('Critical').message)}>delete-used-priority</button>
  </>;
};

describe('store integration', () => {
  it('starts from demo data without a persisted session', () => {
    render(<AppProvider><Probe /></AppProvider>);
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(Number(screen.getByTestId('projects').textContent)).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'login' }));
    expect(screen.getByTestId('user')).not.toHaveTextContent('none');
  });
  it('rejects legacy backups', () => expect(validateExportData({ version: '1.0' }).success).toBe(false));

  it('supports Merge and Replace imports for valid v4 backups', () => {
    render(<AppProvider><Probe /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'login' }));
    fireEvent.click(screen.getByRole('button', { name: 'merge' }));
    expect(screen.getByTestId('departments')).toHaveTextContent('D-MERGED');
    fireEvent.click(screen.getByRole('button', { name: 'replace' }));
    expect(screen.getByTestId('departments')).toHaveTextContent('D-REPLACED');
    expect(screen.getByTestId('projects')).toHaveTextContent('0');
  });

  it('creates a backlog/card, moves the card in place and deletes it', () => {
    render(<AppProvider><InitiativeFlowProbe /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'flow-login' }));
    fireEvent.click(screen.getByRole('button', { name: 'add-backlog' }));
    fireEvent.click(screen.getByRole('button', { name: 'add-card' }));
    expect(screen.getByTestId('flow-projects')).toHaveTextContent('FLOW-C:Q3');
    fireEvent.click(screen.getByRole('button', { name: 'move-card' }));
    expect(screen.getByTestId('flow-projects')).toHaveTextContent('FLOW-C:Q4');
    expect(screen.getByTestId('flow-projects')).not.toHaveTextContent('FLOW-C:Q3');
    fireEvent.click(screen.getByRole('button', { name: 'delete-card' }));
    expect(screen.getByTestId('flow-projects')).not.toHaveTextContent('FLOW-C');
  });

  it('keeps historical snapshots unchanged and only updates explicit future targets', () => {
    render(<AppProvider><SnapshotProbe /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'snapshot-login' }));
    const historical = screen.getByTestId('snapshot-2025').textContent;
    fireEvent.click(screen.getByRole('button', { name: 'save-current' }));
    expect(screen.getByTestId('snapshot-2025')).toHaveTextContent(historical ?? '');
    expect(screen.getByTestId('snapshot-2026')).toHaveTextContent('Updated without limit');
    expect(screen.getByTestId('snapshot-2027')).toHaveTextContent('none');
    fireEvent.click(screen.getByRole('button', { name: 'create-future' }));
    fireEvent.click(screen.getByRole('button', { name: 'save-future' }));
    expect(screen.getByTestId('snapshot-2027')).toHaveTextContent('Explicit future');
    fireEvent.click(screen.getByRole('button', { name: 'invalid-atomic' }));
    expect(screen.getByTestId('snapshot-2026')).toHaveTextContent('Explicit future');
  });

  it('blocks deletion of dictionary entries referenced by initiatives and keeps the definitions intact', () => {
    render(<AppProvider><DictionaryDeletionProbe /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'dictionary-login' }));
    const counts = screen.getByTestId('dictionary-counts').textContent;
    fireEvent.click(screen.getByRole('button', { name: 'delete-used-department' }));
    expect(screen.getByTestId('dictionary-result')).toHaveTextContent('Неможливо видалити відділ');
    fireEvent.click(screen.getByRole('button', { name: 'delete-used-manager' }));
    expect(screen.getByTestId('dictionary-result')).toHaveTextContent('Неможливо видалити менеджера');
    fireEvent.click(screen.getByRole('button', { name: 'delete-used-priority' }));
    expect(screen.getByTestId('dictionary-result')).toHaveTextContent('Неможливо видалити пріоритет');
    expect(screen.getByTestId('dictionary-counts')).toHaveTextContent(counts ?? '');
  });
});
