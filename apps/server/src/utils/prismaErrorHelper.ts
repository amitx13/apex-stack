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
