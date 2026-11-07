export type ErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_INPUT"
  | "INSUFFICIENT_FUNDS"
  | "BET_LIMIT"
  | "GAME_NOT_FOUND"
  | "GAME_STATE"
  | "FAUCET_BALANCE"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "NOT_FOUND";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }
  if (error instanceof Error && error.name === "ZodError") {
    const issues = (error as Error & { issues?: { message: string }[] }).issues;
    return Response.json(
      { error: { code: "INVALID_INPUT", message: issues?.[0]?.message ?? "Invalid input" } },
      { status: 400 },
    );
  }
  console.error(error);
  return Response.json(
    { error: { code: "INTERNAL", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}
