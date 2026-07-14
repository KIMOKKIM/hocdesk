const SENSITIVE_PATTERNS = [
  /postgresql:\/\/.+/i,
  /postgres:\/\/.+/i,
  /password[=:]\S+/i,
  /api[_-]?key[=:]\S+/i,
  /Bearer\s+\S+/i,
  /ENCRYPTION_KEY/i,
  /CRON_SECRET/i,
  /SESSION_SECRET/i,
  /ADMIN_PASSWORD/i,
  /TURSO_AUTH_TOKEN/i,
  /tb_admin_session=/i,
];

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "인증이 필요합니다.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class RateLimitError extends ApiError {
  constructor(message = "요청이 너무 많습니다. 잠시 후 다시 시도하세요.") {
    super(message, 429, "RATE_LIMIT");
  }
}

export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (process.env.NODE_ENV === "production") {
    return "요청 처리 중 오류가 발생했습니다.";
  }

  if (error instanceof Error) {
    return redactSensitive(error.message);
  }

  return "알 수 없는 오류가 발생했습니다.";
}

export function redactSensitive(text: string): string {
  let result = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}
