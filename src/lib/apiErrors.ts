import axios from "axios";

function readErrorField(data: object, key: string): string | undefined {
  if (!(key in data)) return undefined;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return fallback;
  }

  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

  if (typeof data === "object" && data !== null) {
    const message =
      readErrorField(data, "message") ??
      readErrorField(data, "detail") ??
      readErrorField(data, "error");
    if (message) {
      return message;
    }
  }

  return fallback;
}

export function getChatErrorMessage(error: unknown): string {
  const backendMessage = getApiErrorMessage(error, "");
  if (backendMessage) {
    return backendMessage;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 502 || status === 503 || status === 504) {
      return "The AI service is temporarily unavailable. Please try again in a moment.";
    }
    if (status === 500) {
      return "The AI provider returned an error. Check your provider and model in Settings, then try again.";
    }
  }

  return "Sorry, something went wrong. Please try again.";
}
