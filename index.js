const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// ROUTES
const { router: employeeRouter, startEmployeeCron } = require("./src/ww-family/employeeSync");
const adminFormRoutes = require("./src/hr-system/routes/adminFormRoutes");
const approvalPriorityRoutes = require("./src/hr-system/routes/approvalPriorityRoutes");
const publicFormRoutes = require("./src/hr-system/routes/publicFormRoutes");
const approvalRoutes = require("./src/hr-system/routes/approvalRoutes");
const HrSystemData = require("./src/ww-family/get_Data_from_mongo");
const managerRoutes = require("./src/hr-system/routes/managerRoutes");
const brandRoutes = require('./src/hbs/routes/brandRoutes');
const authRoutesHBS = require("./src/hbs/routes/loginRoute");




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

app.use("/auth", authRoutesHBS);
app.use('/api/hbs', brandRoutes);

// start
const PORT = process.env.PORT || 3000; // Render supplies PORT
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
  console.log("🚀 APP_BASE_URL:",process.env.APP_BASE_URL);
});


