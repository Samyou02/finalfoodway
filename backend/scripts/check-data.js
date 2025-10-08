import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from '../models/shop.model.js';
import Item from '../models/item.model.js';
import User from '../models/user.model.js';

dotenv.config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to database');

        // Check shops
        const shops = await Shop.find().populate('owner', 'email').populate('items');
        console.log('\n=== SHOPS ===');
        console.log(`Total shops: ${shops.length}`);
        shops.forEach(shop => {
            console.log(`Shop: ${shop.name}, City: ${shop.city}, Owner: ${shop.owner?.email}, Items: ${shop.items?.length || 0}`);
        });

        // Check items
        const items = await Item.find().populate('shop', 'name city');
        console.log('\n=== ITEMS ===');
        console.log(`Total items: ${items.length}`);
        items.forEach(item => {
            console.log(`Item: ${item.name}, Shop: ${item.shop?.name}, City: ${item.shop?.city}`);
        });

        // Check users
        const users = await User.find();
        console.log('\n=== USERS ===');
        console.log(`Total users: ${users.length}`);
        users.forEach(user => {
            console.log(`User: ${user.email}, Role: ${user.role}, City: ${user.city}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkData();