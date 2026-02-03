import type { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { paymentService } from "../services/payment.service.js";

// 1. Initiate Registration Payment (WITH AUTH)
export const initiatePayment = async (req: Request, res: Response) => {
  // Get userId from authenticated user (not from body)
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const paymentData = await paymentService.initiateRegistrationPayment(userId);

  res.json({
    success: true,
    data: paymentData,
    message: "Payment initiated successfully"
  });
};

// 2. Verify Payment (WITH AUTH)
export const verifyPayment = async (req: Request, res: Response) => {
  const { orderId } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  if (!orderId) {
    throw new ApiError(400, "Order ID is required");
  }

  const result = await paymentService.verifyPayment(orderId);

  res.json({
    success: true,
    data: result,
    message: result.status === 'SUCCESS'
      ? "Payment verified successfully"
      : "Payment verification failed"
  });
};

// 3. Callback Handler (NO AUTH - Paytm callback)
export const handleCallback = async (req: Request, res: Response) => {
  const paytmResponse = req.body;

  if (!paytmResponse) {
    throw new ApiError(400, "paytmResponse is required");
  }

  await paymentService.handleCallback(paytmResponse);

  res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Processing</title>
      </head>
      <body>
        <h2>Processing payment...</h2>
        <script>
          // Close the webview
          window.close();
          
          // Fallback - try to go back
          setTimeout(function() {
            window.history.back();
          }, 100);
        </script>
      </body>
      </html>
    `);
};

export const handleWebhook = async (req:Request, res: Response) => {
  
}