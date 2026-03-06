import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import jwt from 'jsonwebtoken';
import { prisma } from "@repo/db";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: "USER" | "VENDOR" | "ADMIN";
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header (matches your interceptor)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, "No token provided");
    }

    // Extract token (matches "Bearer <token>" format from your interceptor)
    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { userId: string; role: 'USER' | 'VENDOR' };

    let userExists;

    if (decoded.role === 'USER') {
      userExists = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          role: true,
        }
      });
    } else if (decoded.role === 'VENDOR') {
      userExists = await prisma.vendor.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          role: true,
        }
      });
    } else {
      throw new ApiError(401, "Invalid role.");
    }

    if (!userExists) {
      throw new ApiError(401, "User does not exist");
    }

    req.user = {
      userId: userExists.id,
      role: userExists.role,
    };

    next();
  }
  catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, "Invalid token");
    }

    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, "Token expired");
    }

    throw new ApiError(500, "Authentication failed");
  }
};
