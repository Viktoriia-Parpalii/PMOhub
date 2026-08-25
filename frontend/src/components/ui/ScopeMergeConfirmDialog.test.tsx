import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScopeMergeConfirmDialog } from './ScopeMergeConfirmDialog';

describe('ScopeMergeConfirmDialog', () => {
  it('shows merge consequences and exposes cancel/confirm actions', () => {
    const onCancel = vi.fn(); const onConfirm = vi.fn();
    render(<ScopeMergeConfirmDialog preview={{ token: 'T', sourceCardId: 'S', targetCardId: 'D', sourcePeriod: 'Q3 2026', targetPeriod: 'Q4 2026', incomingCount: 3, addedCount: 2, duplicateItemIds: ['I-1'], deletesSource: true }} onCancel={onCancel} onConfirm={onConfirm} />);
    expect(screen.getByText('Підтвердіть злиття scope')).toBeInTheDocument();
    expect(screen.getByText(/I-1/)).toBeInTheDocument();
    expect(screen.getByText(/source-картку буде видалено/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Скасувати' }));
    fireEvent.click(screen.getByRole('button', { name: 'Об’єднати scope' }));
    expect(onCancel).toHaveBeenCalledOnce(); expect(onConfirm).toHaveBeenCalledOnce();
  });
});
