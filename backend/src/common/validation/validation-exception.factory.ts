import { BadRequestException } from "@nestjs/common";
import { ValidationError } from "class-validator";

const collectFields = (errors: ValidationError[], parent = ""): string[] =>
  errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    return error.children?.length
      ? collectFields(error.children, path)
      : [path];
  });

/** Prevents class-validator's English implementation messages leaking into UI. */
export const validationExceptionFactory = (errors: ValidationError[]) =>
  new BadRequestException({
    success: false,
    code: "VALIDATION_ERROR",
    message: "Перевірте правильність заповнення полів",
    details: { fields: [...new Set(collectFields(errors))] },
  });
