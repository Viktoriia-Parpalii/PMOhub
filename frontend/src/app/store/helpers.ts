import { MutationResult, ScopeMergePreview } from "../../shared/types";

export const ok = <T = undefined>(message: string, data?: T): MutationResult<T> => ({
  success: true,
  message,
  data,
});

export const fail = <T = undefined>(
  message: string,
  requiresConfirmation?: ScopeMergePreview,
): MutationResult<T> => ({ success: false, message, requiresConfirmation });
