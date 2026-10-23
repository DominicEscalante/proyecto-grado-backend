/**
 * Clase personalizada para errores operacionales y de dominio de la aplicación.
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(
    message: string,
    statusCode: number = 400,
    code: string = 'BAD_REQUEST',
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
