import mongoose from "mongoose";
import slugify from "slugify";

const subcategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    slug: {
        type: String,
        unique: true
    },
}, {timestamps: true});

subcategorySchema.pre("save", async function (next) {
    if (this.isModified("name") || !this.slug) {
        this.slug = slugify(this.name.toLowerCase());
    }
    next();
});

subcategorySchema.index({ createdAt: -1 });

export const SubCategory = mongoose.model("SubCategory", subcategorySchema);
