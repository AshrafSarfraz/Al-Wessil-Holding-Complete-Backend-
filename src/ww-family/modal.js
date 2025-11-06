const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  EmployeeCode: String,
  QID: String,
  Name: String,
  NameA: String,
  Department: String,
  CompanyName: String,
  DepManagerName: String,
  EmpStatus: Boolean,
  Title: String,
  Nationality: String,
  Sex: String,
  MobilePhone: String,
  Email: String,
  BirthDate: Date,
  DateHired: Date,
  PassportNo: String,
  ContractEndDate: String,
  QIDExpiery: String,
  LeaveBalance: Number,
  Absence: Number,
  WorkLocation: String
}, { collection: 'employees' }); // 👈 important: collection name

module.exports = mongoose.model('Employee', employeeSchema);
