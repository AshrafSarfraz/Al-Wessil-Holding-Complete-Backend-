// Every time copy this and paste into index.js  run the apis
//  http://localhost:3000/employees        get data from sql
//  http://localhost:3000/employees/sync   push data to mongodb
// http://localhost:3000/employees/mongo   get data from mongodb to react-native


const express = require('express');
const sql = require('mssql');
const mongoose = require('mongoose');
require('dotenv').config();


const app = express();
const PORT = 3000;

// SQL Server config
const sqlConfig = {
    user: 'AlWessil',
    password: 'P@ssw0rd1',
    server: 'AWH-FILESRV',
    database: 'EmployeeDB',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// MongoDB config
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));
// keep your existing requires/app/mongoose connect/sql config...

// Use a defined schema that targets the right collection (employees)
const employeeSchema = new mongoose.Schema({}, { collection: 'employees', strict: false });
const Employee = mongoose.model('Employee', employeeSchema);

// 1) GET from SQL
app.get('/employees', async (req, res) => {
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request().query('SELECT * FROM EmployeeData');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching data');
  }
});

// 2) SYNC SQL -> Mongo
app.post('/employees/sync', async (req, res) => {
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request().query('SELECT * FROM EmployeeData');
    await Employee.deleteMany({});
    await Employee.insertMany(result.recordset);
    res.send(`Inserted ${result.recordset.length} records into MongoDB`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error syncing data');
  }
});

// 3) ✅ GET from Mongo (this is what you asked for)
app.get('/employees/mongo', async (req, res) => {
  try {
    const docs = await Employee.find().lean();
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching employees from MongoDB');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});