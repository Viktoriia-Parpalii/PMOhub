import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProvider, useAppContext } from '../store';
import { BacklogModal } from './BacklogModal';

const ModalHarness = () => {
  const { currentUser, login, projects, users } = useAppContext();
  if (!currentUser) return <button onClick={() => login(users[0])}>Увійти для тесту</button>;
  const master = projects.find(item => item.is_backlog)!;
  return <BacklogModal type="PROJECTS" editItem={master} selectedYear={2026} onClose={() => undefined} />;
};

describe('BacklogModal primary fields', () => {
  it('keeps backlog editing limited to the annual primary fields', () => {
    render(<AppProvider><ModalHarness /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Увійти для тесту' }));

    expect(screen.queryByText('Виконавці', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText('«Підготовчий етап»')).toBeInTheDocument();
    expect(screen.getByText('Стратегічна задача')).toBeInTheDocument();
  });
});
