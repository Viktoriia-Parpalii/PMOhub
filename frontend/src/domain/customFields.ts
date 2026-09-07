import { CustomFieldDef, InitiativeViewModel } from "../shared/types";
import { stripHtml } from "../shared/utils";

type CustomFieldCarrier = Pick<InitiativeViewModel, "custom_fields">;

export const hasCustomFieldValue = (
  record: CustomFieldCarrier,
  fieldId: string,
) =>
  Object.prototype.hasOwnProperty.call(record.custom_fields ?? {}, fieldId);

/** Active definitions are visible everywhere; inactive ones only where a value was historically stored. */
export const shouldDisplayCustomField = (
  field: CustomFieldDef,
  records: CustomFieldCarrier[],
) =>
  field.isActive !== false ||
  records.some((record) => hasCustomFieldValue(record, field.id));

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
