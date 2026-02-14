// import type { Request, Response, NextFunction } from "express";
// import { ApiError } from "../utils/ApiError.js";

// export const errorHandler = (
//   err: Error,
//   _req: Request,
//   res: Response,
//   _next: NextFunction
// ) => {
//   const statusCode =
//     err instanceof ApiError ? err.statusCode : 500;

//   const message =
//     err instanceof ApiError
//       ? err.message
//       : "Internal Server Error";

//   if (process.env.NODE_ENV !== "production") {
//     console.error(err);
//   }

//   res.status(statusCode).json({
//     success: false,
//     message
//   });
// };

import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError
} from "@prisma/client-runtime-utils";
import { handlePrismaError } from "../utils/prismaErrorHelper.js";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // ---------------------------
  // 1. Log everything in development
  // ---------------------------
  if (process.env.NODE_ENV !== "production") {
    console.error("🔥 Error caught in handler:");
    console.error(err);
  }

  // ---------------------------
  // 2. Handle custom ApiError
  // ---------------------------
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
    });
  }

  // ---------------------------
  // 3. Handle Prisma errors
  // ---------------------------
  if (
    err instanceof PrismaClientKnownRequestError ||
    err instanceof PrismaClientValidationError ||
    err instanceof PrismaClientInitializationError ||
    err instanceof PrismaClientRustPanicError ||
    err instanceof PrismaClientUnknownRequestError
  ) {
    const { statusCode, message, errorCode, details } = handlePrismaError(err);
    
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errorCode && { code: errorCode }),
      ...(details && { details })
    });
  }

  // ---------------------------
  // 4. Fallback – unexpected errors
  // ---------------------------
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { 
      error: err.message,
      stack: err.stack 
    })
  });
};