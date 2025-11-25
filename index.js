const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();



// HR SYSTEM
const { router: employeeRouter, startEmployeeCron } = require("./src/database/hrSystem");

const adminFormRoutes = require("./src/hr-system/routes/adminFormRoutes");
const approvalPriorityRoutes = require("./src/hr-system/routes/approvalPriorityRoutes");
const publicFormRoutes = require("./src/hr-system/routes/publicFormRoutes");
const approvalRoutes = require("./src/hr-system/routes/approvalRoutes");
const managerRoutes = require("./src/hr-system/routes/managerRoutes");

// Hala B Saudi
const brandRoutes = require('./src/hbs/routes/externalApi/Brands_RedeemRoutes');
const authRoutesHBS = require("./src/hbs/routes/externalApi/Brands_RedeemRoutes");
const phoneAuthRoutes = require("./src/hbs/routes/phoneAuth");




// middleware
app.use(cors({
  origin: ["http://localhost:5173","http://127.0.0.1:5173","https://al-wessilholding.com"],
  credentials: true,
}));
app.use(express.json());

// db connect
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("Mongo connected ✅");
}).catch((err) => {
  console.error("Mongo error ❌", err);
});

// health (existing)
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ✅ add these:
app.get("/", (req, res) => {
  res.send("AWH Backend running ✅. Try /api/health or /health");
});
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/hr", employeeRouter);
app.use("/api/admin/forms", adminFormRoutes);
app.use("/api/managers", managerRoutes);
app.use("/api/approvalPriority", approvalPriorityRoutes);
app.use("/api/forms", publicFormRoutes);
app.use("/api/approvals", approvalRoutes);

// Hala B Saudi
app.use("/auth", authRoutesHBS);
app.use('/api/hbs', brandRoutes);
app.use("/api/phoneAuth", phoneAuthRoutes);



const PORT = process.env.PORT || 3000; // Render supplies PORT
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
  startEmployeeCron();
});





// // server.js
// require("dotenv").config();
// const express = require("express");
// const bodyParser = require("body-parser");
// const cors = require("cors");
// const axios = require("axios");

// const app = express();
// app.use(cors());
// app.use(bodyParser.json());

// // In-memory OTP store (demo). Production me DB/Redis use karo.
// const otps = new Map(); // key: phone, value: { otp, expiresAt }

// // SMS config – tumhari values
// const SMS_API_URL = "https://bhsms.net/httpjson/";
// const SMS_USERNAME = process.env.SMS_USERNAME || "MersalDemo";
// const SMS_APIKEY   = process.env.SMS_APIKEY   || "WLSJIQQ2V1LZ663PJCTO";
// const SMS_SENDER   = process.env.SMS_SENDER   || "Mersal";

// // -------- Helper: QatarSMS/BHSMS pe SMS bhejna ----------
// async function sendSms(to, text) {
//   // `to` ko array me bhejna hai
//   const body = {
//     username: SMS_USERNAME,
//     apikey:   SMS_APIKEY,
//     sender:   SMS_SENDER,
//     uniquesms: "0",        // single text sms
//     text,
//     scheduled: "",         // abhi ke liye, future schedule nahi
//     to: [to]               // example: ["9743xxxxxxx"]
//   };

//   const res = await axios.post(SMS_API_URL, body, {
//     headers: { "Content-Type": "application/json" },
//   });

//   return res.data;
// }

// // ========== 1) OTP SEND ROUTE ==========
// app.post("/send-otp", async (req, res) => {
//   try {
//     let { phone } = req.body;

//     // Number international format me ho: 973 / 974... without +
//     if (!phone) {
//       return res.status(400).json({ success: false, message: "phone required" });
//     }

//     // 6-digit OTP
//     const otp = Math.floor(100000 + Math.random() * 900000);
//     const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

//     otps.set(phone, { otp, expiresAt });

//     const msg = `Your verification code is: ${otp}`;

//     const gatewayRes = await sendSms(phone, msg);

//     return res.json({
//       success: true,
//       message: "OTP sent",
//       gatewayResponse: gatewayRes,
//     });
//   } catch (err) {
//     console.error("Error sending OTP:", err.response?.data || err.message);
//     return res
//       .status(500)
//       .json({ success: false, message: "Failed to send OTP" });
//   }
// });

// // ========== 2) OTP VERIFY ROUTE ==========
// app.post("/verify-otp", (req, res) => {
//   const { phone, otp } = req.body;

//   if (!phone || !otp) {
//     return res
//       .status(400)
//       .json({ success: false, message: "phone & otp required" });
//   }

//   const record = otps.get(phone);
//   if (!record) {
//     return res
//       .status(400)
//       .json({ success: false, message: "No OTP for this phone" });
//   }

//   const { otp: correctOtp, expiresAt } = record;

//   if (Date.now() > expiresAt) {
//     otps.delete(phone);
//     return res
//       .status(400)
//       .json({ success: false, message: "OTP expired, request new" });
//   }

//   if (otp.toString() !== correctOtp.toString()) {
//     return res
//       .status(400)
//       .json({ success: false, message: "Invalid OTP" });
//   }

//   otps.delete(phone);
//   return res.json({ success: true, message: "Phone verified" });
// });

// // ========== Start server ==========
// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });
