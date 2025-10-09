import mongoose from "mongoose"

const ratingSchema = new mongoose.Schema({
  type: { type: String, enum: ["deliveryBoy", "shop", "item"], required: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  shopOrderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  stars: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: "" }
}, { timestamps: true })

// One rating per user per order per target
ratingSchema.index({ type: 1, target: 1, order: 1, user: 1 }, { unique: true })

const Rating = mongoose.model("Rating", ratingSchema)
export default Rating