import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateCardDto } from './initiative.dto';

describe('initiative UNIQUEIDENTIFIER validation', () => {
  it('accepts deterministic MSSQL identifiers used by system dictionaries', async () => {
    const dto = Object.assign(new UpdateCardDto(), {
      revision: 1,
      department_ids: [],
      status_id: '00000000-0000-0000-0000-000000000001',
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
