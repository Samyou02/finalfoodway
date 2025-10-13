import DeliveryAssignment from "../models/deliveryAssignment.model.js"
import Order from "../models/order.model.js"
import Shop from "../models/shop.model.js"
import User from "../models/user.model.js"
import mongoose from "mongoose"
import { sendDeliveryOtpMail } from "../utils/mail.js"
import RazorPay from "razorpay"
import dotenv from "dotenv"
import { count } from "console"

dotenv.config()
let instance = null
const razorKeyId = process.env.RAZORPAY_KEY_ID
const razorKeySecret = process.env.RAZORPAY_KEY_SECRET
if (razorKeyId && razorKeySecret) {
    instance = new RazorPay({
        key_id: razorKeyId,
        key_secret: razorKeySecret,
    })
} else {
    console.warn("Razorpay keys missing. Online payments are disabled in this environment.")
}

export const placeOrder = async (req, res) => {
    try {
        const { cartItems, paymentMethod, deliveryAddress, totalAmount, orderType } = req.body
        if (cartItems.length == 0 || !cartItems) {
            return res.status(400).json({ message: "cart is empty" })
        }
        
        // Only require delivery address for delivery orders
        if (orderType === "delivery" && (!deliveryAddress || !deliveryAddress.text)) {
            return res.status(400).json({ message: "delivery address is required for delivery orders" })
        }

        // Check if user has delivery permission (only for delivery orders)
        if (orderType === "delivery") {
            const user = await User.findById(req.userId)
            
            // For existing users without deliveryAllowed field, allow delivery by default
            // For new users with user types, check their specific permission
            if (user.deliveryAllowed === false) {
                return res.status(403).json({ message: "Delivery not allowed for your user type. Please select pickup option." })
            }
        }

        const groupItemsByShop = {}

        cartItems.forEach(item => {
            const shopId = item.shop
            if (!groupItemsByShop[shopId]) {
                groupItemsByShop[shopId] = []
            }
            groupItemsByShop[shopId].push(item)
        });

        console.log("Cart items:", JSON.stringify(cartItems, null, 2))
        console.log("Grouped items by shop:", JSON.stringify(groupItemsByShop, null, 2))

        const shopOrders = await Promise.all(Object.keys(groupItemsByShop).map(async (shopId) => {
            console.log(`Looking for shop with ID: ${shopId}`)
            const shop = await Shop.findById(shopId).populate("owner")
            console.log(`Found shop:`, shop)
            if (!shop) {
                throw new Error(`Shop with ID ${shopId} not found`)
            }
            if (!shop.owner) {
                throw new Error(`Shop ${shopId} (${shop.name}) has no owner assigned. Please contact support.`)
            }
            const items = groupItemsByShop[shopId]
            const subtotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0)
            const round2 = (n) => Math.round(n * 100) / 100
            const ownerShare = round2(subtotal * 0.70)
            const deliveryBoyShare = round2(subtotal * 0.80)
            const superadminFee = round2(subtotal * 0.20)
            const paymentFee = round2(subtotal * 0.02)
            return {
                shop: shop._id,
                owner: shop.owner._id,
                status: "pending",
                subtotal,
                ownerShare,
                deliveryBoyShare,
                superadminFee,
                paymentFee,
                shopOrderItems: items.map((i) => ({
                    item: i.id,
                    price: i.price,
                    quantity: i.quantity,
                    name: i.name
                }))
            }
        }))

        if (paymentMethod == "online") {
            // If Razorpay is available, proceed with gateway order creation
            if (instance) {
                const razorOrder = await instance.orders.create({
                    amount: Math.round(totalAmount * 100),
                    currency: 'INR',
                    receipt: `receipt_${Date.now()}`
                })
                const round2 = (n) => Math.round(n * 100) / 100
                const newOrder = await Order.create({
                    user: req.userId,
                    paymentMethod,
                    deliveryAddress: orderType === "delivery" ? deliveryAddress : null,
                    orderType: orderType || "delivery",
                    totalAmount,
                    ownerShare: round2(totalAmount * 0.70),
                    deliveryBoyShare: round2(totalAmount * 0.80),
                    superadminFee: round2(totalAmount * 0.20),
                    paymentFee: round2(totalAmount * 0.02),
                    shopOrders,
                    razorpayOrderId: razorOrder.id,
                    payment: false
                })

                return res.status(200).json({
                    razorOrder,
                    orderId: newOrder._id,
                })
            }
            // Fallback: create order without Razorpay, mark payment pending
            const round2 = (n) => Math.round(n * 100) / 100
            const newOrder = await Order.create({
                user: req.userId,
                paymentMethod,
                deliveryAddress: orderType === "delivery" ? deliveryAddress : null,
                orderType: orderType || "delivery",
                totalAmount,
                ownerShare: round2(totalAmount * 0.70),
                deliveryBoyShare: round2(totalAmount * 0.80),
                superadminFee: round2(totalAmount * 0.20),
                paymentFee: round2(totalAmount * 0.02),
                shopOrders,
                payment: false
            })

            await newOrder.populate("shopOrders.shopOrderItems.item", "name image price")
            await newOrder.populate("shopOrders.shop", "name")
            await newOrder.populate("shopOrders.owner", "name socketId")
            await newOrder.populate("user", "name email mobile")

            const io = req.app.get('io')
            if (io) {
                newOrder.shopOrders.forEach(shopOrder => {
                    const ownerSocketId = shopOrder.owner.socketId
                    if (ownerSocketId) {
                        io.to(ownerSocketId).emit('newOrder', {
                            _id: newOrder._id,
                            paymentMethod: newOrder.paymentMethod,
                            user: newOrder.user,
                            shopOrders: shopOrder,
                            createdAt: newOrder.createdAt,
                            deliveryAddress: newOrder.deliveryAddress,
                            payment: newOrder.payment,
                            isCancelled: newOrder.isCancelled,
                            cancellationReason: newOrder.cancellationReason
                        })
                    }
                });
            }

            return res.status(201).json(newOrder)
        }

        const round2 = (n) => Math.round(n * 100) / 100
        const newOrder = await Order.create({
            user: req.userId,
            paymentMethod,
            deliveryAddress: orderType === "delivery" ? deliveryAddress : null,
            orderType: orderType || "delivery",
            totalAmount,
            ownerShare: round2(totalAmount * 0.70),
            deliveryBoyShare: round2(totalAmount * 0.80),
            superadminFee: round2(totalAmount * 0.20),
            paymentFee: round2(totalAmount * 0.02),
            shopOrders
        })

        await newOrder.populate("shopOrders.shopOrderItems.item", "name image price")
        await newOrder.populate("shopOrders.shop", "name")
        await newOrder.populate("shopOrders.owner", "name socketId")
        await newOrder.populate("user", "name email mobile")

        const io = req.app.get('io')

        if (io) {
            newOrder.shopOrders.forEach(shopOrder => {
                const ownerSocketId = shopOrder.owner.socketId
                if (ownerSocketId) {
                    io.to(ownerSocketId).emit('newOrder', {
                        _id: newOrder._id,
                        paymentMethod: newOrder.paymentMethod,
                        user: newOrder.user,
                        shopOrders: shopOrder,
                        createdAt: newOrder.createdAt,
                        deliveryAddress: newOrder.deliveryAddress,
                        payment: newOrder.payment,
                        isCancelled: newOrder.isCancelled,
                        cancellationReason: newOrder.cancellationReason
                    })
                }
            });
        }

        return res.status(201).json(newOrder)
    } catch (error) {
        console.error("Place order error:", error)
        return res.status(500).json({ message: `place order error: ${error.message}` })
    }
}

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, orderId } = req.body
        if (!instance) {
            return res.status(503).json({ message: "Online payments not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." })
        }
        const payment = await instance.payments.fetch(razorpay_payment_id)
        if (!payment || payment.status != "captured") {
            return res.status(400).json({ message: "payment not captured" })
        }
        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }

        order.payment = true
        order.razorpayPaymentId = razorpay_payment_id
        await order.save()

        await order.populate("shopOrders.shopOrderItems.item", "name image price")
        await order.populate("shopOrders.shop", "name")
        await order.populate("shopOrders.owner", "name socketId")
        await order.populate("user", "name email mobile")

        const io = req.app.get('io')

        if (io) {
            order.shopOrders.forEach(shopOrder => {
                const ownerSocketId = shopOrder.owner.socketId
                if (ownerSocketId) {
                    io.to(ownerSocketId).emit('newOrder', {
                        _id: order._id,
                        paymentMethod: order.paymentMethod,
                        user: order.user,
                        shopOrders: shopOrder,
                        createdAt: order.createdAt,
                        deliveryAddress: order.deliveryAddress,
                        payment: order.payment
                    })
                }
            });
        }
    } catch (error) {
        console.error('Error in deleteOrder:', error)
        res.status(500).json({ message: "Internal server error" })
    }
}

export const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params
        const { reason } = req.body
        
        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(404).json({ message: "Order not found" })
        }
        
        // Check if the order belongs to the user
        if (order.user.toString() !== req.userId.toString()) {
            return res.status(403).json({ message: "Unauthorized to cancel this order" })
        }
        
        // Check if order is already cancelled
        if (order.isCancelled) {
            return res.status(400).json({ message: "Order is already cancelled" })
        }
        
        // Check if order can be cancelled (only pending orders can be cancelled)
        const canCancel = order.shopOrders.some(shopOrder => shopOrder.status === 'pending')
        if (!canCancel) {
            return res.status(400).json({ message: "Order cannot be cancelled. It's already being prepared or delivered." })
        }
        
        // Update order cancellation status
        order.isCancelled = true
        order.cancellationReason = reason || 'No reason provided'
        
        // Update all shop orders status to cancelled
        order.shopOrders.forEach(shopOrder => {
            if (shopOrder.status === 'pending') {
                shopOrder.status = 'cancelled'
            }
        })
        
        await order.save()
        
        // Populate the order for response
        await order.populate("shopOrders.shop", "name")
        await order.populate("shopOrders.owner", "fullName email mobile")
        await order.populate("shopOrders.shopOrderItems.item", "name image price")
        
        return res.status(200).json({ 
            message: "Order cancelled successfully", 
            order 
        })
        
    } catch (error) {
        console.error("Cancel order error:", error)
        return res.status(500).json({ message: `Cancel order error: ${error.message}` })
    }
}

export const getMyOrders = async (req, res) => {
    try {
        console.log('getMyOrders called for user:', req.userId)
        const user = await User.findById(req.userId)
        if (!user) {
            console.log('User not found:', req.userId)
            return res.status(404).json({ message: "User not found" })
        }
        
        console.log('User found:', user.role, user.email)
        
        if (user.role == "user") {
            const orders = await Order.find({ user: req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("shopOrders.owner", "fullName email mobile")
                // Ensure delivery boy info is available to the user UI for ratings
                .populate("shopOrders.assignedDeliveryBoy", "fullName mobile")
                .populate("shopOrders.shopOrderItems.item", "name image price")

            return res.status(200).json(orders)
        } else if (user.role == "owner") {
            console.log('Fetching orders for owner:', req.userId)
            const orders = await Order.find({ "shopOrders.owner": req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("shopOrders.owner", "fullName email mobile")
                .populate("user", "fullName email mobile")
                .populate("shopOrders.shopOrderItems.item", "name image price")
                .populate("shopOrders.assignedDeliveryBoy", "fullName mobile")

            console.log('Raw orders found for owner:', orders.length)

            const filteredOrders = orders.map((order => {
                const ownerShopOrder = order.shopOrders.find(o => o.owner && o.owner._id.toString() === req.userId.toString())
                if (!ownerShopOrder) {
                    console.log('No matching shop order found for order:', order._id)
                    return null
                }
                
                console.log('Found matching shop order for order:', order._id, 'subtotal:', ownerShopOrder.subtotal)
                
                return {
                    _id: order._id,
                    paymentMethod: order.paymentMethod,
                    user: order.user,
                    shopOrders: ownerShopOrder,
                    createdAt: order.createdAt,
                    deliveryAddress: order.deliveryAddress,
                    payment: order.payment,
                    isCancelled: order.isCancelled,
                    cancellationReason: order.cancellationReason
                }
            })).filter(order => order !== null)

            console.log('Filtered orders for owner:', filteredOrders.length)
            return res.status(200).json(filteredOrders)
        } else if (user.role == "deliveryBoy") {
            const orders = await Order.find({ "shopOrders.assignedDeliveryBoy": req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("user", "fullName email mobile")
                .populate("shopOrders.owner", "fullName email mobile")
                .populate("shopOrders.shopOrderItems.item", "name image price")
                .populate("shopOrders.assignedDeliveryBoy", "fullName mobile")

            const filteredOrders = orders.map((order => {
                const deliveryBoyShopOrder = order.shopOrders.find(o => 
                    o.assignedDeliveryBoy && o.assignedDeliveryBoy._id.toString() === req.userId.toString()
                )
                if (!deliveryBoyShopOrder) return null
                
                return {
                    _id: order._id,
                    paymentMethod: order.paymentMethod,
                    user: order.user,
                    shopOrders: deliveryBoyShopOrder,
                    createdAt: order.createdAt,
                    deliveryAddress: order.deliveryAddress,
                    payment: order.payment,
                    isCancelled: order.isCancelled,
                    cancellationReason: order.cancellationReason
                }
            })).filter(order => order !== null)

            return res.status(200).json(filteredOrders)
        } else if (user.role == "superadmin") {
            // Superadmin can see all orders
            const orders = await Order.find({})
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("shopOrders.owner", "fullName email mobile")
                .populate("user", "fullName email mobile")
                .populate("shopOrders.shopOrderItems.item", "name image price")
                .populate("shopOrders.assignedDeliveryBoy", "fullName mobile")

            return res.status(200).json(orders)
        }

        return res.status(400).json({ message: "Invalid user role" })

    } catch (error) {
        console.error("Get my orders error:", error)
        return res.status(500).json({ message: `get User order error ${error}` })
    }
}


export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, shopId } = req.params
        const { status } = req.body
        const order = await Order.findById(orderId)

        const shopOrder = order.shopOrders.find(o => o.shop == shopId)
        if (!shopOrder) {
            return res.status(400).json({ message: "shop order not found" })
        }
        const prevStatus = shopOrder.status
        // Disallow changing status once it is out of delivery, rejected, delivered, or cancelled
        const lockedStatuses = ["out of delivery", "rejected", "delivered", "cancelled"]
        if (prevStatus && lockedStatuses.includes(prevStatus) && status !== prevStatus) {
            return res.status(400).json({ message: `Status change not allowed from '${prevStatus}' to '${status}'` })
        }

        // For pickup orders, do not allow transitioning to 'out of delivery'
        if (status === 'out of delivery' && order.orderType === 'pickup') {
            return res.status(400).json({ message: 'Pickup orders do not go out for delivery' })
        }

        shopOrder.status = status

        // Ensure sequential orderId is generated when status changes to key states
        const triggerStatuses = ["confirmed", "preparing", "out of delivery"]
        if (!order.orderId && triggerStatuses.includes(status)) {
            try {
                // Use the Counter model registered in mongoose to generate next sequence
                const Counter = mongoose.model('Counter')
                const counter = await Counter.findByIdAndUpdate(
                    'orderId',
                    { $inc: { seq: 1 } },
                    { new: true, upsert: true }
                )
                order.orderId = counter.seq
            } catch (e) {
                // Fall back to a time-based ID if counter generation fails
                order.orderId = Number(String(Date.now()).slice(-9))
            }
        }

        // Generate a receipt when status becomes confirmed, preparing, or out of delivery
        if (["confirmed", "preparing", "out of delivery"].includes(status)) {
            // Avoid regenerating if already present
            if (!shopOrder.receipt || !shopOrder.receipt.receiptNumber) {
            const receiptNumber = `R-${order.orderId || 'NA'}-${String(shopOrder._id).slice(-6)}`
            shopOrder.receipt = {
                receiptNumber,
                generatedAt: new Date(),
                items: (shopOrder.shopOrderItems || []).map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
                subtotal: shopOrder.subtotal || 0
            }
            }
        }
        
        let deliveryBoysPayload = []
        // Only create assignments for DELIVERY orders
        if (status == "out of delivery" && order.orderType === 'delivery' && !shopOrder.assignment) {
            // Get all delivery boys regardless of location
            const allDeliveryBoys = await User.find({
                role: "deliveryBoy"
            })

            // Broadcast to all active delivery boys, even if they already have assignments
            const availableBoys = allDeliveryBoys.filter(b => b.isActive === true)
            const candidates = availableBoys.map(b => b._id)

            // Always create a delivery assignment even if there are no available
            // delivery boys at the moment. This allows newly active delivery
            // boys to be appended and notified later when they come online.
            const deliveryAssignment = await DeliveryAssignment.create({
                order: order?._id,
                shop: shopOrder.shop,
                shopOrderId: shopOrder?._id,
                brodcastedTo: candidates,
                status: "brodcasted"
            })

            shopOrder.assignedDeliveryBoy = deliveryAssignment.assignedTo
            shopOrder.assignment = deliveryAssignment._id
            deliveryBoysPayload = availableBoys.map(b => ({
                id: b._id,
                fullName: b.fullName,
                mobile: b.mobile
            }))

            await deliveryAssignment.populate('order')
            await deliveryAssignment.populate('shop')
            const io = req.app.get('io')
            if (io && candidates.length > 0) {
                availableBoys.forEach(boy => {
                    const boySocketId = boy.socketId
                    if (boySocketId) {
                        // Extract receipt number for this shop order (if generated on confirmation)
                        const so = deliveryAssignment.order.shopOrders.find(so => so._id.equals(deliveryAssignment.shopOrderId))
                        const receiptNumber = so?.receipt?.receiptNumber || null
                        io.to(boySocketId).emit('newAssignment', {
                            sentTo:boy._id,
                            assignmentId: deliveryAssignment._id,
                            orderId: deliveryAssignment.order._id,
                            shopName: deliveryAssignment.shop.name,
                            deliveryAddress: deliveryAssignment.order.deliveryAddress,
                            items: so?.shopOrderItems || [],
                            subtotal: so?.subtotal,
                            receiptNumber
                        })
                    }
                });
            }





        }


        // Auto-generate OTP only for DELIVERY orders going out for delivery
        if (status === "out of delivery" && order.orderType === 'delivery') {
            const now = Date.now()
            if (!shopOrder.deliveryOtp || !shopOrder.otpExpires || shopOrder.otpExpires <= now) {
                const otp = Math.floor(1000 + Math.random() * 9000).toString()
                shopOrder.deliveryOtp = otp
                shopOrder.otpExpires = Date.now() + 2 * 60 * 60 * 1000 // 2 hours
                shopOrder.lastOtpGeneratedAt = new Date()
                // Populate user to get email for sending OTP
                await order.populate("user", "fullName email socketId")
                // Send OTP mail (safe and non-throwing)
                try {
                    await sendDeliveryOtpMail(order.user, otp)
                } catch (e) {
                    // sendDeliveryOtpMail already swallows errors, this is a safeguard
                    console.error(`[MAILER] delivery OTP mail failed: ${e?.message || e}`)
                }
            }
        }

        // When owner marks a PICKUP order as delivered, set deliveredAt and clear any stale assignment
        if (status === 'delivered' && order.orderType === 'pickup') {
            shopOrder.deliveredAt = new Date()
            shopOrder.assignedDeliveryBoy = null
            shopOrder.assignment = null
        }

        await order.save()
        const updatedShopOrder = order.shopOrders.find(o => o.shop == shopId)
        await order.populate("shopOrders.shop", "name")
        await order.populate("shopOrders.assignedDeliveryBoy", "fullName email mobile")
        await order.populate("user", "socketId")

        const io = req.app.get('io')
        if (io) {
            const userSocketId = order.user.socketId
            if (userSocketId) {
                io.to(userSocketId).emit('update-status', {
                    orderId: order._id,
                    shopId: updatedShopOrder.shop._id,
                    status: updatedShopOrder.status,
                    userId: order.user._id,
                    // Include OTP info when available so the UI can show it automatically
                    deliveryOtp: updatedShopOrder.deliveryOtp || null,
                    otpExpires: updatedShopOrder.otpExpires || null
                })
            }
        }



        return res.status(200).json({
            shopOrder: updatedShopOrder,
            assignedDeliveryBoy: updatedShopOrder?.assignedDeliveryBoy,
            availableBoys: deliveryBoysPayload,
            assignment: updatedShopOrder?.assignment?._id

        })



    } catch (error) {
        return res.status(500).json({ message: `order status error ${error}` })
    }
}


export const getDeliveryBoyAssignment = async (req, res) => {
    try {
        const deliveryBoyId = req.userId
        const assignments = await DeliveryAssignment.find({
            brodcastedTo: deliveryBoyId,
            status: "brodcasted"
        })
            .populate("order")
            .populate("shop")

        const formated = assignments.map(a => ({
            assignmentId: a._id,
            orderId: a.order._id,
            shopName: a.shop.name,
            deliveryAddress: a.order.deliveryAddress,
            items: a.order.shopOrders.find(so => so._id.equals(a.shopOrderId)).shopOrderItems || [],
            subtotal: a.order.shopOrders.find(so => so._id.equals(a.shopOrderId))?.subtotal,
            receiptNumber: a.order.shopOrders.find(so => so._id.equals(a.shopOrderId))?.receipt?.receiptNumber || null
        }))

        return res.status(200).json(formated)
    } catch (error) {
        return res.status(500).json({ message: `get Assignment error ${error}` })
    }
}


export const acceptOrder = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const assignment = await DeliveryAssignment.findById(assignmentId)
        if (!assignment) {
            return res.status(400).json({ message: "assignment not found" })
        }
        if (assignment.status !== "brodcasted") {
            return res.status(400).json({ message: "assignment is expired" })
        }

        // Allow multiple concurrent assignments per delivery boy

        assignment.assignedTo = req.userId
        assignment.status = 'assigned'
        assignment.acceptedAt = new Date()
        await assignment.save()

        const order = await Order.findById(assignment.order)
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }

        let shopOrder = order.shopOrders.id(assignment.shopOrderId)
        shopOrder.assignedDeliveryBoy = req.userId

        // Do NOT generate OTP on acceptance; OTP will be generated by user later

        await order.save()

        // Remove notifications for other delivery boys and notify user (without OTP)
        const io = req.app.get('io')
        if (io) {
            // Get all delivery boys who were notified about this assignment
            const otherDeliveryBoys = await User.find({
                _id: { $in: assignment.brodcastedTo, $ne: req.userId },
                role: "deliveryBoy"
            })

            // Send notification to remove the assignment from their list
            otherDeliveryBoys.forEach(boy => {
                const boySocketId = boy.socketId
                if (boySocketId) {
                    io.to(boySocketId).emit('assignmentTaken', {
                        assignmentId: assignment._id,
                        takenBy: req.userId
                    })
                }
            })

            // Notify the user with updated status (OTP generated later by user)
            await order.populate("user", "socketId")
            const userSocketId = order.user?.socketId
            if (userSocketId) {
                io.to(userSocketId).emit('update-status', {
                    orderId: order._id,
                    shopId: shopOrder.shop,
                    status: shopOrder.status,
                    userId: order.user._id
                })
            }
        }

        return res.status(200).json({
            message: 'order accepted'
        })
    } catch (error) {
        return res.status(500).json({ message: `accept order error ${error}` })
    }
}



export const getCurrentOrder = async (req, res) => {
    try {
        const assignment = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: "assigned"
        })
            .populate("shop", "name")
            .populate("assignedTo", "fullName email mobile location")
            .populate({
                path: "order",
                populate: [{ path: "user", select: "fullName email location mobile" }]

            })

        if (!assignment) {
            // No current assignment is a normal state — return 204 No Content
            return res.status(204).send()
        }
        if (!assignment.order) {
            return res.status(400).json({ message: "order not found" })
        }

        const shopOrder = assignment.order.shopOrders.find(so => String(so._id) == String(assignment.shopOrderId))

        if (!shopOrder) {
            return res.status(400).json({ message: "shopOrder not found" })
        }

        let deliveryBoyLocation = { lat: null, lon: null }
        if (assignment.assignedTo.location.coordinates.length == 2) {
            deliveryBoyLocation.lat = assignment.assignedTo.location.coordinates[1]
            deliveryBoyLocation.lon = assignment.assignedTo.location.coordinates[0]
        }

        let customerLocation = { lat: null, lon: null }
        if (assignment.order.deliveryAddress) {
            customerLocation.lat = assignment.order.deliveryAddress.latitude
            customerLocation.lon = assignment.order.deliveryAddress.longitude
        }

        return res.status(200).json({
            _id: assignment.order._id,
            user: assignment.order.user,
            shopOrder,
            deliveryAddress: assignment.order.deliveryAddress,
            deliveryBoyLocation,
            customerLocation
        })


    } catch (error) {

    }
}

// Return all current assigned orders for the delivery boy
export const getCurrentOrders = async (req, res) => {
    try {
        const assignments = await DeliveryAssignment.find({
            assignedTo: req.userId,
            status: "assigned"
        })
            .populate("shop", "name")
            .populate("assignedTo", "fullName email mobile location")
            .populate({
                path: "order",
                populate: [{ path: "user", select: "fullName email location mobile" }]
            })

        if (!assignments || assignments.length === 0) {
            return res.status(200).json([])
        }

        const result = assignments.map(assignment => {
            if (!assignment.order) return null
            const shopOrder = assignment.order.shopOrders.find(so => String(so._id) === String(assignment.shopOrderId))
            if (!shopOrder) return null

            let deliveryBoyLocation = { lat: null, lon: null }
            if (assignment.assignedTo?.location?.coordinates?.length === 2) {
                deliveryBoyLocation.lat = assignment.assignedTo.location.coordinates[1]
                deliveryBoyLocation.lon = assignment.assignedTo.location.coordinates[0]
            }

            let customerLocation = { lat: null, lon: null }
            if (assignment.order.deliveryAddress) {
                customerLocation.lat = assignment.order.deliveryAddress.latitude
                customerLocation.lon = assignment.order.deliveryAddress.longitude
            }

            return {
                orderId: assignment.order._id,
                user: assignment.order.user,
                shopOrder,
                deliveryAddress: assignment.order.deliveryAddress,
                deliveryBoyLocation,
                customerLocation
            }
        }).filter(Boolean)

        return res.status(200).json(result)
    } catch (error) {
        return res.status(500).json({ message: `get current orders error ${error}` })
    }
}

export const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params
        const order = await Order.findById(orderId)
            .populate("user")
            .populate({
                path: "shopOrders.shop",
                model: "Shop"
            })
            .populate({
                path: "shopOrders.assignedDeliveryBoy",
                model: "User"
            })
            .populate({
                path: "shopOrders.shopOrderItems.item",
                model: "Item"
            })
            .lean()

        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }
        return res.status(200).json(order)
    } catch (error) {
        return res.status(500).json({ message: `get by id order error ${error}` })
    }
}

export const sendDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.body
        const order = await Order.findById(orderId).populate("user")
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!order || !shopOrder) {
            return res.status(400).json({ message: "enter valid order/shopOrderid" })
        }
        // Only the order's customer can generate or resend the OTP
        if (String(order.user._id) !== String(req.userId)) {
            return res.status(403).json({ message: "Only the customer can generate the delivery OTP" })
        }
        
        // Check if order is already delivered - no OTP needed
        if (shopOrder.status === "delivered") {
            return res.status(400).json({ message: "Order already delivered. No OTP required." })
        }
        
        // Check if valid OTP already exists (within 2 hours)
        const now = Date.now()
        if (shopOrder.deliveryOtp && shopOrder.otpExpires && shopOrder.otpExpires > now) {
            // Return existing OTP instead of generating new one
            await sendDeliveryOtpMail(order.user, shopOrder.deliveryOtp)
            return res.status(200).json({ 
                message: `Existing OTP resent to ${order?.user?.fullName}`,
                otp: shopOrder.deliveryOtp,
                isExisting: true
            })
        }
        
        // Generate new OTP only if no valid OTP exists
        const otp = Math.floor(1000 + Math.random() * 9000).toString()
        shopOrder.deliveryOtp = otp
        shopOrder.otpExpires = Date.now() + 2 * 60 * 60 * 1000 // 2 hours expiration
        shopOrder.lastOtpGeneratedAt = new Date()
        await order.save()
        await sendDeliveryOtpMail(order.user, otp)

        // Emit socket to update user's UI with OTP
        const io = req.app.get('io')
        if (io) {
            const userSocketId = order.user?.socketId
            if (userSocketId) {
                io.to(userSocketId).emit('update-status', {
                    orderId: order._id,
                    shopId: shopOrder.shop,
                    status: shopOrder.status,
                    userId: order.user._id,
                    deliveryOtp: shopOrder.deliveryOtp,
                    otpExpires: shopOrder.otpExpires
                })
            }
        }

        return res.status(200).json({ 
            message: `New OTP sent to ${order?.user?.fullName}`,
            otp: otp,
            isExisting: false
        })
    } catch (error) {
        return res.status(500).json({ message: `delivery otp error ${error}` })
    }
}

export const verifyDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId, otp } = req.body
        const order = await Order.findById(orderId).populate("user")
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!order || !shopOrder) {
            return res.status(400).json({ message: "enter valid order/shopOrderid" })
        }
        if (shopOrder.deliveryOtp !== otp || !shopOrder.otpExpires || shopOrder.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid/Expired Otp" })
        }

        shopOrder.status = "delivered"
        shopOrder.deliveredAt = Date.now()
        // Clear OTP fields since order is delivered
        shopOrder.deliveryOtp = null
        shopOrder.otpExpires = null
        shopOrder.lastOtpGeneratedAt = null
        await order.save()
        
        // Populate necessary fields for socket emission
        await order.populate("shopOrders.shop", "name owner")
        await order.populate("shopOrders.shop.owner", "socketId")
        await order.populate("user", "socketId")
        
        // Emit socket event to notify user and shop owner of status change
        const io = req.app.get('io')
        if (io) {
            // Notify the user
            const userSocketId = order.user.socketId
            if (userSocketId) {
                io.to(userSocketId).emit('update-status', {
                    orderId: order._id,
                    shopId: shopOrder.shop._id,
                    status: shopOrder.status,
                    userId: order.user._id
                })
            }
            
            // Notify the shop owner
            const shopOwnerSocketId = shopOrder.shop.owner?.socketId
            if (shopOwnerSocketId) {
                io.to(shopOwnerSocketId).emit('update-status', {
                    orderId: order._id,
                    shopId: shopOrder.shop._id,
                    status: shopOrder.status,
                    userId: shopOrder.shop.owner._id
                })
            }
        }
        
        await DeliveryAssignment.deleteOne({
            shopOrderId: shopOrder._id,
            order: order._id,
            assignedTo: shopOrder.assignedDeliveryBoy
        })

        return res.status(200).json({ message: "Order Delivered Successfully!" })

    } catch (error) {
        return res.status(500).json({ message: `verify delivery otp error ${error}` })
    }
}

export const getTodayDeliveries=async (req,res) => {
    try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const deliveries = await Order.find({
            "shopOrders.assignedDeliveryBoy": req.userId,
            "shopOrders.status": "delivered",
            createdAt: {
                $gte: today,
                $lt: tomorrow
            }
        }).populate("user", "fullName mobile")
        .populate("shopOrders.shop", "name")

        // Group deliveries by hour for chart data
        const hourlyData = {}
        for (let hour = 0; hour < 24; hour++) {
            hourlyData[hour] = 0
        }

        deliveries.forEach(order => {
            const hour = order.createdAt.getHours()
            hourlyData[hour]++
        })

        // Convert to chart format
        const chartData = Object.keys(hourlyData).map(hour => ({
            hour: parseInt(hour),
            count: hourlyData[hour]
        }))

        // Filter out hours with 0 deliveries for cleaner chart
        const filteredChartData = chartData.filter(data => data.count > 0)

        return res.status(200).json({
            totalDeliveries: deliveries.length,
            chartData: filteredChartData.length > 0 ? filteredChartData : [{ hour: new Date().getHours(), count: 0 }],
            deliveries: deliveries
        })
    } catch (error) {
        return res.status(500).json({ message: `get today deliveries error ${error}` })
    }
}

// Function to automatically regenerate OTPs every 2 hours for undelivered orders
export const deleteOrder = async (req, res) => {
    try {
        const { orderId } = req.params
        const userId = req.userId
        
        // Find the order
        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(404).json({ message: "Order not found" })
        }
        
        // Get user to check role
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        
        // Check permissions based on user role
        if (user.role === "user") {
            // Users can only delete their own orders
            if (order.user.toString() !== userId) {
                return res.status(403).json({ message: "You can only delete your own orders" })
            }
        } else if (user.role === "owner") {
            // Owners can only delete orders for their shops
            const hasOwnerShopOrder = order.shopOrders.some(shopOrder => 
                shopOrder.owner.toString() === userId
            )
            if (!hasOwnerShopOrder) {
                return res.status(403).json({ message: "You can only delete orders for your shops" })
            }
        } else if (user.role === "deliveryBoy") {
            // Delivery boys can only delete orders assigned to them
            const hasAssignedOrder = order.shopOrders.some(shopOrder => 
                shopOrder.assignedDeliveryBoy && shopOrder.assignedDeliveryBoy.toString() === userId
            )
            if (!hasAssignedOrder) {
                return res.status(403).json({ message: "You can only delete orders assigned to you" })
            }
        } else {
            return res.status(403).json({ message: "Invalid user role" })
        }
        
        // Delete related delivery assignments
        await DeliveryAssignment.deleteMany({ order: orderId })
        
        // Delete the order
        await Order.findByIdAndDelete(orderId)
        
        return res.status(200).json({ message: "Order deleted successfully" })
    } catch (error) {
        console.error("Delete order error:", error)
        return res.status(500).json({ message: `Delete order error: ${error}` })
    }
}

export const updateSpecialInstructions = async (req, res) => {
    try {
        const { orderId } = req.params
        const { specialInstructions } = req.body
        const userId = req.userId
        
        // Find the order
        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(404).json({ message: "Order not found" })
        }
        
        // Check if the user owns this order
        if (order.user.toString() !== userId) {
            return res.status(403).json({ message: "You can only update your own orders" })
        }
        
        // Check if order can be modified (only pending and preparing orders)
        const canModify = order.shopOrders.some(shopOrder => 
            shopOrder.status === "pending" || shopOrder.status === "preparing"
        )
        
        if (!canModify) {
            return res.status(400).json({ message: "Special instructions can only be updated for pending or preparing orders" })
        }
        
        // Update special instructions
        order.specialInstructions = specialInstructions
        await order.save()
        
        return res.status(200).json({ 
            message: "Special instructions updated successfully",
            specialInstructions: order.specialInstructions
        })
    } catch (error) {
        console.error("Update special instructions error:", error)
        return res.status(500).json({ message: `Update special instructions error: ${error.message}` })
    }
}

export const autoRegenerateOtps = async () => {
    try {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
        const now = Date.now()
        
        // Find orders with shop orders that need OTP regeneration
        const orders = await Order.find({
            "shopOrders.status": { $in: ["out of delivery"] },
            "shopOrders.deliveredAt": null,
            $or: [
                { "shopOrders.otpExpires": { $lte: now } }, // OTP has expired
                { "shopOrders.otpExpires": null } // No OTP exists
            ]
        }).populate("user")

        for (const order of orders) {
            for (const shopOrder of order.shopOrders) {
                // Only regenerate OTP if:
                // 1. Order is "out of delivery" 
                // 2. Order is NOT delivered
                // 3. Current OTP has expired or doesn't exist
                if (
                    shopOrder.status === "out of delivery" &&
                    !shopOrder.deliveredAt &&
                    shopOrder.status !== "delivered" &&
                    (!shopOrder.otpExpires || shopOrder.otpExpires <= now)
                ) {
                    // Generate new OTP only for undelivered orders
                    const otp = Math.floor(1000 + Math.random() * 9000).toString()
                    shopOrder.deliveryOtp = otp
                    shopOrder.otpExpires = Date.now() + 2 * 60 * 60 * 1000
                    shopOrder.lastOtpGeneratedAt = new Date()
                    
                    // Send OTP email
                    await sendDeliveryOtpMail(order.user, otp)
                    console.log(`Auto-regenerated OTP for undelivered order ${order._id}, shop order ${shopOrder._id}`)
                }
            }
            await order.save()
        }
    } catch (error) {
        console.error(`Auto OTP regeneration error: ${error}`)
    }
}



