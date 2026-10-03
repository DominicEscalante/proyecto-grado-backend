import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200
): Response => {
  const body: ApiResponse<T> = {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
  };
  return res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  code?: string,
  details?: unknown
): Response => {
  const body: ApiResponse = {
    success: false,
    error: {
      message,
      ...(code && { code }),
      ...(details !== undefined && { details }),
    },
  };
  return res.status(statusCode).json(body);
};
