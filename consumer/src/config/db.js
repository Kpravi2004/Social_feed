const mongoose = require("mongoose");

async function connectMongo() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/socialfeed";
  await mongoose.connect(uri);
  console.log(`[${process.env.INSTANCE_ID || "api"}] MongoDB connected`);
}

module.exports = { connectMongo };
