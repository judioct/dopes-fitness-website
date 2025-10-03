const express = require("express");
const Razorpay = require("razorpay");
const bodyParser = require("body-parser");
const crypto = require("crypto");

const app = express();
app.use(bodyParser.json());

// Razorpay setup (keys should be set in Render Environment Variables)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const SUBSCRIPTION_AMOUNT = 10; // ₹10

// Test route
app.get("/", (req, res) => {
  res.send("Razorpay Backend Running 🚀");
});

// 1️⃣ Create Order API
app.post("/create-order", async (req, res) => {
  try {
    const options = {
      amount: SUBSCRIPTION_AMOUNT * 100, // Convert to paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).send({ error: "Failed to create order" });
  }
});

// 2️⃣ Verify Payment API
app.post("/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    return res.json({ success: true, message: "Payment verified ✅" });
  } else {
    return res.status(400).json({ success: false, message: "Payment verification failed ❌" });
  }
});

// 3️⃣ Razorpay Webhook API
app.post("/webhook", (req, res) => {
  // Razorpay sends event details in req.body
  console.log("Webhook received:", req.body);

  // Webhook signature verification
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const receivedSignature = req.headers["x-razorpay-signature"];
  const generatedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (receivedSignature === generatedSignature) {
    // Signature verified, process the event (e.g., payment.captured)
    // You can update your database here
    res.status(200).send("Webhook received & verified");
  } else {
    console.error("Webhook signature mismatch!");
    res.status(400).send("Invalid webhook signature");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
