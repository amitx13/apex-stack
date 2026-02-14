import type { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "@repo/db";
import jwt from 'jsonwebtoken';
import { customAlphabet } from 'nanoid'
import admin from "../config/firebase.admin.js";
import { getConflictingFields, getReadableFieldName } from "../utils/prismaErrorHelper.js";

export const login = async (req: Request, res: Response) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        throw new ApiError(400, "Mobile number and password are required");
    }

    const user = await prisma.user.findUnique({
        where: {
            phone,
        },
        select: {
            id: true,
            gasConsumerNumber: true,
            password: true,
        }
    });

    if (!user) {
        throw new ApiError(404, "Account not found. Please sign up first.");
    }

    if (user.password !== password) {
        throw new ApiError(401, "Invalid password");
    }

    const token = jwt.sign(
        { userId: user.id, gas: user.gasConsumerNumber },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
    );

    res.json({
        success: true,
        token,
        message: "Logged in",
    });
};

export const loginWithOtp = async (req: Request, res: Response) => {
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
        throw new ApiError(400, "Service error, Login using password");
    }

    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const phoneWithCode = decodedToken.phone_number;

    if (!phoneWithCode) {
        throw new ApiError(400, "Phone verification failed. Please try again");
    }

    const phone = phoneWithCode.slice(-10);

    const user = await prisma.user.findFirst({
        where: {
            phone
        },
        select: {
            id: true,
            gasConsumerNumber: true,
            password: true,
        }
    });

    if (!user) {
        throw new ApiError(404, "Account not found. Please sign up first.");
    }

    const token = jwt.sign(
        { userId: user.id, gas: user.gasConsumerNumber },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
    );

    res.json({
        success: true,
        token,
        message: "Logged in",
    });
};

export function generateGHId(): string {
    const num = Math.floor(1000000 + Math.random() * 9000000); // 7 digits
    return `IUS-${num}`;
}

export const nanoidAlphaNum = customAlphabet(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    6
);

export function generateReferalCode() {
    return nanoidAlphaNum();
}

export async function createUserSafely(data: {
    name: string;
    password: string;
    phone: string;
    gasConsumerNumber: string;
    sponsorId: string;
}) {
    const MAX_RETRIES = 8;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            return await prisma.user.create({
                data: {
                    id: generateGHId(),
                    code: generateReferalCode(),
                    ...data
                }
            });

        } catch (err: any) {

            if (err.code === "P2002") {
                const fields = getConflictingFields(err);

                // Retry for auto-generated fields
                if (fields?.includes("id") || fields?.includes("code")) {
                    continue;
                }

                // User-friendly error for duplicate data
                if (fields && fields.length > 0) {
                    const fieldName = getReadableFieldName(fields[0]);
                    throw new ApiError(409, `${fieldName} already registered`);
                }

                throw new ApiError(409, "User already exists");
            }

            throw err;
        }
    }

    throw new ApiError(500, "Failed to create user. Please try again.");
}

export const createNewUserAccount = async (req: Request, res: Response) => {
    const { name, phone, gasConsumerNumber, referralCode, password } = req.body;

    if (!name || !password || !phone || !gasConsumerNumber || !referralCode) {
        throw new ApiError(400, "Missing required fields");
    }

    const sponsor = await prisma.user.findUnique({
        where: { code: referralCode },
        select: { id: true, isActive: true }
    });

    if (!sponsor) throw new ApiError(400, "Invalid referral code");
    if (!sponsor.isActive) throw new ApiError(400, "Sponsor account not active");

    const user = await createUserSafely({
        name,
        password,
        phone,
        gasConsumerNumber,
        sponsorId: sponsor.id
    });

    const token = jwt.sign(
        { userId: user.id, gas: user.gasConsumerNumber },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
    );

    res.json({
        success: true,
        token,
        user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            isActive: user.isActive,
            gasConsumerNumber: user.gasConsumerNumber,
            isRegistrationPayment: user.isRegistrationPayment,
            isGasConsumerVerified: user.isGasConsumerVerified
        },
        message: "Signing up..."
    });
};


export const fetchMe = async (req: Request, res: Response) => {

    const userId = req.user?.userId;

    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }

    const user = await prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            isActive: true,
            gasConsumerNumber: true,
            password: true,
            isRegistrationPayment: true,
            isGasConsumerVerified: true,
            _count: {
                select: {
                    referredUsers: {
                        where: {
                            isActive: true  // ✅ Filter in database
                        }
                    }
                }
            },
            wallets: {
                where: {
                    type: {
                        in: ["SPEND", "WITHDRAWAL"]
                    }
                },
                select: {
                    type: true,
                    balance: true,
                }
            }
        }
    });

    if (!user) {
        throw new ApiError(404, "Account not found. Please sign up first.");
    }

    const spendWallet = user.wallets.find((w) => w.type === "SPEND");
    const withdrawalWallet = user.wallets.find((w) => w.type === "WITHDRAWAL");

    // console.log(user)

    res.json({
        success: true,
        user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            isActive: user.isActive,
            gasConsumerNumber: user.gasConsumerNumber,
            isRegistrationPayment: user.isRegistrationPayment,
            isGasConsumerVerified: user.isGasConsumerVerified,
            membersCount: user._count.referredUsers,
            spendBalance: spendWallet ? spendWallet.balance : 0,
            withdrawalBalance: withdrawalWallet ? withdrawalWallet.balance : 0,
        },
    });
}