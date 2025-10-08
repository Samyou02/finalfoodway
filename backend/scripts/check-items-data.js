import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Item from '../models/item.model.js';
import Shop from '../models/shop.model.js';

dotenv.config();

const checkItemsData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to database');

        // Check existing items
        const items = await Item.find().populate('shop');
        console.log('\n=== EXISTING ITEMS ===');
        console.log(`Total items: ${items.length}`);
        
        if (items.length > 0) {
            items.forEach(item => {
                console.log(`Item: ${item.name}, Shop: ${item.shop?.name || 'NO SHOP'}, City: ${item.city || 'NO CITY'}`);
            });
            
            // Update items with proper city data based on their shop
            for (const item of items) {
                if (!item.city && item.shop) {
                    console.log(`\nUpdating item "${item.name}" with city from shop...`);
                    await Item.findByIdAndUpdate(item._id, {
                        city: item.shop.city,
                        state: item.shop.state
                    });
                    console.log(`Item updated with city: ${item.shop.city}`);
                }
            }
        } else {
            console.log('No items found in database');
        }

        // Check updated data
        const updatedItems = await Item.find();
        console.log('\n=== UPDATED ITEMS ===');
        updatedItems.forEach(item => {
            console.log(`Item: ${item.name}, City: ${item.city}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkItemsData();