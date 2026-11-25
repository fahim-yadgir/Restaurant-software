// Every error the API sends has the same shape:  { error: { code, message } }
// The React app (src/lib/api.js) turns it into ApiError(code, message).
//
//   throw new ApiError(403, 'DEVICE_MISMATCH', 'This account is on another device.')
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const badRequest = (message) => new ApiError(400, 'VALIDATION', message)

export const unauthorized = (message = 'Please sign in again.') =>
  new ApiError(401, 'UNAUTHORIZED', message)

export const notFound = (message = 'Not found.') =>
  new ApiError(404, 'NOT_FOUND', message)