import { 
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError
} from '@prisma/client-runtime-utils';

export function getConflictingFields(err: any): string[] | undefined {
    if (err.code !== "P2002") return undefined;

    // New Prisma with driver adapters (PostgreSQL driver adapter)
    if (err.meta?.driverAdapterError?.cause?.constraint?.fields) {
        return err.meta.driverAdapterError.cause.constraint.fields;
    }

    // Standard Prisma error format
    if (err.meta?.target) {
        return Array.isArray(err.meta.target) 
            ? err.meta.target 
            : [err.meta.target];
    }

    // Parse from error message as last resort
    const match = err.message?.match(/fields?: \(?`?(\w+)`?\)?/);
    if (match) {
        return [match[1]];
    }

    return undefined;
}

export function getReadableFieldName(field: string): string {
    const fieldMap: Record<string, string> = {
        phone: "Phone number",
        email: "Email",
        gasConsumerNumber: "Gas consumer number",
        code: "User code",
        id: "User ID"
    };
    
    return fieldMap[field] || field;
}

export function handlePrismaError(
  err: 
    | PrismaClientKnownRequestError
    | PrismaClientValidationError
    | PrismaClientUnknownRequestError
    | PrismaClientRustPanicError
    | PrismaClientInitializationError
) {
  // 1️⃣ Known request errors (most common – have a `code`)
  if (err instanceof PrismaClientKnownRequestError) {
    const code = err.code;
    const meta = err.meta;

    switch (code) {
      // ---- UNIQUE CONSTRAINT VIOLATION ----
      case 'P2002':
        const fields = getConflictingFields(err) || ['field'];
        const readableField = getReadableFieldName(fields[0]);
        const fieldList = fields.map(f => getReadableFieldName(f)).join(', ');
        return {
          statusCode: 409,
          message: fields.length === 1
            ? `${readableField} already exists.`
            : `The following fields must be unique: ${fieldList}.`,
          errorCode: code,
          details: process.env.NODE_ENV !== 'production' ? { fields } : undefined
        };

      // ---- RECORD NOT FOUND ----
      case 'P2025':
        return {
          statusCode: 404,
          message: meta?.cause 
            ? String(meta.cause) 
            : 'Record not found.',
          errorCode: code,
          details: process.env.NODE_ENV !== 'production' ? meta : undefined
        };

      // ---- FOREIGN KEY CONSTRAINT FAILED ----
      case 'P2003':
        const fieldName = meta?.field_name || 'related record';
        return {
          statusCode: 400,
          message: `Invalid reference: ${fieldName} does not exist.`,
          errorCode: code,
          details: process.env.NODE_ENV !== 'production' ? meta : undefined
        };

      // ---- REQUIRED RELATION VIOLATION ----
      case 'P2014':
        return {
          statusCode: 400,
          message: 'A required relation is missing.',
          errorCode: code,
          details: process.env.NODE_ENV !== 'production' ? meta : undefined
        };

      // ---- INVALID DATA (e.g. wrong type) ----
      case 'P2006':
        return {
          statusCode: 400,
          message: 'Provided value is too long or invalid.',
          errorCode: code,
          details: process.env.NODE_ENV !== 'production' ? meta : undefined
        };

      // ---- NULL CONSTRAINT VIOLATION ----
      case 'P2011':
        return {
          statusCode: 400,
          message: `Field '${meta?.constraint || 'unknown'}' cannot be null.`,
          errorCode: code,
          details: process.env.NODE_ENV !== 'production' ? meta : undefined
        };

      // ---- DEFAULT: other known errors ----
      default:
        return {
          statusCode: 400,
          message: 'Database request failed.',
          errorCode: code,
          details: process.env.NODE_ENV !== 'production' ? meta : undefined
        };
    }
  }

  // 2️⃣ Validation error (e.g. wrong data type, missing field)
  if (err instanceof PrismaClientValidationError) {
    return {
      statusCode: 400,
      message: 'Invalid data provided to the database.',
      errorCode: 'VALIDATION',
      details: process.env.NODE_ENV !== 'production' 
        ? { validationError: err.message } 
        : undefined
    };
  }

  // 3️⃣ Initialization error (can't connect to DB)
  if (err instanceof PrismaClientInitializationError) {
    return {
      statusCode: 503,
      message: 'Database service unavailable.',
      errorCode: 'DB_INIT',
      details: process.env.NODE_ENV !== 'production' 
        ? { error: err.message } 
        : undefined
    };
  }

  // 4️⃣ Rust panic / unknown request errors
  if (err instanceof PrismaClientRustPanicError ||
      err instanceof PrismaClientUnknownRequestError) {
    return {
      statusCode: 503,
      message: 'Unexpected database error.',
      errorCode: err instanceof PrismaClientRustPanicError ? 'DB_PANIC' : 'DB_UNKNOWN',
      details: process.env.NODE_ENV !== 'production' 
        ? { error: err.message } 
        : undefined
    };
  }

  // 5️⃣ Fallback – should never reach here
  return {
    statusCode: 500,
    message: 'Internal server error.',
    errorCode: 'UNKNOWN'
  };
}