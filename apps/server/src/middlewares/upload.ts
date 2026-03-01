import multer from "multer";
import path from "path";
import fs from "fs";
import { RequestHandler } from "express";  // ✅ TypeScript types

const tempStorage = multer.memoryStorage();

export const upload = multer({
    storage: tempStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req: any, file: any, cb: any) {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed!"), false);
        }
    },
});

export const processImage: RequestHandler = async (req, res, next) => {
    if (!req.file) return next();

    // ✅ Changed to qrcode folder
    const uploadFolder = path.join(__dirname, "../../uploads/qrcode");

    if (!fs.existsSync(uploadFolder)) {
        fs.mkdirSync(uploadFolder, { recursive: true });
    }

    const ext = path.extname(req.file.originalname);
    const baseName = path.basename(req.file.originalname, ext);
    const filename = `${baseName}-${Date.now()}${ext}`;

    const filePath = path.join(uploadFolder, filename);

    try {
        fs.writeFileSync(filePath, req.file.buffer);

        // ✅ Updated DB path
        req.file.path = `/uploads/qrcode/${filename}`;
        req.file.filename = filename;

        next();
    } catch (err) {
        // console.error('Image processing error:', err);
        return res.status(500).json({
            success: false,
            message: "Error processing image"
        });
    }
};
