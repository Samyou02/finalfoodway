import mongoose from 'mongoose';
import Shop from './models/shop.model.js';
import User from './models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixShops() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');
        
        // Get all users
        const allUsers = await User.find();
        console.log('Available users:');
        allUsers.forEach(user => {
            console.log('- User ID:', user._id, 'Email:', user.email);
        });
        
        // Get all shops with their raw owner IDs
        const allShopsRaw = await Shop.find();
        console.log('\nRaw shops data:');
        allShopsRaw.forEach(shop => {
            console.log('- Shop:', shop.name, 'Owner ID:', shop.owner);
        });
        
        // Get shops with populated owners to see which ones fail
        const allShopsPopulated = await Shop.find().populate('owner', 'email');
        console.log('\nPopulated shops data:');
        allShopsPopulated.forEach(shop => {
            console.log('- Shop:', shop.name, 'Owner:', shop.owner ? shop.owner.email : 'NULL (broken reference)');
        });
        
        // Find shops where owner reference is broken (owner ID exists but user doesn't)
        const brokenShops = [];
        for (const shop of allShopsRaw) {
            if (shop.owner) {
                const ownerExists = await User.findById(shop.owner);
                if (!ownerExists) {
                    brokenShops.push(shop);
                    console.log(`\nBroken reference found: Shop "${shop.name}" references non-existent user ${shop.owner}`);
                }
            }
        }
        
        // Fix broken references by assigning to an existing user
        if (brokenShops.length > 0 && allUsers.length > 0) {
            const targetUser = allUsers[0]; // Use the first available user
            console.log(`\nFixing ${brokenShops.length} shops by assigning to user: ${targetUser.email}`);
            
            for (const shop of brokenShops) {
                await Shop.findByIdAndUpdate(shop._id, { owner: targetUser._id });
                console.log(`Fixed shop: ${shop.name}`);
            }
        }
        
        // Verify the fix
        console.log('\n=== AFTER FIX ===');
        const fixedShops = await Shop.find().populate('owner', 'email');
        fixedShops.forEach(shop => {
            console.log('- Shop:', shop.name, 'Owner:', shop.owner ? shop.owner.email : 'NULL');
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

fixShops();