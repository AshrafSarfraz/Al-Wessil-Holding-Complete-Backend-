const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// ROUTES
const adminFormRoutes = require("./src/hr-system/routes/adminFormRoutes");
const approvalPriorityRoutes = require("./src/hr-system/routes/approvalPriorityRoutes");
const publicFormRoutes = require("./src/hr-system/routes/publicFormRoutes");
const approvalRoutes = require("./src/hr-system/routes/approvalRoutes");
const HrSystemData = require("./src/ww-family/get_Data_from_mongo");
const managerRoutes = require("./src/hr-system/routes/managerRoutes");



// middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://al-wessilholding.com"],
  credentials: true,
}));
app.use(express.json());


// db connect
mongoose
  .connect(process.env.MONGO_URI, {
  })
  .then(() => {
    console.log("Mongo connected ✅");
  })
  .catch((err) => {
    console.error("Mongo error ❌", err);
  });

// health
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/employee", HrSystemData);
app.use("/api/admin/forms", adminFormRoutes);
app.use("/api/managers", managerRoutes);
app.use("/api/approvalPriority", approvalPriorityRoutes);
app.use("/api/forms", publicFormRoutes);
app.use("/api/approvals", approvalRoutes);


// start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});









// const express = require('express');
// const sql = require('mssql');
// const mongoose = require('mongoose');
// require('dotenv').config();


// const app = express();
// const PORT = 3000;

// // SQL Server config
// const sqlConfig = {
//     user: 'AlWessil',
//     password: 'P@ssw0rd1',
//     server: 'AWH-FILESRV',
//     database: 'EmployeeDB',
//     options: {
//         encrypt: false,
//         trustServerCertificate: true
//     }
// };

// // MongoDB config
// mongoose.connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// })
// .then(() => console.log('✅ MongoDB connected'))
// .catch(err => console.error('MongoDB connection error:', err));
// // keep your existing requires/app/mongoose connect/sql config...

// // Use a defined schema that targets the right collection (employees)
// const employeeSchema = new mongoose.Schema({}, { collection: 'employees', strict: false });
// const Employee = mongoose.model('Employee', employeeSchema);

// // 1) GET from SQL
// app.get('/employees', async (req, res) => {
//   try {
//     const pool = await sql.connect(sqlConfig);
//     const result = await pool.request().query('SELECT * FROM EmployeeData');
//     res.json(result.recordset);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Error fetching data');
//   }
// });

// // 2) SYNC SQL -> Mongo
// app.post('/employees/sync', async (req, res) => {
//   try {
//     const pool = await sql.connect(sqlConfig);
//     const result = await pool.request().query('SELECT * FROM EmployeeData');
//     await Employee.deleteMany({});
//     await Employee.insertMany(result.recordset);
//     res.send(`Inserted ${result.recordset.length} records into MongoDB`);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Error syncing data');
//   }
// });

// // 3) ✅ GET from Mongo (this is what you asked for)
// app.get('/employees/mongo', async (req, res) => {
//   try {
//     const docs = await Employee.find().lean();
//     res.json(docs);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Error fetching employees from MongoDB');
//   }
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
// });