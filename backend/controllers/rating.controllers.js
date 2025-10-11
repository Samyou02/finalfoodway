import mongoose from "mongoose"
import Rating from "../models/rating.model.js"
import Order from "../models/order.model.js"
import Shop from "../models/shop.model.js"
import User from "../models/user.model.js"
import Item from "../models/item.model.js"

// Helper to update aggregate rating on target
const updateAggregate = async (type, targetId) => {
  // Ensure targetId type matches stored ObjectId in ratings collection
  const targetObjectId = typeof targetId === 'string' ? new mongoose.Types.ObjectId(targetId) : targetId
  const pipeline = [
    { $match: { type, target: targetObjectId } },
    { $group: { _id: "$target", avg: { $avg: "$stars" }, count: { $sum: 1 } } }
  ]
  const res = await Rating.aggregate(pipeline)
  const { avg = 0, count = 0 } = res[0] || {}
  if (type === "shop") {
    await Shop.findByIdAndUpdate(targetId, { $set: { "rating.average": avg, "rating.count": count } })
  } else if (type === "deliveryBoy") {
    await User.findByIdAndUpdate(targetId, { $set: { "rating.average": avg, "rating.count": count } })
  } else if (type === "item") {
    await Item.findByIdAndUpdate(targetId, { $set: { "rating.average": avg, "rating.count": count } })
  }
}

export const submitRating = async (req, res) => {
  try {
    const { orderId, shopOrderId, type, targetId, stars, comment } = req.body
    if (!orderId || !shopOrderId || !type || !targetId || !stars) {
      return res.status(400).json({ message: "Missing required fields" })
    }
    if (![1,2,3,4,5].includes(stars)) {
      return res.status(400).json({ message: "Stars must be between 1 and 5" })
    }
    if (!['shop', 'deliveryBoy', 'item'].includes(type)) {
      return res.status(400).json({ message: "Invalid rating type" })
    }

    const order = await Order.findById(orderId).populate("user")
    if (!order) return res.status(404).json({ message: "Order not found" })
    if (String(order.user._id) !== String(req.userId)) {
      return res.status(403).json({ message: "Only order customer can rate" })
    }
    const shopOrder = order.shopOrders.id(shopOrderId)
    if (!shopOrder) return res.status(404).json({ message: "Shop order not found" })
    if (shopOrder.status !== "delivered") {
      return res.status(400).json({ message: "You can rate only after delivery" })
    }

    // Validate target matches order
    if (type === 'shop') {
      if (String(shopOrder.shop) !== String(targetId)) {
        return res.status(400).json({ message: "Invalid shop target for this order" })
      }
    } else if (type === 'deliveryBoy') {
      if (!shopOrder.assignedDeliveryBoy || String(shopOrder.assignedDeliveryBoy) !== String(targetId)) {
        return res.status(400).json({ message: "Invalid delivery boy target for this order" })
      }
    } else if (type === 'item') {
      const hasItem = shopOrder.shopOrderItems.some(i => String(i.item) === String(targetId))
      if (!hasItem) {
        return res.status(400).json({ message: "Invalid item target for this order" })
      }
    }

    // Upsert rating (allow editing like Swiggy/Zomato)
    const rating = await Rating.findOneAndUpdate(
      { type, target: targetId, order: orderId, user: req.userId },
      { $set: { stars, comment, shopOrderId } },
      { new: true, upsert: true }
    )

    await updateAggregate(type, targetId)
    return res.status(200).json({ message: "Rating submitted", rating })
  } catch (error) {
    return res.status(500).json({ message: `submit rating error ${error}` })
  }
}

export const getMyDeliveryRatings = async (req, res) => {
  try {
    const deliveryBoyId = req.userId
    const ratings = await Rating.find({ type: 'deliveryBoy', target: deliveryBoyId }).sort({ createdAt: -1 })

    // Compute accurate aggregate directly from ratings to avoid any stale values
    const agg = await Rating.aggregate([
      { $match: { type: 'deliveryBoy', target: new mongoose.Types.ObjectId(deliveryBoyId) } },
      { $group: { _id: '$target', avg: { $avg: '$stars' }, count: { $sum: 1 } } }
    ])
    const summary = agg?.[0] ? { average: agg[0].avg || 0, count: agg[0].count || 0 } : { average: 0, count: 0 }

    return res.status(200).json({ summary, ratings })
  } catch (error) {
    return res.status(500).json({ message: `get delivery ratings error ${error}` })
  }
}

export const getMyShopRatings = async (req, res) => {
  try {
    const ownerId = req.userId
    const shops = await Shop.find({ owner: ownerId })
    const shopIds = shops.map(s => s._id)
    const ratings = await Rating.find({ type: 'shop', target: { $in: shopIds } }).sort({ createdAt: -1 })

    // Compute accurate aggregates directly from ratings to avoid stale values
    const agg = await Rating.aggregate([
      { $match: { type: 'shop', target: { $in: shopIds } } },
      { $group: { _id: "$target", avg: { $avg: "$stars" }, count: { $sum: 1 } } }
    ])
    const aggMap = new Map(agg.map(a => [String(a._id), { average: a.avg || 0, count: a.count || 0 }]))

    const summaries = shops.map(s => {
      const a = aggMap.get(String(s._id))
      return { shopId: s._id, name: s.name, rating: a || s.rating || { average: 0, count: 0 } }
    })
    return res.status(200).json({ summaries, ratings })
  } catch (error) {
    return res.status(500).json({ message: `get shop ratings error ${error}` })
  }
}

// Get the current user's ratings for a specific order (for UI persistence)
export const getUserOrderRatings = async (req, res) => {
  try {
    const { orderId } = req.params
    if (!orderId) return res.status(400).json({ message: "orderId is required" })
    const ratings = await Rating.find({ order: orderId, user: req.userId })
    // Map keys for UI persistence:
    // - shop/deliveryBoy: `${shopOrderId}-${type}`
    // - item: `${targetId}-item` (target is Item ID)
    const map = {}
    ratings.forEach(r => {
      if (r.type === 'item') {
        map[`${r.target}-item`] = r.stars
      } else {
        map[`${r.shopOrderId}-${r.type}`] = r.stars
      }
    })
    return res.status(200).json({ ratings, map })
  } catch (error) {
    return res.status(500).json({ message: `get user order ratings error ${error}` })
  }
}