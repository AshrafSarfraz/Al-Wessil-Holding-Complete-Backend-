// // src/db/connect.js
// const mongoose = require('mongoose');

// async function connectDB() {
//   const uri = process.env.MONGO_URI;
//   if (!uri) {
//     throw new Error('MONGO_URI missing in .env');
//   }

//   // avoid double-connect in dev with nodemon hot reload
//   if (mongoose.connection.readyState === 1) return;

//   await mongoose.connect(uri, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   });
// }

// module.exports = connectDB;




// /config/db.js
const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI missing in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      // mongoose v8 doesn't need extra opts
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ Mongo connect error:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
