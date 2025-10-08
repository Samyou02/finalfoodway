import mongoose from 'mongoose';
import Order from './models/order.model.js';
import User from './models/user.model.js';
import Shop from './models/shop.model.js';
import Item from './models/item.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkOrderStructure() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');
        
        // Get all orders with full details
        const orders = await Order.find({})
            .populate('user', 'fullName email role')
            .populate('shopOrders.shop', 'name owner')
            .populate('shopOrders.owner', 'fullName email role')
            .populate('shopOrders.assignedDeliveryBoy', 'fullName email role')
            .populate('shopOrders.shopOrderItems.item', 'name price');
        
        console.log('=== DETAILED ORDER ANALYSIS ===\n');
        
        orders.forEach((order, index) => {
            console.log(`ORDER ${index + 1}:`);
            console.log(`- Order ID: ${order._id}`);
            console.log(`- Customer: ${order.user?.fullName || order.user?.email || 'Unknown'} (${order.user?.role || 'Unknown'})`);
            console.log(`- Total Amount: ₹${order.totalAmount}`);
            console.log(`- Payment Status: ${order.payment}`);
            console.log(`- Created: ${order.createdAt}`);
            console.log(`- Shop Orders Count: ${order.shopOrders.length}`);
            
            order.shopOrders.forEach((shopOrder, shopIndex) => {
                console.log(`  SHOP ORDER ${shopIndex + 1}:`);
                console.log(`    - Shop: ${shopOrder.shop?.name || 'Unknown'}`);
                console.log(`    - Shop ID: ${shopOrder.shop?._id || 'No shop ID'}`);
                console.log(`    - Owner: ${shopOrder.owner?.fullName || shopOrder.owner?.email || 'No owner'}`);
                console.log(`    - Owner ID: ${shopOrder.owner?._id || 'No owner ID'}`);
                console.log(`    - Owner Role: ${shopOrder.owner?.role || 'Unknown'}`);
                console.log(`    - Assigned Delivery Boy: ${shopOrder.assignedDeliveryBoy?.fullName || 'None'}`);
                console.log(`    - Delivery Boy ID: ${shopOrder.assignedDeliveryBoy?._id || 'None'}`);
                console.log(`    - Status: ${shopOrder.status || 'No status'}`);
                console.log(`    - Subtotal: ₹${shopOrder.subtotal}`);
                console.log(`    - Items Count: ${shopOrder.shopOrderItems.length}`);
                
                shopOrder.shopOrderItems.forEach((item, itemIndex) => {
                    console.log(`      Item ${itemIndex + 1}: ${item.item?.name || item.name} - ₹${item.price} x ${item.quantity}`);
                });
            });
            
            console.log('---\n');
        });
        
        // Also check shop-owner relationships
        console.log('=== SHOP-OWNER RELATIONSHIPS ===');
        const shops = await Shop.find({}).populate('owner', 'fullName email role');
        shops.forEach(shop => {
            console.log(`Shop: ${shop.name} -> Owner: ${shop.owner?.fullName || shop.owner?.email || 'No owner'} (${shop.owner?.role || 'Unknown'})`);
        });
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkOrderStructure();