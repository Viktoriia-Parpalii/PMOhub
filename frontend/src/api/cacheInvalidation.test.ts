import { describe, expect, it, vi } from 'vitest';
import { invalidateInitiativeCaches } from './cacheInvalidation';

describe('initiative cache invalidation policy', () => {
  it('marks all dependent caches stale and refetches active queries only', async () => {
    const client = {
      invalidateQueries: vi.fn(async (_options: { queryKey: unknown[]; refetchType: string }) => undefined),
      refetchQueries: vi.fn(async (_options: { queryKey: unknown[]; type: string }) => undefined),
    };

    await invalidateInitiativeCaches(client as never, 'project');

    expect(client.invalidateQueries.mock.calls.map(([arg]) => arg)).toEqual([
      { queryKey: ['initiative-years', 'project'], refetchType: 'none' },
      { queryKey: ['initiative-years', 'counts'], refetchType: 'none' },
      { queryKey: ['quarter-cards', 'project'], refetchType: 'none' },
      { queryKey: ['backlog-card-summaries'], refetchType: 'none' },
      { queryKey: ['analytics'], refetchType: 'none' },
    ]);
    expect(client.refetchQueries.mock.calls.every(([arg]) => arg.type === 'active')).toBe(true);
  });
});
