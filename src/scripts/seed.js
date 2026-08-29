import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Product } from '../models/productModel.js';
import { Category } from '../models/categoryModel.js';
import { Brand } from '../models/brandModel.js';
import { SubCategory } from '../models/subCategoryModel.js';


dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/multivendormanus';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Vendor.deleteMany({}),
      Product.deleteMany({}),
      Category.deleteMany({}),
      Brand.deleteMany({}),
      SubCategory.deleteMany({}),
    ]);
    console.log('Cleared existing data.');

    // 1. Create Users matching frontend mock data
    const users = await User.create([
      { name: 'Admin User', email: 'admin@test.com', password: '123456', role: 'admin' },
      { name: 'TechPro Electronics', email: 'vendor@test.com', password: '123456', role: 'vendor' },
      { name: 'Global Textiles', email: 'textiles@test.com', password: '123456', role: 'vendor' },
      { name: 'Fresh Foods Co', email: 'food@test.com', password: '123456', role: 'vendor' },
      { name: 'Ahmed Mohamed', email: 'buyer@test.com', password: '123456', role: 'user' },
      { name: 'Sara Ali', email: 'sara@test.com', password: '123456', role: 'user' },
    ]);
    console.log('Users created.');

    // 2. Create Brands
    const brands = await Brand.create([
      { name: 'TechGiant', description: 'Leading tech brand' },
      { name: 'EcoFriendly', description: 'Sustainable products' },
      { name: 'UrbanStyle', description: 'Modern fashion brand' },
      { name: 'HomeComfort', description: 'Quality home products' },
    ]);
    console.log('Brands created.');

    // 3. Create Categories & Subcategories matching frontend mock data
    const categories = await Category.create([
      { name: { en: 'Electronics', ar: 'إلكترونيات' }, slug: 'electronics', description: 'Gadgets and devices' },
      { name: { en: 'Textiles', ar: 'نسيج' }, slug: 'textiles', description: 'Fabrics and materials' },
      { name: { en: 'Machinery', ar: 'آلات' }, slug: 'machinery', description: 'Industrial equipment' },
      { name: { en: 'Food & Beverage', ar: 'أغذية ومشروبات' }, slug: 'food-beverage', description: 'Food products' },
      { name: { en: 'Chemicals', ar: 'كيماويات' }, slug: 'chemicals', description: 'Chemical products' },
      { name: { en: 'Construction', ar: 'بناء' }, slug: 'construction', description: 'Building materials' },
    ]);

    const subCategories = await SubCategory.create([
      { name: 'Smartphones', description: 'Mobile devices' },
      { name: 'Laptops', description: 'Portable computers' },
      { name: 'Cotton Fabrics', description: 'Cotton materials' },
      { name: 'Dairy Products', description: 'Milk and dairy' },
      { name: 'Cement & Steel', description: 'Construction materials' },
    ]);
    console.log('Categories and Subcategories created.');

    // 4. Create Vendors matching frontend mock data
    const vendors = await Vendor.create([
      {
        user: users[1]._id,
        storeName: { en: 'TechPro Electronics', ar: 'تيك برو للإلكترونيات' },
        slug: 'techpro-electronics',
        storeImage: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop',
        storeDescription: { en: 'TechPro Electronics is a leading supplier of high-quality electronics.', ar: 'تيك برو للإلكترونيات هي مورد رائد للإلكترونيات عالية الجودة.' },
        subscription: { plan: 'pro', startDate: new Date(), endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), isActive: true },
      },
      {
        user: users[2]._id,
        storeName: { en: 'Global Textiles', ar: 'النسيج العالمي' },
        slug: 'global-textiles',
        storeImage: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=300&h=200&fit=crop',
        storeDescription: { en: 'Premium textile supplier with 12 years of experience.', ar: 'مورد نسيج متميز مع 12 عامًا من الخبرة.' },
        subscription: { plan: 'growth', startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), isActive: true },
      },
      {
        user: users[3]._id,
        storeName: { en: 'Fresh Foods Co', ar: 'شركة الأطعمة الطازجة' },
        slug: 'fresh-foods',
        storeImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&h=200&fit=crop',
        storeDescription: { en: 'Quality fresh food supplier.', ar: 'مورد أغذية طازجة عالي الجودة.' },
        subscription: { plan: 'starter', startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), isActive: true },
      },
    ]);
    console.log('Vendors created.');

    // 5. Create Products matching frontend mock data
    const productData = [
      {
        name: { en: 'Business Laptop Pro', ar: 'لابتوب الأعمال برو' },
        description: { en: 'High-performance business laptop for professionals.', ar: 'لابتوب أعمال عالي الأداء للمحترفين.' },
        vendor: vendors[0]._id,
        category: categories[0]._id,
        subCategory: subCategories[1]._id,
        brand: brands[0]._id,
        image: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400'],
        variations: [
          { color: 'Silver', size: '16GB RAM / 512GB SSD', quantity: 100, price: 800 },
          { color: 'Space Gray', size: '32GB RAM / 1TB SSD', quantity: 50, price: 1200 },
        ],
      },
      {
        name: { en: '27" 4K Monitor', ar: 'شاشة 27 بوصة 4K' },
        description: { en: 'Professional 4K UHD monitor for design and productivity.', ar: 'شاشة 4K احترافية للتصميم والإنتاجية.' },
        vendor: vendors[0]._id,
        category: categories[0]._id,
        subCategory: subCategories[1]._id,
        brand: brands[0]._id,
        image: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400'],
        variations: [
          { color: 'Black', size: '27 inch', quantity: 200, price: 350 },
          { color: 'Black', size: '32 inch', quantity: 100, price: 450 },
        ],
      },
      {
        name: { en: 'Premium Cotton Fabric', ar: 'قماش قطني فاخر' },
        description: { en: 'High-quality 100% cotton fabric for garment manufacturing.', ar: 'قماش قطني 100٪ عالي الجودة لتصنيع الملابس.' },
        vendor: vendors[1]._id,
        category: categories[1]._id,
        subCategory: subCategories[2]._id,
        brand: brands[1]._id,
        image: ['https://images.unsplash.com/photo-1589310240385-fc6e2f1e2f1c?w=400'],
        variations: [
          { color: 'White', size: '100m roll', quantity: 500, price: 5 },
          { color: 'Natural', size: '100m roll', quantity: 300, price: 6 },
        ],
      },
      {
        name: { en: 'Organic Fruit Box', ar: 'صندوق فواكه عضوية' },
        description: { en: 'Fresh organic fruits sourced directly from farms.', ar: 'فواكه عضوية طازجة من المزارع مباشرة.' },
        vendor: vendors[2]._id,
        category: categories[3]._id,
        subCategory: subCategories[3]._id,
        brand: brands[1]._id,
        image: ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'],
        variations: [
          { color: 'Mixed', size: '10kg box', quantity: 200, price: 25 },
          { color: 'Premium', size: '10kg box', quantity: 100, price: 40 },
        ],
      },
    ];

    await Product.create(productData);
    console.log('Products created.');

    console.log('Seeding completed successfully!');
    console.log('Demo accounts:');
    console.log('  buyer@test.com / 123456  — Buyer (Ahmed Mohamed)');
    console.log('  vendor@test.com / 123456 — Vendor (TechPro Electronics)');
    console.log('  textiles@test.com / 123456 — Vendor (Global Textiles)');
    console.log('  food@test.com / 123456 — Vendor (Fresh Foods Co)');
    console.log('  admin@test.com / 123456 — Admin');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();

