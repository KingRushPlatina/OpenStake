export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as T | ApiErrorPayload | null;
  if (!response.ok) {
    const error = payload as ApiErrorPayload | null;
    throw new ApiError(
      error?.error?.code ?? "INTERNAL",
      error?.error?.message ?? "Something went wrong",
      response.status,
      error?.error?.details,
    );
  }
  return payload as T;
}
