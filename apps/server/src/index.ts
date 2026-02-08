import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import { errorHandler } from "./middlewares/errorHandler.js";
import userRoutes from "./routes/user.routes.js";
import paymentRoutes from './routes/payment.routes.js'
import { startReentryCron } from "./jobs/reentry-cron.js";

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
app.use('/api/v1/payment', paymentRoutes); 

/* ---------- ERROR HANDLER (LAST) ---------- */
app.use(errorHandler);

// startReentryCron()

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
