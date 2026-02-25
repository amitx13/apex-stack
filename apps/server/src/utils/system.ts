import { prisma } from "@repo/db";
import { ApiError } from "./ApiError";

let cachedAdmin: {
  adminId: string;
} | null = null;

export async function getAdminSystemIds() {
  if (cachedAdmin) return cachedAdmin;

  const admin = await prisma.user.findFirst({
    where: { 
        role: "ADMIN"
    },
    select: {
      id: true,
    },
  });

  if (!admin) {
    throw new ApiError(404, "Admin account not found.");
  }

  cachedAdmin = {
    adminId: admin.id,
  };

  return cachedAdmin;
}
