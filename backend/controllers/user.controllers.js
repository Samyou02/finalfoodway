import User from "../models/user.model.js"
import DeliveryAssignment from "../models/deliveryAssignment.model.js"

export const getCurrentUser=async (req,res) => {
    try {
        const userId=req.userId
        if(!userId){
            return res.status(400).json({message:"userId is not found"})
        }
        const user=await User.findById(userId)
        if(!user){
               return res.status(400).json({message:"user is not found"})
        }
        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).json({message:`get current user error ${error}`})
    }
}

export const updateUserLocation=async (req,res) => {
    try {
        const {lat,lon}=req.body
        const user=await User.findByIdAndUpdate(req.userId,{
            location:{
                type:'Point',
                coordinates:[lon,lat]
            }
        },{new:true})
         if(!user){
               return res.status(400).json({message:"user is not found"})
        }
        
        return res.status(200).json({message:'location updated'})
    } catch (error) {
           return res.status(500).json({message:`update location user error ${error}`})
    }
}

export const updateActiveStatus = async (req, res) => {
    try {
        const { isActive } = req.body
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ message: "isActive must be a boolean" })
        }

        const user = await User.findByIdAndUpdate(req.userId, { isActive }, { new: true })
        if (!user) {
            return res.status(404).json({ message: "user is not found" })
        }

        // If activating a delivery boy, emit pending broadcasted assignments
        if (user.role === 'deliveryBoy' && isActive) {
            // If the user is already busy, do not send new assignments
            const busy = await DeliveryAssignment.findOne({
                assignedTo: user._id,
                status: { $nin: ["brodcasted", "completed"] }
            })

            if (!busy) {
                const assignments = await DeliveryAssignment.find({
                    status: 'brodcasted',
                    brodcastedTo: { $nin: [user._id] }
                }).populate('order').populate('shop')

                const io = req.app.get('io')
                for (const a of assignments) {
                    a.brodcastedTo.push(user._id)
                    await a.save()
                    if (io && user.socketId) {
                        const items = a.order.shopOrders.find(so => so._id.equals(a.shopOrderId))?.shopOrderItems || []
                        const subtotal = a.order.shopOrders.find(so => so._id.equals(a.shopOrderId))?.subtotal
                        io.to(user.socketId).emit('newAssignment', {
                            sentTo: user._id,
                            assignmentId: a._id,
                            orderId: a.order._id,
                            shopName: a.shop.name,
                            deliveryAddress: a.order.deliveryAddress,
                            items,
                            subtotal
                        })
                    }
                }
            }
        }

        return res.status(200).json({ message: 'Active status updated', user })
    } catch (error) {
        return res.status(500).json({ message: `update active status error ${error}` })
    }
}

