import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from '../models/shop.model.js';
import User from '../models/user.model.js';

dotenv.config();

const checkShopData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to database');

        // Check existing shops and their cities
        const shops = await Shop.find();
        console.log('\n=== EXISTING SHOPS ===');
        console.log(`Total shops: ${shops.length}`);
        
        if (shops.length > 0) {
            shops.forEach(shop => {
                console.log(`Shop: ${shop.name}, City: ${shop.city || 'NO CITY'}, State: ${shop.state || 'NO STATE'}`);
            });
            
            // Update the existing shop to have proper city data
            const firstShop = shops[0];
            if (firstShop.city === 'hyd' || firstShop.city === 'Hyderaba' || !firstShop.city || !firstShop.state) {
                console.log('\nUpdating shop with proper city/state data...');
                await Shop.findByIdAndUpdate(firstShop._id, {
                    city: 'Hyderabad',
                    state: 'Telangana',
                    address: 'Hyderabad, Telangana'
                });
                console.log('Shop updated successfully!');
            }
        } else {
            console.log('No shops found in database');
        }

        // Check updated data
        const updatedShops = await Shop.find();
        console.log('\n=== UPDATED SHOPS ===');
        updatedShops.forEach(shop => {
            console.log(`Shop: ${shop.name}, City: ${shop.city}, State: ${shop.state}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkShopData();