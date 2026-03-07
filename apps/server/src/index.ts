import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import path from "path";
import { errorHandler } from "./middlewares/errorHandler.js";
import userRoutes from "./routes/user.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import autopay from "./routes/autopay.routes.js";
import paymentRoutes from './routes/payment.routes.js'
import rechargeRoutes from "./routes/recharge.routes.js"
import bbpsRoutes from "./routes/bbps.routes.js"
import { startAutopayCorn, startReentryCron, startSettlementCron } from "./jobs/cron.js";
import cookieParser from "cookie-parser";
import axios from "axios";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

const allowedOrigins = [
  'https://admin.indianutilityservices.com',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(cookieParser());


app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use('/api/v1', userRoutes);
app.use('/api/v1', autopay);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/recharge', rechargeRoutes);
app.use('/api/v1/bbps', bbpsRoutes)

app.use('/api/v1/admin', adminRoutes)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

startReentryCron()
startSettlementCron()
startAutopayCorn()

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
