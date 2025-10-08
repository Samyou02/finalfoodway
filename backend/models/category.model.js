import mongoose from "mongoose";

// Counter schema for sequential category IDs
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('CategoryCounter', counterSchema);

// Function to get next sequence number
const getNextSequence = async (name) => {
    const counter = await Counter.findByIdAndUpdate(
        name,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
};

const categorySchema = new mongoose.Schema({
    categoryId: {
        type: Number,
        unique: true
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ""
    },
    image: {
        type: String,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Pre-save middleware to generate sequential category ID
categorySchema.pre('save', async function(next) {
    if (this.isNew && !this.categoryId) {
        this.categoryId = await getNextSequence('categoryId');
    }
    next();
});

const Category = mongoose.model("Category", categorySchema);
export default Category;