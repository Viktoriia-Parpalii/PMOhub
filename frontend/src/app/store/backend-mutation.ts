import { ApiError } from "../../api/apiClient";
import { MutationResult } from "../../shared/types";
import { fail, ok } from "./helpers";
import { notify } from "../../components/ui/ToastNotifications";
import {
  NOTIFICATION_KINDS,
  NOTIFICATION_MESSAGES,
} from "../../shared/constants/notificationConstants";

type ApiCommandResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
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
      const message = response.message ?? NOTIFICATION_MESSAGES.commandRejected;
      notify(NOTIFICATION_KINDS.error, message);
      return { success: false, message };
    }
    let hydrationError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await hydrate();
        hydrationError = undefined;
        break;
      } catch (error) {
        hydrationError = error;
      }
    }
    if (hydrationError) {
      notify(
        NOTIFICATION_KINDS.error,
        NOTIFICATION_MESSAGES.committedRefreshFailed,
      );
      return {
        success: false,
        data: response.data,
        committed: true,
        status: "COMMITTED_REFRESH_FAILED",
        message: NOTIFICATION_MESSAGES.committedRefreshFailed,
      };
    }
    const message = response.message ?? NOTIFICATION_MESSAGES.changesSaved;
    notify(NOTIFICATION_KINDS.success, message);
    return {
      ...ok(message, response.data),
      committed: true,
      status: "SUCCESS",
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      await hydrate().catch(() => undefined);
    }
    const message =
      error instanceof ApiError
        ? error.message
        : NOTIFICATION_MESSAGES.commitFailed;
    notify(NOTIFICATION_KINDS.error, message);
    return {
      ...fail(message),
      committed: false,
      status: "COMMIT_FAILED",
      errorCode: error instanceof ApiError ? error.code : undefined,
    };
  }
};
