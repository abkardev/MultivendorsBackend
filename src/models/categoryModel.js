import mongoose from "mongoose";
import slugify from "slugify";

const categorySchema = new mongoose.Schema({
    name: {
        en: { type: String, required: true },
        ar: String
    },
    description: String,
    slug: { type: String, unique: true },
    subCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory"
    }
}, {timestamps: true});

categorySchema.pre("save", async function (next) {
    if (this.isModified("name.en") || !this.slug) {
        this.slug = slugify(this.name.en.toLowerCase());
    }
    next();
});

categorySchema.index({ subCategory: 1 });
categorySchema.index({ createdAt: -1 });

export const Category = mongoose.model("Category", categorySchema);
