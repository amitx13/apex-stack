import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import path from "path";
import { errorHandler } from "./middlewares/errorHandler.js";
import userRoutes from "./routes/user.routes.js";
import autopay from "./routes/autopay.routes.js";
import paymentRoutes from './routes/payment.routes.js'
import rechargeRoutes from "./routes/recharge.routes.js"
import bbpsRoutes from  "./routes/bbps.routes.js"
import { startReentryCron, startSettlementCron } from "./jobs/cron.js";
import { imwalletAPIService } from "./services/imwallet-api.service.js";
import axios from "axios";
import { imwalletConfig } from "./config/imwallet.config.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev")); 

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use('/api/v1', userRoutes);
app.use('/api/v1', autopay);
app.use('/api/v1/payment', paymentRoutes); 
app.use('/api/v1/recharge', rechargeRoutes);
app.use('/api/v1/bbps', bbpsRoutes)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));


// Temporary route to check IMWallet balance
// app.get('/api/v1/imwallet/balance', async (_req, res) => {
//     try {
//         const balance = await imwalletAPIService.checkBalance();
//         res.json({ success: true, balance });
//     } catch (error: any) {
//         console.error('Error fetching IMWallet balance:', error.message);
//         res.status(500).json({ success: false, message: 'Failed to fetch IMWallet balance' });
//     }
// });

// app.get('/api/v1/checkRechargeStatus/:orderId', async (req, res) => {
//     const { orderId } = req.params;

//     try {
//         const result = await imwalletAPIService.checkRechargeStatus({
//           orderId:orderId,
//           dot: new Date().toISOString().split('T')[0],
//         });
//         res.json({ success: true, data: result });
//     } catch (error: any) {
//         console.error('Error checking recharge status:', error.message);
//         res.status(500).json({ success: false, message: 'Failed to check recharge status' });
//     }
// });


/* ---------- ERROR HANDLER (LAST) ---------- */
app.use(errorHandler);

// startReentryCron()
// startSettlementCron()

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
