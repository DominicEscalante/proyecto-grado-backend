import { Session, User } from '../config/auth.js';

export type AuthSession = Session;
export type AuthUser = User;

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser | null;
      session?: AuthSession | null;
    }
  }
}
