import { ApiError } from "../../api/apiClient";
import { MutationResult } from "../../shared/types";
import { fail, ok } from "./helpers";

type ApiCommandResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  requiresConfirmation?: MutationResult["requiresConfirmation"];
};

/**
 * Executes one server-side command and refreshes the read model only after it
 * commits successfully. No caller may update the local state before this
 * promise resolves.
 */
export const executeBackendMutation = async <T>(
  request: () => Promise<ApiCommandResponse<T>>,
  hydrate: () => Promise<void>,
): Promise<MutationResult<T>> => {
  try {
    const response = await request();
    if (response.success === false) {
      return {
        success: false,
        message: response.message ?? "Команда потребує додаткової дії",
        requiresConfirmation: response.requiresConfirmation,
      };
    }
    let hydrationError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { await hydrate(); hydrationError = undefined; break; }
      catch (error) { hydrationError = error; }
    }
    if (hydrationError) return {
      success: false,
      committed: true,
      status: "COMMITTED_REFRESH_FAILED",
      message: "Зміни збережено на сервері, але актуальні дані не завантажено. Не повторюйте збереження — оновіть дані.",
    };
    return { ...ok(response.message ?? "Зміни успішно збережено", response.data), committed: true, status: "SUCCESS" };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      await hydrate().catch(() => undefined);
    }
    return { ...fail(
      error instanceof ApiError
        ? error.message
        : "Не вдалося зберегти зміни на сервері",
    ), committed: false, status: "COMMIT_FAILED" };
  }
};
