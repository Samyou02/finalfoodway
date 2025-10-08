import mongoose from 'mongoose';
import Order from './models/order.model.js';
import User from './models/user.model.js';
import Shop from './models/shop.model.js';
import Item from './models/item.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function assignDeliveryBoy() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');
        
        // Get delivery boys
        const deliveryBoys = await User.find({ role: 'deliveryBoy' });
        console.log(`Found ${deliveryBoys.length} delivery boys:`);
        deliveryBoys.forEach(boy => {
            console.log(`- ${boy.fullName || boy.email} (${boy._id})`);
        });
        
        if (deliveryBoys.length === 0) {
            console.log('No delivery boys found!');
            return;
        }
        
        // Get orders that don't have delivery boys assigned
        const orders = await Order.find({});
        console.log(`\\nFound ${orders.length} orders to check`);
        
        let assignmentCount = 0;
        
        for (const order of orders) {
            let needsUpdate = false;
            
            console.log(`\\nChecking order ${order._id}:`);
            
            for (let i = 0; i < order.shopOrders.length; i++) {
                const shopOrder = order.shopOrders[i];
                
                if (!shopOrder.assignedDeliveryBoy) {
                    // Assign the first delivery boy for testing
                    const deliveryBoy = deliveryBoys[assignmentCount % deliveryBoys.length];
                    console.log(`  Assigning delivery boy: ${deliveryBoy.fullName || deliveryBoy.email}`);
                    
                    order.shopOrders[i].assignedDeliveryBoy = deliveryBoy._id;
                    order.shopOrders[i].status = 'out of delivery';
                    needsUpdate = true;
                    assignmentCount++;
                } else {
                    console.log(`  Already has delivery boy assigned`);
                }
            }
            
            if (needsUpdate) {
                await order.save();
                console.log(`  ✅ Order ${order._id} updated with delivery assignment`);
            }
        }
        
        console.log('\\n=== VERIFICATION ===');
        // Verify the assignments
        const updatedOrders = await Order.find({})
            .populate('user', 'fullName email role')
            .populate('shopOrders.shop', 'name')
            .populate('shopOrders.owner', 'fullName email role')
            .populate('shopOrders.assignedDeliveryBoy', 'fullName email role');
        
        updatedOrders.forEach((order, index) => {
            console.log(`Order ${index + 1}:`);
            console.log(`  Customer: ${order.user?.fullName || order.user?.email || 'Unknown'}`);
            order.shopOrders.forEach((shopOrder, shopIndex) => {
                console.log(`    Shop Order ${shopIndex + 1}: ${shopOrder.shop?.name || 'Unknown'}`);
                console.log(`      Owner: ${shopOrder.owner?.fullName || 'Unknown'}`);
                console.log(`      Delivery Boy: ${shopOrder.assignedDeliveryBoy?.fullName || 'None'}`);
                console.log(`      Status: ${shopOrder.status || 'No status'}`);
            });
        });
        
        await mongoose.disconnect();
        console.log('\\n✅ Delivery boy assignment completed!');
    } catch (error) {
        console.error('Error:', error);
    }
}

assignDeliveryBoy();