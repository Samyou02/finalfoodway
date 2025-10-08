import mongoose from 'mongoose';
import User from '../models/user.model.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const updateDeliveryPermissions = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');

        // Update all users to have deliveryAllowed: true
        const result = await User.updateMany(
            { deliveryAllowed: { $ne: true } }, // Find users where deliveryAllowed is not true
            { $set: { deliveryAllowed: true } }
        );

        console.log(`Updated ${result.modifiedCount} users with delivery permissions`);
        
        // Verify the update
        const totalUsers = await User.countDocuments();
        const usersWithDelivery = await User.countDocuments({ deliveryAllowed: true });
        
        console.log(`Total users: ${totalUsers}`);
        console.log(`Users with delivery allowed: ${usersWithDelivery}`);
        
        if (totalUsers === usersWithDelivery) {
            console.log('✅ All users now have delivery permissions!');
        } else {
            console.log('⚠️ Some users still don\'t have delivery permissions');
        }

    } catch (error) {
        console.error('Error updating delivery permissions:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
};

// Run the migration
updateDeliveryPermissions();