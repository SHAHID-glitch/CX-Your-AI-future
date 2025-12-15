// Script to fix database indexes after schema change
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/copilot-db';

async function fixDatabase() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        console.log('\n📋 Current indexes:');
        const indexes = await usersCollection.indexes();
        indexes.forEach(index => {
            console.log(`  - ${index.name}:`, JSON.stringify(index.key));
        });

        // Drop the old email_1 index if it exists
        try {
            console.log('\n🗑️  Dropping old email_1 index...');
            await usersCollection.dropIndex('email_1');
            console.log('✅ Successfully dropped email_1 index');
        } catch (error) {
            if (error.code === 27 || error.codeName === 'IndexNotFound') {
                console.log('ℹ️  email_1 index does not exist (already dropped)');
            } else {
                throw error;
            }
        }

        // Optionally: Clear all users to start fresh (uncomment if needed)
        // console.log('\n🗑️  Clearing all users...');
        // await usersCollection.deleteMany({});
        // console.log('✅ All users cleared');

        console.log('\n📋 Updated indexes:');
        const newIndexes = await usersCollection.indexes();
        newIndexes.forEach(index => {
            console.log(`  - ${index.name}:`, JSON.stringify(index.key));
        });

        console.log('\n✅ Database fix completed successfully!');
        console.log('You can now restart your server.\n');
        
    } catch (error) {
        console.error('❌ Error fixing database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

fixDatabase();
