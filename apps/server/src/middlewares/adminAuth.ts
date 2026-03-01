import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

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

export const adminAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.admin_token;

    if (!token) {
        throw new ApiError(401, "No token provided.");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);

        if (typeof decoded !== 'object' || !('userId' in decoded)) {
            throw new ApiError(401, "Invalid token.");
        }

        if (decoded.role !== "ADMIN") {
            res.clearCookie('admin_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
            });
            throw new ApiError(403, "Access denied. Admin only.");
        }

        req.user = {
            userId: decoded.userId as string,
            role: decoded.role as "ADMIN",
        };

        next();

    } catch (err) {
        // Re-throw ApiErrors as-is
        if (err instanceof ApiError) throw err;

        // JWT errors (expired, malformed, etc.)
        res.clearCookie('admin_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });
        throw new ApiError(401, "Session expired. Please log in again.");
    }
};
