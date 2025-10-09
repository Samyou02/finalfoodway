import mongoose from "mongoose";

// Counter schema for sequential order IDs
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

// Function to get next sequence number
const getNextSequence = async (name) => {
    const counter = await Counter.findByIdAndUpdate(
        name,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
};

const shopOrderItemSchema = new mongoose.Schema({
    item:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required:true
    },
    name:String,
    price:Number,
    quantity:Number
}, { timestamps: true })

const shopOrderSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop"
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    subtotal: Number,
    shopOrderItems: [shopOrderItemSchema],
    status:{
        type:String,
        enum:["pending","confirmed","rejected","preparing","out of delivery","delivered","cancelled"],
        default:"pending"
    },
  receipt: {
    receiptNumber: { type: String, default: null },
    generatedAt: { type: Date, default: null },
    items: [{ name: String, price: Number, quantity: Number }],
    subtotal: { type: Number, default: null }
  },
  assignment:{
     type: mongoose.Schema.Types.ObjectId,
    ref: "DeliveryAssignment",
    default:null
  },
  assignedDeliveryBoy:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
deliveryOtp:{
        type:String,
        default:null
    },
otpExpires:{
        type:Date,
        default:null
    },
lastOtpGeneratedAt:{
        type:Date,
        default:null
    },
deliveredAt:{
    type:Date,
    default:null
}

}, { timestamps: true })

const orderSchema = new mongoose.Schema({
    orderId: {
        type: Number,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    paymentMethod: {
        type: String,
        enum: ['cod', "online"],
        required: true
    },
    deliveryAddress: {
        text: String,
        latitude: Number,
        longitude: Number
    },
    orderType: {
        type: String,
        enum: ['delivery', 'pickup'],
        default: 'delivery'
    },
    totalAmount: {
        type: Number
    }
    ,
    shopOrders: [shopOrderSchema],
    payment:{
        type:Boolean,
        default:false
    },
    razorpayOrderId:{
        type:String,
        default:""
    },
   razorpayPaymentId:{
    type:String,
       default:""
   },
   isCancelled: {
       type: Boolean,
       default: false
   },
   cancellationReason: {
       type: String,
       default: null
   },
   cancelledAt: {
       type: Date,
       default: null
   },
   specialInstructions: {
       type: String,
       default: null
   }
}, { timestamps: true })

// Pre-save middleware to generate sequential order ID
orderSchema.pre('save', async function(next) {
    if (this.isNew && !this.orderId) {
        this.orderId = await getNextSequence('orderId');
    }
    next();
});

const Order=mongoose.model("Order",orderSchema)
export default Order