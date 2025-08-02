const mongoose = require('mongoose');
const appConfig = require('./app.json');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || appConfig.database.mongodb.uri;
    const conn = await mongoose.connect(mongoUri, appConfig.database.mongodb.options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    // Don't exit in development if MongoDB is not available
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('Running in development mode without database');
    }
  }
};

module.exports = connectDB;