import mongoose from 'mongoose';
import Order from './models/order.model.js';
import User from './models/user.model.js';
import Shop from './models/shop.model.js';
import Item from './models/item.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixOrderData() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');
        
        // Get the correct shop and owner
        const shop = await Shop.findOne({}).populate('owner');
        if (!shop) {
            console.log('No shop found!');
            return;
        }
        
        console.log(`Found shop: ${shop.name} owned by ${shop.owner.fullName}`);
        console.log(`Shop ID: ${shop._id}`);
        console.log(`Owner ID: ${shop.owner._id}`);
        
        // Get all orders that need fixing
        const orders = await Order.find({});
        console.log(`Found ${orders.length} orders to check`);
        
        for (const order of orders) {
            let needsUpdate = false;
            
            console.log(`\\nChecking order ${order._id}:`);
            
            for (let i = 0; i < order.shopOrders.length; i++) {
                const shopOrder = order.shopOrders[i];
                
                console.log(`  Shop Order ${i + 1}:`);
                console.log(`    Current shop: ${shopOrder.shop || 'null'}`);
                console.log(`    Current owner: ${shopOrder.owner || 'null'}`);
                
                // Fix missing or incorrect shop reference
                if (!shopOrder.shop || shopOrder.shop.toString() !== shop._id.toString()) {
                    console.log(`    -> Fixing shop reference`);
                    order.shopOrders[i].shop = shop._id;
                    needsUpdate = true;
                }
                
                // Fix missing or incorrect owner reference
                if (!shopOrder.owner || shopOrder.owner.toString() !== shop.owner._id.toString()) {
                    console.log(`    -> Fixing owner reference`);
                    order.shopOrders[i].owner = shop.owner._id;
                    needsUpdate = true;
                }
            }
            
            if (needsUpdate) {
                await order.save();
                console.log(`  ✅ Order ${order._id} updated successfully`);
            } else {
                console.log(`  ✅ Order ${order._id} is already correct`);
            }
        }
        
        console.log('\\n=== VERIFICATION ===');
        // Verify the fixes
        const updatedOrders = await Order.find({})
            .populate('user', 'fullName email role')
            .populate('shopOrders.shop', 'name')
            .populate('shopOrders.owner', 'fullName email role');
        
        updatedOrders.forEach((order, index) => {
            console.log(`Order ${index + 1}:`);
            console.log(`  Customer: ${order.user?.fullName || order.user?.email || 'Unknown'}`);
            order.shopOrders.forEach((shopOrder, shopIndex) => {
                console.log(`    Shop Order ${shopIndex + 1}: ${shopOrder.shop?.name || 'Unknown'} -> ${shopOrder.owner?.fullName || 'Unknown'}`);
            });
        });
        
        await mongoose.disconnect();
        console.log('\\n✅ Order data fix completed!');
    } catch (error) {
        console.error('Error:', error);
    }
}

fixOrderData();