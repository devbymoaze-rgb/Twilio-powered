import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models/User";
import type { AuthPayload, RequestUser, UserRole } from "../types";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";



declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }


  
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }
  const cookieToken = req.cookies?.tp_token;
  return typeof cookieToken === "string" ? cookieToken : null;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readToken(req);
    if (!token) throw new UnauthorizedError();
    const decoded = jwt.verify(token, env.jwtSecret) as AuthPayload;
    const user = await User.findById(decoded.userId);
    if (!user || String(user.organizationId) !== decoded.organizationId) {
      throw new UnauthorizedError("Session is no longer valid");
    }
    req.user = {
      userId: String(user._id),
      organizationId: String(user.organizationId),
      role: user.role as UserRole,
      email: user.email,
      name: user.name,
    };
    next();
  } catch (error) {
    next(error instanceof UnauthorizedError ? error : new UnauthorizedError());
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError());
    }
    next();
  };
}
