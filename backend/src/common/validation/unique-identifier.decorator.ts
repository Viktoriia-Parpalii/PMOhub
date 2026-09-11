import { Matches, ValidationOptions } from "class-validator";

// SQL Server UNIQUEIDENTIFIER accepts deterministic identifiers that do not
// encode an RFC UUID version. System dictionary records intentionally use
// such stable IDs, so API validation must match the database contract.
const UNIQUE_IDENTIFIER_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const IsUniqueIdentifier = (validationOptions?: ValidationOptions) =>
  Matches(UNIQUE_IDENTIFIER_PATTERN, {
    message: "Поле $property повинно містити коректний ідентифікатор",
    ...validationOptions,
  });
