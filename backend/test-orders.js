import mongoose from 'mongoose';
import Order from './models/order.model.js';
import User from './models/user.model.js';
import Shop from './models/shop.model.js';
import Item from './models/item.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function testOrdersSystem() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');
        
        // Check existing data
        const users = await User.find({}, 'fullName email role');
        const shops = await Shop.find({}, 'name city owner');
        const items = await Item.find({}, 'name price shop');
        const orders = await Order.find({}).populate('user', 'fullName role');
        
        console.log('=== CURRENT DATA ===');
        console.log('Users:', users.length);
        users.forEach(user => {
            console.log(`- ${user.role}: ${user.fullName || user.email}`);
        });
        
        console.log('\nShops:', shops.length);
        shops.forEach(shop => {
            console.log(`- ${shop.name} in ${shop.city}`);
        });
        
        console.log('\nItems:', items.length);
        items.forEach(item => {
            console.log(`- ${item.name}: ₹${item.price}`);
        });
        
        console.log('\nOrders:', orders.length);
        orders.forEach(order => {
            console.log(`- Order by ${order.user?.fullName || 'Unknown'} (${order.user?.role || 'Unknown'}): ₹${order.totalAmount}`);
        });
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

testOrdersSystem();