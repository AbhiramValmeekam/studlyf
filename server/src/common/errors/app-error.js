/** Stable, machine-readable error codes returned in `error.code`. */
export const ErrorCodes = {
  VALIDATION_ERROR: 400,
  BAD_REQUEST: 400,
  INVALID_TOKEN: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  ACCOUNT_DISABLED: 403,
  ORIGIN_NOT_ALLOWED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  EMAIL_TAKEN: 409,
  SLUG_TAKEN: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  constructor(
    code,
    message,
    details,
  ) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'AppError';
    this.status = ErrorCodes[code];
  }

  static notFound(what = 'Resource') {
    return new AppError('NOT_FOUND', `${what} not found`);
  }
  static unauthenticated(message = 'Authentication required') {
    return new AppError('UNAUTHENTICATED', message);
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError('FORBIDDEN', message);
  }
  static validation(details, message = 'Request validation failed') {
    return new AppError('VALIDATION_ERROR', message, details);
  }
}
