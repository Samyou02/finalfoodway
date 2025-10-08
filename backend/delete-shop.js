import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Shop from './models/shop.model.js';
import Item from './models/item.model.js';
import User from './models/user.model.js';

dotenv.config();

async function deleteShop() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');

        // Find the shop to delete
        const shopToDelete = await Shop.findOne({ name: 'samyuktha kommula' });
        
        if (!shopToDelete) {
            console.log('Shop "samyuktha kommula" not found');
            return;
        }

        console.log(`Found shop: ${shopToDelete.name} (ID: ${shopToDelete._id})`);

        // Delete all items belonging to this shop
        const itemsDeleted = await Item.deleteMany({ shop: shopToDelete._id });
        console.log(`Deleted ${itemsDeleted.deletedCount} items from the shop`);

        // Delete the shop
        await Shop.findByIdAndDelete(shopToDelete._id);
        console.log(`Successfully deleted shop: ${shopToDelete.name}`);

        // Verify remaining shops
        console.log('\n=== REMAINING SHOPS ===');
        const remainingShops = await Shop.find({}).populate('owner', 'email');
        remainingShops.forEach(shop => {
            console.log(`- Shop: ${shop.name}`);
            console.log(`  Owner: ${shop.owner ? shop.owner.email : 'NULL'}`);
            console.log(`  ID: ${shop._id}`);
        });

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

deleteShop();