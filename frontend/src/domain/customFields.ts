import { CustomFieldDef, InitiativeViewModel } from "../shared/types";
import { stripHtml } from "../shared/utils";

type CustomFieldCarrier = Pick<
  InitiativeViewModel,
  "custom_fields" | "is_locked" | "locked_at"
>;

export const hasCustomFieldValue = (
  record: CustomFieldCarrier,
  fieldId: string,
) =>
  Object.prototype.hasOwnProperty.call(record.custom_fields ?? {}, fieldId);

const existedBeforeArchive = (
  field: CustomFieldDef,
  record: CustomFieldCarrier,
) => {
  if (!record.is_locked) return true;
  if (!field.createdAt || !record.locked_at) return true;
  const createdAt = Date.parse(field.createdAt);
  const lockedAt = Date.parse(record.locked_at);
  return (
    !Number.isFinite(createdAt) ||
    !Number.isFinite(lockedAt) ||
    createdAt <= lockedAt
  );
};

/**
 * Stored historical values always remain visible. An active empty field is
 * shown in an archive only if its definition existed before that period locked.
 */
export const shouldDisplayCustomField = (
  field: CustomFieldDef,
  records: CustomFieldCarrier[],
) => {
  if (records.some((record) => hasCustomFieldValue(record, field.id)))
    return true;
  if (field.isActive === false) return false;
  if (!records.length) return true;
  return records.some((record) => existedBeforeArchive(field, record));
};

export const customFieldDisplayValue = (
  field: CustomFieldDef,
  rawValue: unknown,
  richTextLimit?: number,
) => {
  if (field.type === "CHECKBOX") {
    if (rawValue === true) return "Так";
    if (rawValue === false) return "Ні";
    return "—";
  }
  if (rawValue === undefined || rawValue === null || rawValue === "") return "—";
  if (field.type === "RICHTEXT" && typeof rawValue === "string") {
    const plainText = stripHtml(rawValue);
    return richTextLimit && plainText.length > richTextLimit
      ? `${plainText.slice(0, richTextLimit)}...`
      : plainText || "—";
  }
  return String(rawValue);
};
