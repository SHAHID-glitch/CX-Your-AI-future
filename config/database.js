const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false
        };

        const conn = await mongoose.connect(
            process.env.MONGODB_URI || 'mongodb://localhost:27017/copilot-db',
            options
        );

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB disconnected, attempting to reconnect...');
            setTimeout(() => {
                mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/copilot-db', options)
                    .catch(err => console.error('Reconnection failed:', err.message));
            }, 5000);
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed through app termination');
            } catch (err) {
                console.error('Error closing MongoDB connection:', err);
            }
            process.exit(0);
        });

        return conn;
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
