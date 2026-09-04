import { MutationResult } from "../../shared/types";

export const ok = <T = undefined>(
  message: string,
  data?: T,
): MutationResult<T> => ({
  success: true,
  message,
  data,
});

export const fail = <T = undefined>(message: string): MutationResult<T> => ({
  success: false,
  message,
});
