import { describe, expect, it } from 'vitest';
import { validationExceptionFactory } from './validation-exception.factory';

describe('validationExceptionFactory', () => {
  it('returns a Ukrainian public message without class-validator text', () => {
    const exception = validationExceptionFactory([{
      property: 'passport',
      children: [{ property: 'history', children: [], constraints: { whitelistValidation: 'property history should not exist' } }],
    }]);

    expect(exception.getResponse()).toEqual({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Перевірте правильність заповнення полів',
      details: { fields: ['passport.history'] },
    });
  });
});
