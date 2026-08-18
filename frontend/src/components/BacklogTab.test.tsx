import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useAppContext } from '../store';
import { BacklogTab } from './BacklogTab';

const BacklogHarness = () => {
  const { currentUser, users, projects, login, createBacklogSnapshot } = useAppContext();
  if (!currentUser) return <button onClick={() => login(users[0])}>Увійти для тесту</button>;
  const platform = projects.find(item => item.id === 'PRJ-B-PLATFORM')!;
  return <>
    <button onClick={() => createBacklogSnapshot('project', platform.id, 2026, 2027)}>Підготувати продовжений запис</button>
    <BacklogTab />
  </>;
};

describe('BacklogTab bulk extension', () => {
  afterEach(() => vi.useRealTimers());
  it('hides the checkbox for an already extended initiative and cancels without changes', () => {
    render(<AppProvider><BacklogHarness /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Увійти для тесту' }));
    fireEvent.click(screen.getByRole('button', { name: 'Підготувати продовжений запис' }));
    fireEvent.click(screen.getByRole('button', { name: /Продовжити на наступний період/i }));

    expect(screen.queryByRole('checkbox', { name: /Нова клієнтська платформа/i })).not.toBeInTheDocument();
    expect(screen.getByText('Продовжено')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Автоматизація фінансової звітності/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /Автоматизація фінансової звітності/i }));
    expect(screen.getByText('Вибрано: 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Скасувати/i }));
    expect(screen.queryByRole('checkbox', { name: /Автоматизація фінансової звітності/i })).not.toBeInTheDocument();
  });

  it('creates the selected next-year snapshot after confirmation', () => {
    render(<AppProvider><BacklogHarness /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Увійти для тесту' }));
    fireEvent.click(screen.getByRole('button', { name: /Продовжити на наступний період/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Автоматизація фінансової звітності/i }));
    fireEvent.click(screen.getByRole('button', { name: /Підтвердити/i }));

    expect(screen.getByRole('status')).toHaveTextContent('1 ініціатив продовжено на 2027 рік');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('keeps strategic-goal preview in the compact Backlog table', () => {
    render(<AppProvider><BacklogHarness /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Увійти для тесту' }));

    const goal = screen.getByTitle('Масштабувати цифровий продукт і збільшити частку активних клієнтів.');
    expect(goal).toHaveClass('line-clamp-3', 'whitespace-pre-line');
  });

  it('disables card creation for quarters that are already past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 15));
    render(<AppProvider><BacklogHarness /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Увійти для тесту' }));

    screen.getAllByRole('button', { name: 'Створити картку Q1' }).forEach(button => expect(button).toBeDisabled());
    screen.getAllByRole('button', { name: 'Створити картку Q2' }).forEach(button => expect(button).toBeDisabled());
    screen.getAllByRole('button', { name: 'Створити картку Q4' }).forEach(button => expect(button).toBeEnabled());
  });

  it('shows a quarter status, scope count and scope progress in the expanded initiative', () => {
    render(<AppProvider><BacklogHarness /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Увійти для тесту' }));
    fireEvent.click(screen.getByRole('button', { name: 'Нова клієнтська платформа' }));

    expect(screen.getByText('В процесі')).toHaveClass('bg-amber-100', 'text-amber-800');
    expect(screen.getByText('3 завдання')).toBeInTheDocument();
    expect(screen.getByText('1/3 · 33%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Прогрес scope Q3 2026' })).toHaveAttribute('aria-valuenow', '33');
  });

  it('uses the portfolio-style archive banner and returns to the current year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 15));
    render(<AppProvider><BacklogHarness /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Увійти для тесту' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Рік беклогу' }), { target: { value: '2025' } });

    const banner = screen.getByRole('region', { name: 'Архівний період' });
    expect(banner).toHaveTextContent('Архівний період (2025)');
    expect(banner).toHaveTextContent('Тільки для перегляду');
    fireEvent.click(screen.getByRole('button', { name: /Повернутись на поточний рік/i }));
    expect(screen.getByRole('combobox', { name: 'Рік беклогу' })).toHaveValue('2026');
  });

  it('selects all eligible rows and uses the selected tab in the title column', () => {
    render(<AppProvider><BacklogHarness /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Увійти для тесту' }));
    fireEvent.click(screen.getByRole('button', { name: /Продовжити на наступний період/i }));

    const selectAll = screen.getByRole('checkbox', { name: 'Вибрати всі' });
    fireEvent.click(selectAll);
    expect(screen.getByRole('checkbox', { name: /Нова клієнтська платформа/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Автоматизація фінансової звітності/i })).toBeChecked();
    fireEvent.click(selectAll);
    expect(screen.getByRole('checkbox', { name: /Нова клієнтська платформа/i })).not.toBeChecked();

    const headers = screen.getAllByRole('columnheader').map(header => header.textContent);
    expect(headers.indexOf('Назва проєкту')).toBeLessThan(headers.indexOf('Стратегічна задача'));
    expect(headers).not.toContain('Менеджер');
    expect(headers).not.toContain('Пріоритет');
    fireEvent.click(screen.getByRole('button', { name: /Скасувати/i }));
    fireEvent.click(screen.getByRole('button', { name: /Операційні задачі/i }));
    expect(screen.getByRole('columnheader', { name: 'Назва задачі' })).toBeInTheDocument();
  });
});
