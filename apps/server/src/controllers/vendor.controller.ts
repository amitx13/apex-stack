import type { Request, Response } from "express";
// import fs from 'fs';
import path from 'path';
import fs from 'fs/promises';
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "@repo/db";
import QRCode from 'qrcode';

export const updateVendorComissionRate = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;

  const { commissionRate } = req.body;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  if (role !== "VENDOR") {
    throw new ApiError(403, "Access denied. User is not a vendor");
  }

  if (commissionRate === undefined || commissionRate === null) {
    throw new ApiError(400, "Commission rate is required");
  }

  const rate = parseFloat(commissionRate);

  if (isNaN(rate)) {
    throw new ApiError(400, "Commission rate must be a valid number");
  }

  if (rate < 0 || rate > 100) {
    throw new ApiError(400, "Commission rate must be between 0 and 100");
  }

  const decimalPlaces = (rate.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    throw new ApiError(400, "Commission rate can have maximum 2 decimal places");
  }

  const vendor = await prisma.vendor.update({
    where: {
      id: userId,
      role: "VENDOR"
    },
    data: {
      commissionRate: rate
    }
  });

  res.json({
    success: true,
    msg: "Commission rate updated successfully",
    data: {
      commissionRate: vendor.commissionRate
    }
  });
};

export const addBankDetails = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const {
    accountNumber,
    ifscCode,
    bankName,
    accountType,
    upiId,
    gPay,
  } = req.body;

  const qrCode = req.file?.path || null;

  if (role === "VENDOR") {
    try {
      // ✅ Exact match to your frontend FormData + schema
      await prisma.vendorBankDetail.create({
        data: {
          vendorId: userId,
          bankName,
          accountNumber,
          ifscCode: ifscCode.toUpperCase(),
          accountType,
          upiId: upiId || null,
          qrCode,
          gPay: gPay || null,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Bank details added successfully',
      });

    } catch (error: any) {
      console.error('DB Error:', error);
      if (error.message) {
        throw new ApiError(500, error.message);
      }
      throw new ApiError(500, "Failed to add bank details");
    }
  } else {
    try {
      // ✅ Exact match to your frontend FormData + schema
      await prisma.bankDetail.create({
        data: {
          userId: userId,
          bankName,
          accountNumber,
          ifscCode: ifscCode.toUpperCase(),
          accountType,
          upiId: upiId || null,
          qrCode,
          gPay: gPay || null,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Bank details added successfully',
      });

    } catch (error: any) {
      console.error('DB Error:', error);
      if (error.message) {
        throw new ApiError(500, error.message);
      }
      throw new ApiError(500, "Failed to add bank details");
    }
  }
};

export async function deleteUploadedFile(dbPath: string) {
  if (!dbPath) return;

  const cleaned = dbPath.startsWith("/") ? dbPath.slice(1) : dbPath;
  const fullPath = path.resolve(process.cwd(), cleaned);

  try {
    await fs.unlink(fullPath);
    console.log("Deleted file:", fullPath);
  } catch (err: any) {
    console.warn("File already missing:", fullPath);
  }
}

export const updateBankDetails = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role
  let uploadedFilePath: string | null = null;

  if (req.file) {
    uploadedFilePath = req.file.path;
  }

  if (!userId) {
    if (uploadedFilePath) {
      await deleteUploadedFile(uploadedFilePath);
    }
    
    throw new ApiError(401, "Unauthorized");
  }


  const { bankName, accountNumber, ifscCode, accountType, upiId, gPay } = req.body;

  if (!bankName || !accountNumber || !ifscCode || !accountType) {
    if (uploadedFilePath) {
      await deleteUploadedFile(uploadedFilePath);
    }

    throw new ApiError(400, "Bank name, account number, IFSC and account type are required");
  }
  if (role === "VENDOR") {
    const existing = await prisma.vendorBankDetail.findUnique({
      where: { vendorId: userId },
    });

    if (!existing) {
      if (uploadedFilePath) {
        await deleteUploadedFile(uploadedFilePath);
      }

      throw new ApiError(404, "Bank details not found");
    }

    if (req.file?.path && existing.qrCode) {
      await deleteUploadedFile(existing.qrCode);
    }

    const qrCode = req.file?.path ?? existing.qrCode;

    try {
      const updated = await prisma.vendorBankDetail.update({
        where: { vendorId: userId },
        data: {
          bankName,
          accountNumber,
          ifscCode: ifscCode.toUpperCase(),
          accountType,
          upiId: upiId || null,
          gPay: gPay || null,
          qrCode,
        },
      });

      res.status(200).json({
        success: true,
        message: "Bank details updated successfully",
        data: updated,
      });
    } catch (err: any) {
      if (uploadedFilePath) await deleteUploadedFile(uploadedFilePath);
      if (err.message) {
        throw new ApiError(500, err.message);
      }
      throw new ApiError(500, "Failed to update bank details");
    }
  } else {
    const existing = await prisma.bankDetail.findUnique({
      where: { userId: userId },
    });

    if (!existing) {
      if (uploadedFilePath) {
        await deleteUploadedFile(uploadedFilePath);
      }

      throw new ApiError(404, "Bank details not found");
    }

    if (req.file?.path && existing.qrCode) {
      await deleteUploadedFile(existing.qrCode);
    }

    const qrCode = req.file?.path ?? existing.qrCode;

    try {
      const updated = await prisma.bankDetail.update({
        where: { userId: userId },
        data: {
          bankName,
          accountNumber,
          ifscCode: ifscCode.toUpperCase(),
          accountType,
          upiId: upiId || null,
          gPay: gPay || null,
          qrCode,
        },
      });

      res.status(200).json({
        success: true,
        message: "Bank details updated successfully",
        data: updated,
      });
    } catch (err: any) {
      if (uploadedFilePath) await deleteUploadedFile(uploadedFilePath);
      if (err.message) {
        throw new ApiError(500, err.message);
      }
      throw new ApiError(500, "Failed to update bank details");
    }
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const {
    // Personal
    ownerName,
    phone,
    password,
    // Shop
    shopName,
    category,
    pincode,
    // KYC
    panNumber,
    aadharNumber,
    gstNumber,
  } = req.body;

  // Check vendor exists
  const existing = await prisma.vendor.findUnique({
    where: { id: userId },
  });

  if (!existing) {
    throw new ApiError(404, "Vendor not found");
  }

  // ── Phone uniqueness check (only if phone is being changed) ──
  if (phone && phone !== existing.phone) {
    const phoneTaken = await prisma.vendor.findFirst({
      where: { phone, NOT: { id: userId } },
    });
    if (phoneTaken) {
      throw new ApiError(409, "Phone number already in use");
    }
  }

  // ── PAN uniqueness check ──
  if (panNumber && panNumber !== existing.panNumber) {
    const panTaken = await prisma.vendor.findFirst({
      where: { panNumber: panNumber.toUpperCase(), NOT: { id: userId } },
    });
    if (panTaken) {
      throw new ApiError(409, "PAN number already in use");
    }
  }

  // ── Aadhaar uniqueness check ──
  if (aadharNumber && aadharNumber !== existing.aadharNumber) {
    const aadhaarTaken = await prisma.vendor.findFirst({
      where: { aadharNumber, NOT: { id: userId } },
    });
    if (aadhaarTaken) {
      throw new ApiError(409, "Aadhaar number already in use");
    }
  }

  // ── GST uniqueness check ──
  if (gstNumber && gstNumber !== existing.gstNumber) {
    const gstTaken = await prisma.vendor.findFirst({
      where: { gstNumber: gstNumber.toUpperCase(), NOT: { id: userId } },
    });
    if (gstTaken) {
      throw new ApiError(409, "GST number already in use");
    }
  }

  // ── Build update payload (only include defined fields) ──
  const updateData: Record<string, any> = {};

  if (ownerName) updateData.ownerName = ownerName;
  if (phone) updateData.phone = phone;
  if (password) updateData.password = password;
  if (shopName) updateData.shopName = shopName;
  if (category) updateData.category = category.toUpperCase();
  if (pincode) updateData.pincode = pincode;
  if (panNumber) updateData.panNumber = panNumber.toUpperCase();
  if (aadharNumber) updateData.aadharNumber = aadharNumber;
  if (gstNumber !== undefined) updateData.gstNumber = gstNumber?.toUpperCase() || null;

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "No fields provided to update");
  }

  const updated = await prisma.vendor.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      ownerName: true,
      phone: true,
      commissionRate: true,
      sponsorId: true,
      isActive: true,
      approvalStatus: true,
      rejectionReason: true,
      shopName: true,
      category: true,
      pincode: true,
      panNumber: true,
      aadharNumber: true,
      gstNumber: true,
      createdAt: true,
    },
  });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
  });
}

export const generateVendorQR = async (req: Request, res: Response) => {
  const vendorId = req.user?.userId;

  if (!vendorId) {
    throw new ApiError(401, "Unauthorized");
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      isActive: true,
      approvalStatus: true,
      paymentQr: true,
    },
  });

  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }

  if (!vendor.isActive || vendor.approvalStatus !== 'APPROVED') {
    throw new ApiError(403, "Only approved and active vendors can generate a QR");
  }

  // ✅ Delete old QR from disk if exists
  if (vendor.paymentQr) {
    await deleteUploadedFile(vendor.paymentQr);
  }

  // ✅ Ensure upload directory exists
  const dir = path.resolve(process.cwd(), 'uploads/qrcode');
  await fs.mkdir(dir, { recursive: true });

  const fileName = `vendor_${vendorId}.png`;
  const filePath = path.join(dir, fileName);
  const dbPath = `uploads/qrcode/${fileName}`;

  // ✅ QR encodes only vendorId — everything else resolved server-side at scan time
  try {
    await QRCode.toFile(filePath, vendorId, {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    throw new ApiError(500, "Failed to generate QR code image");
  }

  // ✅ Persist new QR path — if this fails, clean up the file
  try {
    const updated = await prisma.vendor.update({
      where: { id: vendorId },
      data: { paymentQr: dbPath },
      select: {
        id: true,
        shopName: true,
        paymentQr: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Payment QR generated successfully",
      data: updated,
    });
  } catch (err) {
    // DB failed — remove the newly generated file so disk stays clean
    await deleteUploadedFile(dbPath);
    throw new ApiError(500, "Failed to save QR code");
  }
};

export const getVendorQR = async (req: Request, res: Response) => {
  const vendorId = req.user?.userId;

  if (!vendorId) {
    throw new ApiError(401, "Unauthorized");
  }

  const vendor = await prisma.vendor.findUnique({
    where: {
      id: vendorId
    },
    select: {
      paymentQr: true
    }
  })

  if (!vendor) throw new ApiError(404, "Vendor not Found")

  res.status(200).json({
    success: true,
    message: "Payment QR generated successfully",
    data: vendor.paymentQr,
  });
}

export const vendorWallerBal = async (req: Request, res: Response) => {
  const vendorId = req.user?.userId;

  if (!vendorId) {
    throw new ApiError(401, "Unauthorized");
  }

  const vendor = await prisma.vendorWallet.findUnique({
    where: {
      vendorId
    },
    select: {
      balance: true
    }
  })

  if (!vendor) throw new ApiError(404, "Vendor wallet not Found")

  res.status(200).json({
    success: true,
    data: vendor.balance,
  });
}

export const requestInstantSettlement = async (req: Request, res: Response) => {
  const vendorId = req.user?.userId;
  if (!vendorId) throw new ApiError(401, 'Unauthorized');

  const wallet = await prisma.vendorWallet.findUnique({
    where: { vendorId },
  });

  if (!wallet) throw new ApiError(404, 'Wallet not found');

  if (wallet.balance.lte(0)) {
    throw new ApiError(400, 'No balance available to settle');
  }

  // ✅ Block if already has a pending settlement
  const existingPending = await prisma.vendorWithdrawalRequest.findFirst({
    where: { vendorId, status: 'PENDING' },
  });

  if (existingPending) {
    throw new ApiError(400, 'You already have a pending settlement request. Please wait for admin to process it.');
  }

  // ✅ Atomic lock + create request
  const [, request] = await prisma.$transaction([
    prisma.vendorWallet.update({
      where: { vendorId },
      data: {
        processingBalance: { increment: wallet.balance },
        balance: 0,
      },
    }),
    prisma.vendorWithdrawalRequest.create({
      data: {
        vendorId,
        pointsRequested: wallet.balance,
        status: 'PENDING',
      },
    }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Settlement request submitted successfully',
    data: request,
  });
};

export const getVendorWallet = async (req: Request, res: Response) => {
  const vendorId = req.user?.userId;
  if (!vendorId) throw new ApiError(401, 'Unauthorized');

  const wallet = await prisma.vendorWallet.findUnique({
    where: { vendorId },
    select: { balance: true, processingBalance: true },
  });

  if (!wallet) throw new ApiError(404, 'Wallet not found');

  res.status(200).json({ success: true, data: wallet });
}

export const getSettlements = async (req: Request, res: Response) => {
  const vendorId = req.user?.userId;
  if (!vendorId) throw new ApiError(401, 'Unauthorized');

  const settlements = await prisma.vendorWithdrawalRequest.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ success: true, data: settlements });
};

export const getVendorDailySales = async (req: Request, res: Response) => {
  const vendorId = req.user?.userId;
  if (!vendorId) throw new ApiError(401, 'Unauthorized');

  const now = new Date();

  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);

  const startOfTodayIST = new Date(istNow);
  startOfTodayIST.setHours(0, 0, 0, 0);

  const startOfTomorrowIST = new Date(startOfTodayIST);
  startOfTomorrowIST.setDate(startOfTomorrowIST.getDate() + 1);

  const startUTC = new Date(startOfTodayIST.getTime() - istOffset);
  const endUTC = new Date(startOfTomorrowIST.getTime() - istOffset);

  const totalSales = await prisma.vendorTransaction.aggregate({
    where: {
      vendorId,
      createdAt: {
        gte: startUTC,
        lt: endUTC,
      },
    },
    _sum: { amount: true },
    _count: { id: true },   // ✅ fix: count lives here, not on the result object
  });

  const salesInfo = {
    totalAmtEarned: totalSales._sum.amount ?? 0,   // ✅ fix: colon not equals + null fallback
    totalNumOfTrxn: totalSales._count.id,          // ✅ fix: from _count, not .length
  };

  res.status(200).json({ success: true, data: salesInfo });
};

export const getVendorTransactionHistory = async (req: Request, res: Response) => {
  const vendorId = req.user?.userId;
  if (!vendorId) throw new ApiError(401, 'Unauthorized');

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [transactions, total] = await prisma.$transaction([
    prisma.vendorTransaction.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        amount: true,
        user: {
          select: {
            name: true
          }
        },
        commissionAmount: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.vendorTransaction.count({ where: { vendorId } }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      transactions,
      pagination: {
        total,
        page,
        limit,
        hasMore: skip + transactions.length < total,
      },
    },
  });
};

export const getVendorByQr = async (req: Request, res: Response) => {
  const vendorId = Array.isArray(req.params.vendorId)
    ? req.params.vendorId[0]
    : req.params.vendorId;

  if (!vendorId) throw new ApiError(400, "Vendor ID is required");

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      shopName: true,
      ownerName: true,
      category: true,
      isActive: true,
      commissionRate: true,
    },
  });

  if (!vendor) throw new ApiError(404, 'Vendor not found');
  if (!vendor.isActive) throw new ApiError(400, 'This vendor is currently inactive');

  res.status(200).json({ success: true, data: vendor });
};