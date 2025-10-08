import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import Shop from '../models/shop.model.js';
import Item from '../models/item.model.js';
import Order from '../models/order.model.js';
import DeliveryAssignment from '../models/deliveryAssignment.model.js';

dotenv.config();

const clearDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');

        // Clear all collections
        await User.deleteMany({});
        console.log('Cleared Users collection');

        await Shop.deleteMany({});
        console.log('Cleared Shops collection');

        await Item.deleteMany({});
        console.log('Cleared Items collection');

        await Order.deleteMany({});
        console.log('Cleared Orders collection');

        await DeliveryAssignment.deleteMany({});
        console.log('Cleared DeliveryAssignments collection');

        console.log('✅ Database cleared successfully!');
        console.log('All default/existing data has been removed.');
        
    } catch (error) {
        console.error('❌ Error clearing database:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
};

clearDatabase();