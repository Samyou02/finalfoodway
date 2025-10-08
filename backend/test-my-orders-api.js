import mongoose from 'mongoose';
import Order from './models/order.model.js';
import User from './models/user.model.js';
import Shop from './models/shop.model.js';
import Item from './models/item.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function testMyOrdersAPI() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');
        
        // Get all users
        const users = await User.find({}, 'fullName email role');
        console.log('=== TESTING MY ORDERS API FOR EACH USER ===\n');
        
        for (const user of users) {
            console.log(`Testing for ${user.role}: ${user.fullName || user.email}`);
            console.log(`User ID: ${user._id}`);
            
            // Simulate the getMyOrders logic for each user role
            if (user.role === "user") {
                const orders = await Order.find({ user: user._id })
                    .sort({ createdAt: -1 })
                    .populate("shopOrders.shop", "name")
                    .populate("shopOrders.owner", "fullName email mobile")
                    .populate("shopOrders.shopOrderItems.item", "name image price");
                
                console.log(`Found ${orders.length} orders for user`);
                orders.forEach((order, index) => {
                    console.log(`  Order ${index + 1}: ₹${order.totalAmount}, Payment: ${order.payment}`);
                });
                
            } else if (user.role === "owner") {
                const orders = await Order.find({ "shopOrders.owner": user._id })
                    .sort({ createdAt: -1 })
                    .populate("shopOrders.shop", "name")
                    .populate("user", "fullName email mobile")
                    .populate("shopOrders.shopOrderItems.item", "name image price")
                    .populate("shopOrders.assignedDeliveryBoy", "fullName mobile");
                
                const filteredOrders = orders.map((order) => {
                    const ownerShopOrder = order.shopOrders.find(o => o.owner && o.owner._id.toString() === user._id.toString());
                    if (!ownerShopOrder) return null;
                    
                    return {
                        _id: order._id,
                        paymentMethod: order.paymentMethod,
                        user: order.user,
                        shopOrders: ownerShopOrder,
                        createdAt: order.createdAt,
                        deliveryAddress: order.deliveryAddress,
                        payment: order.payment
                    };
                }).filter(order => order !== null);
                
                console.log(`Found ${filteredOrders.length} orders for owner`);
                filteredOrders.forEach((order, index) => {
                    console.log(`  Order ${index + 1}: ₹${order.shopOrders.subtotal}, Payment: ${order.payment}`);
                });
                
            } else if (user.role === "deliveryBoy") {
                const orders = await Order.find({ "shopOrders.assignedDeliveryBoy": user._id })
                    .sort({ createdAt: -1 })
                    .populate("shopOrders.shop", "name")
                    .populate("user", "fullName email mobile")
                    .populate("shopOrders.owner", "fullName email mobile")
                    .populate("shopOrders.shopOrderItems.item", "name image price")
                    .populate("shopOrders.assignedDeliveryBoy", "fullName mobile");
                
                const filteredOrders = orders.map((order) => {
                    const deliveryBoyShopOrder = order.shopOrders.find(o => 
                        o.assignedDeliveryBoy && o.assignedDeliveryBoy._id.toString() === user._id.toString()
                    );
                    if (!deliveryBoyShopOrder) return null;
                    
                    return {
                        _id: order._id,
                        paymentMethod: order.paymentMethod,
                        user: order.user,
                        shopOrders: deliveryBoyShopOrder,
                        createdAt: order.createdAt,
                        deliveryAddress: order.deliveryAddress,
                        payment: order.payment,
                        deliveryOtp: deliveryBoyShopOrder.deliveryOtp,
                        otpExpires: deliveryBoyShopOrder.otpExpires
                    };
                }).filter(order => order !== null);
                
                console.log(`Found ${filteredOrders.length} orders for delivery boy`);
                filteredOrders.forEach((order, index) => {
                    console.log(`  Order ${index + 1}: ₹${order.shopOrders.subtotal}, Payment: ${order.payment}`);
                });
            }
            
            console.log('---\n');
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

testMyOrdersAPI();