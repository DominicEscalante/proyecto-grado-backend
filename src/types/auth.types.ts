import { Session, User } from '../config/auth.js';
import {
  RegistroCiudadanoDTO,
  LoginDTO,
  VerificarIdentidadDTO,
} from '../schemas/auth.schema.js';

export type AuthSession = Session;
export type AuthUser = User;
export type { RegistroCiudadanoDTO, LoginDTO, VerificarIdentidadDTO };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser | null;
      session?: AuthSession | null;
    }
  }
}
