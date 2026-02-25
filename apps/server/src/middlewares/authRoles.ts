// middleware/authRoles.ts
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

type Role = 'USER' | 'VENDOR' | 'ADMIN';


const requireRole = (allowedRoles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Already checked by auth middleware, but safety first
        if (!req.user) {
            throw new ApiError(401, "Authentication required")
        }

        if (allowedRoles.includes(req.user.role)) {
            return next();  // ✅ Proceed
        }

        throw new ApiError(403, `Access denied. Allowed: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`)
    };
};

// Pre-built
export const requireUser = requireRole(['USER']);
export const requireVendor = requireRole(['VENDOR']);
export const requireUserOrVendor = requireRole(['USER', 'VENDOR']);
export const requireAdmin = requireRole(['ADMIN']);

export default requireRole;
