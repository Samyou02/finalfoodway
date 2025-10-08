import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Shop from './models/shop.model.js';
import User from './models/user.model.js';
import Order from './models/order.model.js';

dotenv.config();

async function checkCurrentData() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');

        // Check all shops
        console.log('\n=== CURRENT SHOPS ===');
        const shops = await Shop.find({}).populate('owner', 'email');
        shops.forEach(shop => {
            console.log(`- Shop: ${shop.name}`);
            console.log(`  Owner: ${shop.owner ? shop.owner.email : 'NULL'}`);
            console.log(`  ID: ${shop._id}`);
        });

        // Check all users
        console.log('\n=== CURRENT USERS ===');
        const users = await User.find({});
        users.forEach(user => {
            console.log(`- Email: ${user.email}`);
            console.log(`  Role: ${user.role}`);
            console.log(`  ID: ${user._id}`);
        });

        // Check orders
        console.log('\n=== CURRENT ORDERS ===');
        const orders = await Order.find({}).populate('user', 'email').populate('shop', 'name');
        console.log(`Total orders: ${orders.length}`);
        orders.forEach(order => {
            console.log(`- Order ID: ${order._id}`);
            console.log(`  User: ${order.user ? order.user.email : 'NULL'}`);
            console.log(`  Shop: ${order.shop ? order.shop.name : 'NULL'}`);
            console.log(`  Status: ${order.status}`);
            console.log(`  Total: $${order.totalAmount}`);
        });

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkCurrentData();