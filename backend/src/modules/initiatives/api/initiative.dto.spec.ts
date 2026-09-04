import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { describe, expect, it } from 'vitest';
import { QuarterCardsQueryDto, UpdateCardDto } from './initiative.dto';

describe('initiative UNIQUEIDENTIFIER validation', () => {
  it('accepts deterministic UUID v4 identifiers used by system dictionaries', async () => {
    const dto = Object.assign(new UpdateCardDto(), {
      revision: 1,
      department_ids: [],
      status_id: '00000000-0000-4000-8000-000000000001',
      scope: [],
    });

    expect(await validate(dto)).toEqual([]);
  });

  it('still rejects malformed identifiers', async () => {
    const dto = Object.assign(new UpdateCardDto(), {
      revision: 1,
      department_ids: [],
      status_id: 'DEFAULT',
      scope: [],
    });

    expect(await validate(dto)).toEqual([
      expect.objectContaining({ property: 'status_id' }),
    ]);
  });
});

describe('initiative list query validation', () => {
  it('normalizes valid query parameters', async () => {
    const dto = plainToInstance(QuarterCardsQueryDto, {
      kind: 'project',
      year: '2026',
      quarter: 'Q2',
      name: '  План  ',
      manager_id: '00000000-0000-0000-0000-000000000001',
    });

    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({
      kind: 'PROJECT',
      year: 2026,
      quarter: 'Q2',
      name: 'План',
    });
  });

  it('rejects invalid quarter, identifier and oversized search', async () => {
    const dto = plainToInstance(QuarterCardsQueryDto, {
      quarter: 'Q5',
      manager_id: 'manager',
      name: 'x'.repeat(201),
    });
    const properties = (await validate(dto)).map((error) => error.property);

    expect(properties).toEqual(
      expect.arrayContaining(['quarter', 'manager_id', 'name']),
    );
  });
});
