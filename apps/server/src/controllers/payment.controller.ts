import type { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "@repo/db";
import { deleteUploadedFile } from "./vendor.controller.js";
import { getAdminUserId } from "../services/matrix.service.js";
// import { paymentService } from "../services/payment.service.js";

// // 1. Initiate Registration Payment (WITH AUTH)
// export const initiatePayment = async (req: Request, res: Response) => {
//   // Get userId from authenticated user (not from body)
//   const userId = req.user?.userId;

//   if (!userId) {
//     throw new ApiError(401, "Unauthorized");
//   }

//   const paymentData = await paymentService.initiateRegistrationPayment(userId);

//   res.json({
//     success: true,
//     data: paymentData,
//     message: "Payment initiated successfully"
//   });
// };

// // 2. Verify Payment (WITH AUTH)
// export const verifyPayment = async (req: Request, res: Response) => {
//   const { orderId } = req.body;
//   const userId = req.user?.userId;

//   if (!userId) {
//     throw new ApiError(401, "Unauthorized");
//   }

//   if (!orderId) {
//     throw new ApiError(400, "Order ID is required");
//   }

//   const result = await paymentService.verifyPayment(orderId);

//   res.json({
//     success: true,
//     data: result,
//     message: result.status === 'SUCCESS'
//       ? "Payment verified successfully"
//       : "Payment verification failed"
//   });
// };

// // 3. Callback Handler (NO AUTH - Paytm callback)
// export const handleCallback = async (req: Request, res: Response) => {
//   const paytmResponse = req.body;

//   if (!paytmResponse) {
//     throw new ApiError(400, "paytmResponse is required");
//   }

//   await paymentService.handleCallback(paytmResponse);

//   res.status(200).send(`
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Payment Processing</title>
//       </head>
//       <body>
//         <h2>Processing payment...</h2>
//         <script>
//           // Close the webview
//           window.close();

//           // Fallback - try to go back
//           setTimeout(function() {
//             window.history.back();
//           }, 100);
//         </script>
//       </body>
//       </html>
//     `);
// };

// export const handleWebhook = async (req:Request, res: Response) => {

// }


export const initiatePayment = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isActive: true },
    });
    if (!user) throw new ApiError(404, 'User not found');
    if (user.isActive) throw new ApiError(400, 'Account is already active');

    // Return existing pending payment if already exists
    const existing = await prisma.payment.findFirst({
        where: { userId, status: 'PENDING' },
    });

    const adminId = await getAdminUserId();

    const adminBank = await prisma.bankDetail.findUnique({
        where: { userId: adminId },
        select: {
            bankName: true, accountNumber: true,
            accountType: true, ifscCode: true,
            upiId: true, gPay: true, qrCode: true,
        },
    });


    if (existing) {
        return res.status(200).json({
            success: true,
            data: {
                payment: {
                    ...existing,
                    amount: Number(existing.amount),
                },
                adminBank,
            },
        });
    }

    const orderId = `ORD_${userId}_${Date.now()}`;

    const payment = await prisma.payment.create({
        data: {
            userId,
            amount: 199.00,
            points: 199,
            type: 'REGISTRATION',
            status: 'PENDING',
            orderId,
        },
    });

    res.status(201).json({
        success: true,
        data: {
            payment: { ...payment, amount: Number(payment.amount) },
            adminBank,
        },
    });
};


export const submitPaymentProof = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    let screenshotPath: string | null = null;
    if (req.file) screenshotPath = req.file.path;

    const { transactionId, orderId } = req.body;
    if (!transactionId?.trim()) {
        if (screenshotPath) await deleteUploadedFile(screenshotPath);
        throw new ApiError(400, 'Transaction ID is required');
    }

    const payment = await prisma.payment.findFirst({
        where: { orderId, userId },
    });
    if (!payment) {
        if (screenshotPath) await deleteUploadedFile(screenshotPath);
        throw new ApiError(404, 'Payment record not found');
    }
    if (payment.status !== 'PENDING') {
        if (screenshotPath) await deleteUploadedFile(screenshotPath);
        throw new ApiError(400, `Payment is already ${payment.status}`);
    }

    // Check transactionId uniqueness
    const duplicate = await prisma.payment.findFirst({
        where: { transactionId: transactionId.trim(), NOT: { id: payment.id } },
    });
    if (duplicate) {
        if (screenshotPath) await deleteUploadedFile(screenshotPath);
        throw new ApiError(409, 'This transaction ID has already been used');
    }

    const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
            transactionId: transactionId.trim(),
            ...(screenshotPath && { screenshot: screenshotPath }),
        },
    });

    res.status(200).json({
        success: true,
        message: 'Payment proof submitted. Waiting for admin approval.',
        data: { ...updated, amount: Number(updated.amount) },
    });
};


export const getPaymentStatus = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const payment = await prisma.payment.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true, status: true, amount: true,
            transactionId: true, screenshot: true,
            rejectionReason: true, orderId: true,
            createdAt: true,
        },
    });

    res.status(200).json({
        success: true,
        data: payment ? { ...payment, amount: Number(payment.amount) } : null,
    });
};
