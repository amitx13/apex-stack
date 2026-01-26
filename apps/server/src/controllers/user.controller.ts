import type { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "@repo/db";
import jwt from 'jsonwebtoken';

export const login = async (req: Request, res: Response) => {
    const { userId, password } = req.body;

    if (!userId || !password) {
        throw new ApiError(400, "User ID and password are required");
    }

    const user = await prisma.user.findUnique({
        where: {
            id: userId
        },
        select:{
            id: true,
            name: true,
            phone:true,
            role:true,
            isActive:true,
            gasConsumerNumber:true,
            password: true,
            sponsorId:true,
        }
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.password !== password) {
        throw new ApiError(401, "Invalid password");
    }

    const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
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
        },
        message: "Logged in",
    });
};
