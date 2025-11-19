// http://localhost:3000/hr/employees → fetch from SQL

// http://localhost:3000/hr/employees/mongo → fetch from MongoDB

// http://localhost:3000/hr/employees/sync → manual sync (POST request)


// const express = require('express');
// const sql = require('mssql');
// const mongoose = require('mongoose');
// const cron = require('node-cron');
// require('dotenv').config();

// const app = express();
// const PORT = 3000;

// // SQL Server config
// const sqlConfig = {
//   user: 'AlWessil',
//   password: 'P@ssw0rd1',
//   server: '10.1.1.103',
//   database: 'EmployeeDB',
//   options: {
//     encrypt: false,
//     trustServerCertificate: true
//   }
// };

// // MongoDB config
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log('✅ MongoDB connected'))
//   .catch(err => console.error('MongoDB connection error:', err));

// // Employee Schema
// const employeeSchema = new mongoose.Schema({}, { collection: 'employees', strict: false });
// const Employee = mongoose.model('Employee', employeeSchema);

// // Function to sync SQL → Mongo
// async function syncEmployees() {
//   try {
//     console.log('🕒 Sync started...');
//     const pool = await sql.connect(sqlConfig);
//     const result = await pool.request().query('SELECT * FROM EmployeeData');
//     await Employee.deleteMany({});
//     await Employee.insertMany(result.recordset);
//     console.log(`✅ Synced ${result.recordset.length} records at ${new Date().toLocaleString()}`);
//   } catch (err) {
//     console.error('❌ Error syncing employees:', err);
//   }
// }

// // Function to start cron job
// function startEmployeeCron() {
//   cron.schedule('0 0 * * *', () => {
//     console.log('🕛 Daily employee sync triggered');
//     syncEmployees();
//   });
// }

// // 1️⃣ GET from SQL
// app.get('/hr/employees', async (req, res) => {
//   try {
//     const pool = await sql.connect(sqlConfig);
//     const result = await pool.request().query('SELECT * FROM EmployeeData');
//     res.json(result.recordset);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Error fetching data');
//   }
// });

// // 2️⃣ Manual sync (if needed)
// app.post('/hr/employees/sync', async (req, res) => {
//   try {
//     await syncEmployees();
//     res.send('✅ Employees synced manually');
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Error syncing data');
//   }
// });

// // 3️⃣ GET from Mongo
// app.get('/hr/employees/mongo', async (req, res) => {
//   try {
//     const docs = await Employee.find().lean();
//     res.json(docs);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Error fetching employees from MongoDB');
//   }
// });

// // Start server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
// });

// module.exports = { startEmployeeCron, syncEmployees };



const express = require('express');
const router = express.Router();
const sql = require('mssql');
const mongoose = require('mongoose');
const cron = require('node-cron');
require('dotenv').config();

const sqlConfig = {
  user: 'AlWessil',
  password: 'P@ssw0rd1',
  server: '10.1.1.103',
  database: 'EmployeeDB',
  options: { encrypt: false, trustServerCertificate: true }
};

const employeeSchema = new mongoose.Schema({}, { collection: 'employees', strict: false });
const Employee = mongoose.model('Employee', employeeSchema);

async function syncEmployees() {
  const pool = await sql.connect(sqlConfig);
  const result = await pool.request().query('SELECT * FROM EmployeeData');
  await Employee.deleteMany({});
  await Employee.insertMany(result.recordset);
  console.log(`✅ Synced ${result.recordset.length} employees`);
}

function startEmployeeCron() {
  cron.schedule('0 0 * * *', syncEmployees);
}

router.get('/employees', async (req, res) => {
  const pool = await sql.connect(sqlConfig);
  const result = await pool.request().query('SELECT * FROM EmployeeData');
  res.json(result.recordset);
});

router.get('/employees/mongo', async (req, res) => {
  const docs = await Employee.find();
  res.json(docs);
});

router.post('/employees/sync', async (req, res) => {
  await syncEmployees();
  res.send('✅ Manual sync complete');
});

module.exports = { router, startEmployeeCron };
