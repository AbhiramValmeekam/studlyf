import mongoose from 'mongoose';
import multer from 'multer';
import { z } from 'zod';
import { AppError } from '../errors/app-error.js';
import { toFieldErrors } from '../validation/index.js';

export const notFoundHandler = (req, _res, next) => {
  next(new AppError('NOT_FOUND', `Route ${req.method} ${req.path} not found`));
};

const MONGO_DUPLICATE_KEY = 11000;

export function isDuplicateKeyError(err) {
  return err?.code === MONGO_DUPLICATE_KEY;
}

/**
 * The real HTTP status of an error raised by middleware we don't own — `express.static` with
 * `fallthrough: false`, plus send/range-parser underneath it, reject with a plain Error whose
 * status sits on `err.status` or `err.statusCode`. Normalised through `Number` so a library that
 * parks a *message* in `err.status` ('Not Found') doesn't read as a status.
 */
function statusOf(err) {
  const status = Number(err?.status ?? err?.statusCode);
  return Number.isInteger(status) ? status : null;
}

/**
 * Statuses worth honouring from such an error. Everything else — 5xx included — still becomes the
 * generic INTERNAL_ERROR, so a library failing internally can't relabel itself as client error.
 * The messages are ours, never `err.message`: a mid-stream read failure carries the absolute
 * filesystem path in its text, and this response is public.
 */
const PASSTHROUGH_STATUS = {
  400: ['BAD_REQUEST', 'Bad request'],
  401: ['UNAUTHENTICATED', 'Authentication required'],
  403: ['FORBIDDEN', 'You do not have permission to perform this action'],
  404: ['NOT_FOUND', 'Not found'],
  409: ['CONFLICT', 'Conflict'],
  413: ['PAYLOAD_TOO_LARGE', 'Request body is too large'],
  415: ['UNSUPPORTED_MEDIA_TYPE', 'Unsupported media type'],
  429: ['RATE_LIMITED', 'Too many requests'],
};

/**
 * Translates every error into `{ success: false, error: { code, message, details? } }`.
 * Unknown errors become a generic 500 — internals are logged, never leaked.
 */
export const errorHandler = (err, req, res, next) => {
  // `express.static` streams. A failure part-way through has already flushed headers, so writing
  // the JSON envelope below would throw "headers already sent" and mask the original error —
  // hand it back to Express, which closes the socket.
  if (res.headersSent) return next(err);

  let appErr;
  const status = statusOf(err);

  if (err instanceof AppError) appErr = err;
  else if (err instanceof z.ZodError) appErr = AppError.validation(toFieldErrors(err));
  else if (err instanceof multer.MulterError) {
    appErr =
      err.code === 'LIMIT_FILE_SIZE'
        ? new AppError('PAYLOAD_TOO_LARGE', 'File is too large')
        : new AppError('BAD_REQUEST', `Upload error: ${err.message}`);
  } else if (err?.type === 'entity.too.large') appErr = new AppError('PAYLOAD_TOO_LARGE', 'Request body is too large');
  else if (err?.type === 'entity.parse.failed') appErr = new AppError('BAD_REQUEST', 'Malformed JSON body');
  else if (isDuplicateKeyError(err)) appErr = new AppError('CONFLICT', 'A record with these values already exists');
  else if (err instanceof mongoose.Error.ValidationError) {
    appErr = AppError.validation(Object.entries(err.errors).map(([field, e]) => ({ field, message: e.message })));
  } else if (err instanceof mongoose.Error.CastError) {
    appErr = AppError.validation([{ field: err.path, message: 'Invalid value' }]);
  } else if (PASSTHROUGH_STATUS[status]) {
    const [code, message] = PASSTHROUGH_STATUS[status];
    appErr = new AppError(code, message);
  } else appErr = new AppError('INTERNAL_ERROR', 'Something went wrong');

  if (appErr.status >= 500) req.log?.error({ err }, 'unhandled error');
  else req.log?.debug({ code: appErr.code }, appErr.message);

  res.set('Cache-Control', 'no-store');
  res.status(appErr.status).json({
    success: false,
    error: {
      code: appErr.code,
      message: appErr.message,
      ...(appErr.details ? { details: appErr.details } : {}),
    },
  });
};
