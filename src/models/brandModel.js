import mongoose from "mongoose";
import slugify from "slugify";

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    slug: {
        type: String,
        unique: true,
    },
    description: String,
    logo: String,
}, {timestamps: true});

brandSchema.pre("save", async function (next) {
    if (this.isModified("name") || !this.slug) {
        this.slug = slugify(this.name.toLowerCase());
    }
    next();
});

brandSchema.index({ createdAt: -1 });

export const Brand = mongoose.model("Brand", brandSchema);
