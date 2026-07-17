import axios from "axios";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return fallback;
  }

  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (typeof data === "object" && data !== null) {
    const message = "message" in data ? data.message : undefined;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (error.message.trim()) {
    return error.message;
  }

  return fallback;
}
