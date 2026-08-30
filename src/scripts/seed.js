import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Product } from '../models/productModel.js';
import { Category } from '../models/categoryModel.js';
import { SubCategory } from '../models/subCategoryModel.js';
import { Brand } from '../models/brandModel.js';
import EscrowOrder from '../models/Order.js';
import Payment from '../models/Payment.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { Order } from '../models/orderModel.js';
import Review from '../models/reviewModel.js';

dotenv.config();

const hasArg = (flag) => process.argv.includes(flag);
const RESET_REQUESTED = hasArg('--reset');
const FORCE = hasArg('--force');

if (RESET_REQUESTED) {
  if (!FORCE) {
    console.error('RESET REFUSED: use `npm run seed -- --reset --force` to confirm a full reset.');
    console.error('(Data for the seeded demo only will be removed; no unrelated documents are touched.)');
    process.exit(1);
  }
  if (String(process.env.NODE_ENV).toLowerCase() === 'production') {
    console.error('RESET BLOCKED: resets are forbidden when NODE_ENV=production.');
    console.error('Run locally with NODE_ENV=development (or unset) before resetting the demo data.');
    process.exit(1);
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/multivendormanus';
const DEMO_PASSWORD = 'Demo@1234';

// Statuses that mean the funds have been locked/held by the escrow flow.
const PAID_STATUSES = new Set(['in_escrow', 'shipped', 'delivered', 'completed', 'disputed', 'refunded']);
const HOLD_STATUSES = new Set(['in_escrow', 'shipped', 'delivered', 'completed', 'disputed', 'refunded']);
const RELEASE_STATUSES = new Set(['completed']);
const REFUND_STATUSES = new Set(['refunded']);

// ─── Fixed, deterministic input data (idempotency keys, no randomness) ──────

const USERS = [
  { key: 'admin', email: 'admin@manus.sa', name: 'Mohammed Al-Fahad', role: 'admin', companyName: 'Manus Supply Platform', isVerified: true },
  { key: 'vendor1', email: 'vendor1@manus.sa', name: 'Abdullah Al-Qahtani', role: 'vendor', companyName: 'Saudi Industrial Supplies Co.', isVerified: true },
  { key: 'vendor2', email: 'vendor2@manus.sa', name: 'Faisal Al-Harbi', role: 'vendor', companyName: 'Riyadh Electronics Trading', isVerified: true },
  { key: 'vendor3', email: 'vendor3@manus.sa', name: 'Noura Al-Zahrani', role: 'vendor', companyName: 'Jeddah Textile Wholesale', isVerified: true },
  { key: 'buyer1', email: 'buyer1@manus.sa', name: 'Khalid Al-Dossari', role: 'user', companyName: 'Al-Dossari Contracting', isVerified: true },
  { key: 'buyer2', email: 'buyer2@manus.sa', name: 'Sara Al-Otaibi', role: 'user', companyName: 'Nujood Retail Group', isVerified: true },
  { key: 'buyer3', email: 'buyer3@manus.sa', name: 'Omar Al-Shammari', role: 'user', companyName: 'Desert Logistics Co.', isVerified: true },
  { key: 'buyer4', email: 'buyer4@manus.sa', name: 'Laila Al-Anazi', role: 'user', companyName: 'Al-Anazi Trading Est.', isVerified: true },
];

const VENDORS = [
  {
    key: 'vendor1', slug: 'saudi-industrial-supplies',
    storeName: { en: 'Saudi Industrial Supplies', ar: 'الإمدادات الصناعية السعودية' },
    storeDescription: { en: 'Heavy machinery, industrial equipment and construction materials for the Gulf market.', ar: 'آلات ثقيلة ومعدات صناعية ومواد بناء لسوق الخليج.' },
    subscription: { plan: 'pro', startDate: '2026-01-01', endDate: '2027-01-01', isActive: true },
  },
  {
    key: 'vendor2', slug: 'riyadh-electronics-trading',
    storeName: { en: 'Riyadh Electronics Trading', ar: 'تجارة الرياض للإلكترونيات' },
    storeDescription: { en: 'Wholesale electronics, IT hardware and professional display solutions.', ar: 'إلكترونيات الجملة وأجهزة تقنية المعلومات وحلول العرض الاحترافية.' },
    subscription: { plan: 'growth', startDate: '2026-02-01', endDate: '2026-08-01', isActive: true },
  },
  {
    key: 'vendor3', slug: 'jeddah-textile-wholesale',
    storeName: { en: 'Jeddah Textile Wholesale', ar: 'جدة للنسيج بالجملة' },
    storeDescription: { en: 'Premium fabrics, garment materials and agro-food bulk supplies from the Kingdom.', ar: 'أقمشة فاخرة ومواد ملابس ومستلزمات غذائية بالجملة من المملكة.' },
    subscription: { plan: 'starter', startDate: '2026-03-01', endDate: '2026-06-01', isActive: true },
  },
];

const CATEGORIES = [
  { key: 'electronics', slug: 'electronics', name: { en: 'Electronics', ar: 'الإلكترونيات' }, description: 'IT hardware, displays and consumer electronics in bulk.' },
  { key: 'textiles', slug: 'textiles', name: { en: 'Textiles', ar: 'المنسوجات' }, description: 'Fabrics, yarns and garment manufacturing materials.' },
  { key: 'machinery', slug: 'machinery', name: { en: 'Machinery', ar: 'الآلات والمعدات' }, description: 'Industrial machines and heavy equipment.' },
  { key: 'food-beverage', slug: 'food-beverage', name: { en: 'Food & Beverage', ar: 'الأغذية والمشروبات' }, description: 'Bulk food and beverage supplies.' },
  { key: 'chemicals', slug: 'chemicals', name: { en: 'Chemicals', ar: 'المواد الكيميائية' }, description: 'Industrial chemicals and raw materials.' },
  { key: 'construction', slug: 'construction', name: { en: 'Construction', ar: 'البناء والتشييد' }, description: 'Construction materials and structural components.' },
];

const SUBCATEGORIES = [
  { key: 'smartphones', slug: 'smartphones', name: 'Smartphones' },
  { key: 'computers', slug: 'laptops-computers', name: 'Laptops & Computers' },
  { key: 'machinery', slug: 'industrial-machinery', name: 'Industrial Machinery' },
  { key: 'fabrics', slug: 'fabrics-textiles', name: 'Fabrics & Textiles' },
  { key: 'building', slug: 'building-materials', name: 'Building Materials' },
];

const BRANDS = [
  { key: 'ruyantech', slug: 'ruyantech', name: 'RuyanTech', description: 'Wholesale electronics hardware' },
  { key: 'gulfforge', slug: 'gulfforge', name: 'GulfForge', description: 'Industrial machinery and tools' },
  { key: 'najdweave', slug: 'najdweave', name: 'NajdWeave', description: 'Premium fabrics and textiles' },
  { key: 'desertharvest', slug: 'desertharvest', name: 'DesertHarvest', description: 'Agro-food bulk supplier' },
];

const PRODUCTS = [
  {
    key: 'cnc-lathe', slug: 'cnc-lathe-heavy-duty', vendor: 'vendor1', category: 'machinery', subCategory: 'machinery', brand: 'gulfforge',
    name: { en: 'CNC Lathe Machine - Heavy Duty', ar: 'مخرطة CNC تحكم رقمي - خدمة شاقة' },
    description: { en: 'Heavy-duty CNC lathe for precision metal manufacturing with 3-axis control.', ar: 'مخرطة CNC للخدمة الشاقة لتصنيع المعادن بدقة مع تحكم ثلاثي المحاور.' },
    moq: 1, leadTimeMin: 45, leadTimeMax: 90, incoterms: 'FOB', countryOfOrigin: 'Germany', paymentTerms: ['100% Advance', 'Letter of Credit (L/C)'],
    variations: [{ sku: 'VL-LT-100', barcode: '620100001', price: 85000, stock: 4, weight: 4200, attributes: [{ name: 'Swing Diameter', value: '400mm' }, { name: 'Power', value: '15kW' }] }],
  },
  {
    key: 'air-compressor', slug: 'industrial-air-compressor-75kw', vendor: 'vendor1', category: 'machinery', subCategory: 'machinery', brand: 'gulfforge',
    name: { en: 'Industrial Air Compressor 75kW', ar: 'ضاغط هواء صناعي 75 كيلو واط' },
    description: { en: 'Screw-type industrial air compressor for continuous high-volume production.', ar: 'ضاغط هواء صناعي لولبي للاستخدام المتواصل في الإنتاج العالي.' },
    moq: 1, leadTimeMin: 30, leadTimeMax: 45, incoterms: 'CIF', countryOfOrigin: 'Italy', paymentTerms: ['50/50'],
    variations: [{ sku: 'VL-AC-75', barcode: '620100002', price: 24500, stock: 12, weight: 580, attributes: [{ name: 'Capacity', value: '12 m3/min' }, { name: 'Pressure', value: '10 bar' }] }],
  },
  {
    key: 'steel-beams', slug: 'galvanized-structural-steel-beams', vendor: 'vendor1', category: 'construction', subCategory: 'building',
    name: { en: 'Galvanized Structural Steel Beams', ar: 'عوارض فولاذية إنشائية مجلفنة' },
    description: { en: 'Hot-dip galvanized steel beams for construction and infrastructure.', ar: 'عوارض فولاذية مجلفنة بالغمس الساخن للبناء والبنى التحتية.' },
    moq: 5, leadTimeMin: 15, leadTimeMax: 30, incoterms: 'DAP', countryOfOrigin: 'Saudi Arabia', paymentTerms: ['Net 30'],
    variations: [{ sku: 'VL-ST-400', barcode: '620100003', price: 3200, stock: 3000, weight: 1000, attributes: [{ name: 'Grade', value: 'A572 Gr.50' }, { name: 'Length', value: '12m' }] }],
  },
  {
    key: 'sodium-hydroxide', slug: 'industrial-sodium-hydroxide-25kg', vendor: 'vendor1', category: 'chemicals',
    name: { en: 'Sodium Hydroxide Flakes 25kg', ar: 'هيدروكسيد الصوديوم (صودا كاوية) 25 كجم' },
    description: { en: 'Industrial grade caustic soda flakes in 25kg bags.', ar: 'صودا كاوية صناعية على شكل رقائق في أكياس 25 كجم.' },
    moq: 10, leadTimeMin: 7, leadTimeMax: 14, incoterms: 'EXW', countryOfOrigin: 'Saudi Arabia', paymentTerms: ['100% Advance'],
    variations: [{ sku: 'VL-CH-25', barcode: '620100004', price: 140, stock: 5000, weight: 25, attributes: [{ name: 'Purity', value: '99%' }, { name: 'Packaging', value: '25kg bag' }] }],
  },
  {
    key: 'led-monitor', slug: 'industrial-led-monitor-27', vendor: 'vendor2', category: 'electronics', subCategory: 'computers', brand: 'ruyantech',
    name: { en: 'Industrial LED Monitor 27"', ar: 'شاشة إل إي دي صناعية 27 بوصة' },
    description: { en: '27-inch 4K UHD LED monitor for control rooms and office fleets.', ar: 'شاشة 27 بوصة بدقة 4K لألواح التحكم وأسطول المكاتب.' },
    moq: 5, leadTimeMin: 7, leadTimeMax: 15, incoterms: 'EXW', countryOfOrigin: 'China', paymentTerms: ['50/50'],
    variations: [{ sku: 'RE-MN-27', barcode: '620200001', price: 1750, stock: 240, weight: 6.5, attributes: [{ name: 'Screen Size', value: '27 inch' }, { name: 'Resolution', value: '4K UHD' }] }],
  },
  {
    key: 'business-laptop', slug: 'business-laptop-pro-i7', vendor: 'vendor2', category: 'electronics', subCategory: 'computers', brand: 'ruyantech',
    name: { en: 'Business Laptop Pro - Core i7', ar: 'لابتوب أعمال احترافي - Core i7' },
    description: { en: 'High-performance business laptop for enterprise procurement.', ar: 'لابتوب أعمال عالي الأداء للشراء المؤسسي.' },
    moq: 3, leadTimeMin: 10, leadTimeMax: 20, incoterms: 'EXW', countryOfOrigin: 'China', paymentTerms: ['50/50', 'Net 30'],
    variations: [
      { sku: 'RE-LP-16', barcode: '620200002', price: 4500, stock: 90, weight: 1.8, attributes: [{ name: 'RAM', value: '16GB' }, { name: 'Storage', value: '512GB SSD' }] },
      { sku: 'RE-LP-32', barcode: '620200003', price: 5600, stock: 40, weight: 1.8, attributes: [{ name: 'RAM', value: '32GB' }, { name: 'Storage', value: '1TB SSD' }] },
    ],
  },
  {
    key: 'smartphone-bulk', slug: 'smartphone-bulk-pack', vendor: 'vendor2', category: 'electronics', subCategory: 'smartphones', brand: 'ruyantech',
    name: { en: 'Smartphone Bulk Pack (10 units)', ar: 'حزمة هواتف ذكية بالجملة (10 قطع)' },
    description: { en: 'Bulk case of 10 unlocked smartphones for retail chains.', ar: 'علبة بالجملة من 10 هواتف ذكية غير مقفلة لسلاسل التجزئة.' },
    moq: 1, leadTimeMin: 5, leadTimeMax: 12, incoterms: 'EXW', countryOfOrigin: 'South Korea', paymentTerms: ['100% Advance'],
    variations: [{ sku: 'RE-SM-10', barcode: '620200004', price: 11500, stock: 15, weight: 3.2, attributes: [{ name: 'Units', value: '10' }, { name: 'Storage', value: '256GB' }] }],
  },
  {
    key: 'network-switch', slug: 'managed-network-switch-48', vendor: 'vendor2', category: 'electronics', subCategory: 'computers', brand: 'ruyantech',
    name: { en: 'Managed Network Switch 48-Port', ar: 'مبدّل شبكة مُدار 48 منفذًا' },
    description: { en: '48-port gigabit managed switch for enterprise LAN deployments.', ar: 'مبدّل جيجابت مُدار 48 منفذًا لشبكات المؤسسات.' },
    moq: 2, leadTimeMin: 7, leadTimeMax: 14, incoterms: 'EXW', countryOfOrigin: 'China', paymentTerms: ['Net 60'],
    variations: [{ sku: 'RE-SW-48', barcode: '620200005', price: 2200, stock: 60, weight: 4.1, attributes: [{ name: 'Ports', value: '48xGigabit' }, { name: 'Management', value: 'L3' }] }],
  },
  {
    key: 'cotton-fabric', slug: 'premium-cotton-fabric-100', vendor: 'vendor3', category: 'textiles', subCategory: 'fabrics', brand: 'najdweave',
    name: { en: 'Premium Cotton Fabric 100%', ar: 'قماش قطني فاخر 100٪' },
    description: { en: 'High-quality 100% cotton fabric rolls for garment manufacturing.', ar: 'لفافات قماش قطني 100٪ عالية الجودة لتصنيع الملابس.' },
    moq: 100, leadTimeMin: 10, leadTimeMax: 25, incoterms: 'FOB', countryOfOrigin: 'India', paymentTerms: ['100% Advance', 'CAD'],
    variations: [
      { sku: 'JW-CT-W', barcode: '620300001', price: 18, stock: 8000, weight: 22, attributes: [{ name: 'Color', value: 'White' }, { name: 'Length', value: '100m roll' }] },
      { sku: 'JW-CT-N', barcode: '620300002', price: 20, stock: 6000, weight: 22, attributes: [{ name: 'Color', value: 'Natural' }, { name: 'Length', value: '100m roll' }] },
    ],
  },
  {
    key: 'wool-blend', slug: 'wool-blend-fabric-rolls', vendor: 'vendor3', category: 'textiles', subCategory: 'fabrics', brand: 'najdweave',
    name: { en: 'Wool Blend Fabric Rolls', ar: 'لفافات نسيج مزيج الصوف' },
    description: { en: 'Warm wool-polyester blend fabric rolls for uniform manufacturing.', ar: 'لفافات نسيج من مزيج الصوف والبوليستر لتصنيع الزي الرسمي.' },
    moq: 50, leadTimeMin: 12, leadTimeMax: 28, incoterms: 'FOB', countryOfOrigin: 'Saudi Arabia', paymentTerms: ['50/50'],
    variations: [{ sku: 'JW-WB-70', barcode: '620300003', price: 32, stock: 3200, weight: 18, attributes: [{ name: 'Blend', value: '70% Wool' }, { name: 'Length', value: '50m roll' }] }],
  },
  {
    key: 'dates-bulk', slug: 'premium-ksa-dates-bulk', vendor: 'vendor3', category: 'food-beverage', brand: 'desertharvest',
    name: { en: 'Premium KSA Dates - Bulk (Sukkari)', ar: 'تمور سكري فاخرة - بالجملة' },
    description: { en: 'Premium Sukkari dates from Al-Qassim in bulk cartons.', ar: 'تمور سكري فاخرة من القصيم في كراتين بالجملة.' },
    moq: 20, leadTimeMin: 5, leadTimeMax: 10, incoterms: 'DAP', countryOfOrigin: 'Saudi Arabia', paymentTerms: ['100% Advance'],
    variations: [{ sku: 'JW-DT-SK', barcode: '620300004', price: 65, stock: 12000, weight: 5, attributes: [{ name: 'Grade', value: 'Premium' }, { name: 'Packaging', value: '5kg carton' }] }],
  },
];

// ─── Orders (statuses cover the whole EscrowOrder enum) ─────────────────────
// item quantities/unitPrices are taken from PRODUCTS variations above.

const IMAGES = {
  'cnc-lathe': 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=400&q=80',
  'air-compressor': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&q=80',
  'steel-beams': 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=400&q=80',
  'sodium-hydroxide': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd1a?w=400&q=80',
  'led-monitor': 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&q=80',
  'business-laptop': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80',
  'smartphone-bulk': 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80',
  'network-switch': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80',
  'cotton-fabric': 'https://images.unsplash.com/photo-1589310240385-fc6e2f1e2f1c?w=400&q=80',
  'wool-blend': 'https://images.unsplash.com/photo-1598301257982-0cf014dabbcd?w=400&q=80',
  'dates-bulk': 'https://images.unsplash.com/photo-1527719327859-c6ce80353573?w=400&q=80',
};

const ORDERS = [
  {
    orderNumber: 'SEED-ORD-01', buyer: 'buyer1', vendor: 'vendor2', currency: 'SAR', status: 'pending',
    items: [{ product: 'led-monitor', quantity: 5 }],
  },
  {
    orderNumber: 'SEED-ORD-02', buyer: 'buyer2', vendor: 'vendor3', currency: 'SAR', status: 'awaiting_payment',
    items: [{ product: 'cotton-fabric', variation: 0, quantity: 200 }],
  },
  {
    orderNumber: 'SEED-ORD-03', buyer: 'buyer1', vendor: 'vendor1', currency: 'SAR', status: 'in_escrow',
    items: [{ product: 'air-compressor', quantity: 1 }],
    autoReleaseInDays: 7,
  },
  {
    orderNumber: 'SEED-ORD-04', buyer: 'buyer3', vendor: 'vendor2', currency: 'USD', status: 'shipped',
    items: [{ product: 'network-switch', quantity: 4 }],
    autoReleaseInDays: 5,
    carrier: 'ARAMEX', trackingNumber: 'SEED-TRK-1004', estimatedDeliveryInDays: 6,
  },
  {
    orderNumber: 'SEED-ORD-05', buyer: 'buyer4', vendor: 'vendor3', currency: 'SAR', status: 'delivered',
    items: [{ product: 'wool-blend', quantity: 80 }],
    autoReleaseInDays: 1, delivered: true,
    carrier: 'SMSA', trackingNumber: 'SEED-TRK-1005',
  },
  {
    orderNumber: 'SEED-ORD-06', buyer: 'buyer2', vendor: 'vendor1', currency: 'SAR', status: 'completed',
    items: [{ product: 'steel-beams', quantity: 40 }],
    delivered: true, releaseEscrow: true,
    carrier: 'DHL', trackingNumber: 'SEED-TRK-1006',
  },
  {
    orderNumber: 'SEED-ORD-07', buyer: 'buyer3', vendor: 'vendor3', currency: 'SAR', status: 'disputed',
    items: [{ product: 'dates-bulk', quantity: 30 }],
    autoReleaseInDays: 3, dispute: true,
  },
  {
    orderNumber: 'SEED-ORD-08', buyer: 'buyer4', vendor: 'vendor2', currency: 'USD', status: 'refunded',
    items: [{ product: 'business-laptop', variation: 1, quantity: 2 }],
    refunded: true,
  },
];

// Legacy orders exist ONLY so Reviews can reference the old `Order` model as the schema requires.
const LEGACY_ORDERS = [
  { buyer: 'buyer1', vendor: 'vendor1', product: 'cnc-lathe', quantity: 1, unitPrice: 85000 },
  { buyer: 'buyer2', vendor: 'vendor3', product: 'dates-bulk', quantity: 25, unitPrice: 65 },
];

const REVIEWS = [
  { buyer: 'buyer1', vendor: 'vendor1', product: 'cnc-lathe', rating: 5, title: 'Reliable supplier', comment: 'Great machine quality and on-time documentation.', recommendation: 'yes' },
  { buyer: 'buyer2', vendor: 'vendor3', product: 'dates-bulk', rating: 4, title: 'Good bulk pricing', comment: 'Fresh dates, packaging could be improved.', recommendation: 'yes' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const upsertBy = (Model, filter, data) =>
  Model.findOneAndUpdate(filter, data, { upsert: true, new: true, setDefaultsOnInsert: true }).exec();

const now = () => new Date();
const inDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

// ─── Main ───────────────────────────────────────────────────────────────────

const seed = async () => {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected to MongoDB (${MONGODB_URI.split('@').pop().split('/')[0]}).`);

  if (RESET_REQUESTED) {
    console.log('\n================================');
    console.log('RESET MODE  (--reset --force)');
    console.log('================================');
    const io = { user: new Set(), vendor: new Set(), category: new Set(), sub: new Set(), brand: new Set(), order: new Set(), legacyOrder: new Set() };

    (await User.find({ email: /@manus\.sa$/i })).forEach((u) => io.user.add(u._id));
    (await Vendor.find({ slug: { $in: VENDORS.map((v) => v.slug) } })).forEach((v) => io.vendor.add(v._id));
    (await Category.find({ slug: { $in: CATEGORIES.map((c) => c.slug) } })).forEach((c) => io.category.add(c._id));
    (await SubCategory.find({ name: { $in: SUBCATEGORIES.map((s) => s.name) } })).forEach((s) => io.sub.add(s._id));
    (await Brand.find({ slug: { $in: BRANDS.map((b) => b.slug) } })).forEach((b) => io.brand.add(b._id));

    const orderFilter = { orderNumber: { $in: ORDERS.map((o) => o.orderNumber) } };
    (await EscrowOrder.find(orderFilter)).forEach((o) => io.order.add(o._id));

    const userFilter = { buyer: { $in: [...io.user] } };
    const userKeyFilter = { user: { $in: [...io.user] } };
    const legacyFilter = { user: { $in: [...io.user] } };

    const d = () => ({
      users: User.deleteMany({ _id: { $in: [...io.user] } }),
      vendors: Vendor.deleteMany({ _id: { $in: [...io.vendor] } }),
      categories: Category.deleteMany({ _id: { $in: [...io.category] } }),
      subcategories: SubCategory.deleteMany({ _id: { $in: [...io.sub] } }),
      brands: Brand.deleteMany({ _id: { $in: [...io.brand] } }),
      products: Product.deleteMany({ vendor: { $in: [...io.vendor] } }),
      escrowOrders: EscrowOrder.deleteMany({ _id: { $in: [...io.order] } }),
      payments: Payment.deleteMany(userFilter),
      wallets: Wallet.deleteMany({ user: { $in: [...io.user] } }),
      transactions: Transaction.deleteMany(userKeyFilter),
      legacyOrders: Order.deleteMany(legacyFilter),
      reviews: Review.deleteMany(legacyFilter),
    });

    const ops = d();
    const results = await Promise.all(Object.entries(ops).map(async ([name, p]) => [name, (await p).deletedCount]));
    console.log('Removed seeded demo documents:');
    results.forEach(([name, count]) => console.log(`  - ${name}: ${count}`));
    console.log('');
  }

  // 1) Users
  // NOTE: created via findOne + save() (NOT findOneAndUpdate) so the model's
  // pre-save hook runs and bcrypt-hashes the password — findOneAndUpdate skips it.
  const userDocs = {};
  for (const u of USERS) {
    const user = (await User.findOne({ email: u.email }).select('+password').exec()) || new User();
    const isNew = user.isNew;
    const needsHash = !user.password || !String(user.password).startsWith('$2');
    user.name = u.name;
    user.email = u.email;
    user.role = u.role;
    user.companyName = u.companyName;
    user.companyNameAr = u.companyName;
    user.isActive = true;
    user.acceptedTerms = true;
    user.isVerified = u.isVerified;
    user.firstName = u.name.split(' ')[0];
    user.lastName = u.name.split(' ').slice(-1)[0];
    user.phone = '+966500000001';
    user.address = { country: 'Saudi Arabia', city: 'Riyadh', state: 'Riyadh', zip: '11564', street: 'King Fahd Road' };
    if (isNew || needsHash) {
      user.password = DEMO_PASSWORD;
      user.markModified('password');
    }
    await user.save();
    userDocs[u.key] = user;
  }
  console.log('Users: upserted 8 accounts.');

  // 2) Brands
  const brandDocs = {};
  for (const b of BRANDS) {
    brandDocs[b.key] = await upsertBy(Brand, { slug: b.slug }, { name: b.name, slug: b.slug, description: b.description });
  }
  console.log('Brands: upserted 4.');

  // 3) Categories / SubCategories
  const categoryDocs = {};
  for (const c of CATEGORIES) {
    categoryDocs[c.key] = await upsertBy(Category, { slug: c.slug }, { name: c.name, slug: c.slug, description: c.description });
  }
  const subCategoryDocs = {};
  for (const s of SUBCATEGORIES) {
    subCategoryDocs[s.key] = await upsertBy(SubCategory, { slug: s.slug }, { name: s.name, slug: s.slug, description: s.name });
  }
  console.log('Categories: upserted 6. SubCategories: upserted 5.');

  // 4) Vendors
  const vendorDocs = {};
  for (const v of VENDORS) {
    vendorDocs[v.key] = await upsertBy(Vendor, { slug: v.slug }, {
      user: userDocs[v.key]._id,
      storeName: v.storeName,
      slug: v.slug,
      storeDescription: v.storeDescription,
      industry: v.key === 'vendor2' ? 'Electronics' : v.key === 'vendor3' ? 'Textiles' : 'Machinery',
      isActive: true,
      isVerified: true,
      verificationStatus: 'approved',
      whatsapp: { phone: '+966500000001', notifications: { orders: true, shipping: true, messages: true, rfq: true } },
      subscription: {
        plan: v.subscription.plan,
        startDate: now(),
        endDate: inDays(v.subscription.endDate ? 180 : 365),
        isActive: true,
      },
    });
  }
  console.log('Vendors: upserted 3.');

  // 5) Products
  const productDocs = {};
  for (const p of PRODUCTS) {
    const raw = { ...p };
    raw.vendor = vendorDocs[p.vendor]._id;
    raw.category = categoryDocs[p.category]?._id;
    raw.subCategory = subCategoryDocs[p.subCategory]?._id;
    raw.brand = brandDocs[p.brand]?._id;
    raw.image = [IMAGES[p.key]];
    raw.acceptedCurrencies = p.countryOfOrigin === 'Saudi Arabia' ? ['SAR', 'USD'] : ['USD'];
    raw.packaging = { type: 'box', unit: 'unit' };
    productDocs[p.key] = await upsertBy(Product, { slug: p.slug }, raw);
  }
  console.log('Products: upserted 11.');

  // 6) Escrow Orders + Payments + Wallets + Transactions
  const orderDocs = {};
  const payments = [];
  const events = []; // { walletUser, currency, order, type, amount } ledger-plan

  for (const o of ORDERS) {
    const items = o.items.map((it) => {
      const product = productDocs[it.product];
      const variation = product.variations[it.variation || 0];
      const unitPrice = variation.price;
      const totalPrice = unitPrice * it.quantity;
      return {
        product: product._id,
        name: product.name,
        quantity: it.quantity,
        unitPrice,
        totalPrice,
      };
    });
    const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);

    const data = {
      orderNumber: o.orderNumber,
      buyer: userDocs[o.buyer]._id,
      vendor: vendorDocs[o.vendor]._id,
      items,
      totalAmount,
      currency: o.currency,
      status: o.status,
      timeline: [{ event: o.status, timestamp: now(), description: `Seed order ${o.orderNumber}` }],
    };

    if (o.autoReleaseInDays !== undefined) data.autoReleaseDate = inDays(o.autoReleaseInDays);
    if (o.carrier) {
      data.shippingDetails = {
        carrier: o.carrier,
        trackingNumber: o.trackingNumber,
        shippedAt: now(),
        estimatedDelivery: o.estimatedDeliveryInDays ? inDays(o.estimatedDeliveryInDays) : undefined,
      };
    }
    if (o.delivered) {
      data.shippingDetails = { ...(data.shippingDetails || {}), deliveredAt: now() };
      data.deliveryConfirmedAt = now();
    }
    if (o.releaseEscrow) {
      data.escrowReleasedAt = now();
      data.shipmentStatus = 'delivery_confirmed';
    } else if (o.status === 'shipped') {
      data.shipmentStatus = 'shipped';
    } else if (o.status === 'delivered' || o.status === 'completed') {
      data.shipmentStatus = o.status === 'delivered' ? 'delivered' : 'delivery_confirmed';
    }
    if (o.dispute) data.deliveryIssue = { reported: true, reason: 'quality', description: 'Defective units received.', reportedAt: now() };
    if (o.refunded) data.notes = 'Refunded after dispute resolution.';

    orderDocs[o.orderNumber] = await upsertBy(EscrowOrder, { orderNumber: o.orderNumber }, data);

    // Payments — mirror the exact in-app pattern (escrowController.createPayment stores the
    // EscrowOrder _id in Payment.order).
    if (PAID_STATUSES.has(o.status)) {
      const payment = await upsertBy(
        Payment,
        { order: orderDocs[o.orderNumber]._id, buyer: userDocs[o.buyer]._id },
        {
          order: orderDocs[o.orderNumber]._id,
          buyer: userDocs[o.buyer]._id,
          amount: totalAmount,
          currency: o.currency,
          method: 'credit_card',
          status: o.status === 'refunded' ? 'refunded' : 'completed',
          gatewayRef: `sim_seed_${o.orderNumber.toLowerCase()}`,
        }
      );
      payments.push({ payment, orderNumber: o.orderNumber, amount: totalAmount, currency: o.currency });

      if (o.status !== 'pending' && o.status !== 'awaiting_payment') {
        events.push({ walletUser: vendorDocs[o.vendor].user, currency: o.currency, order: orderDocs[o.orderNumber], type: 'escrow_hold', amount: totalAmount });
        if (RELEASE_STATUSES.has(o.status)) {
          events.push({ walletUser: vendorDocs[o.vendor].user, currency: o.currency, order: orderDocs[o.orderNumber], type: 'escrow_release', amount: totalAmount });
        }
        if (REFUND_STATUSES.has(o.status)) {
          events.push({ walletUser: vendorDocs[o.vendor].user, currency: o.currency, order: orderDocs[o.orderNumber], type: 'refund', amount: -totalAmount });
        }
      }
    }

    // Attach paymentId to paid orders (as the app does).
    if (payments.length) {
      const pay = payments.find((p) => p.orderNumber === o.orderNumber);
      if (pay) {
        await EscrowOrder.updateOne({ _id: orderDocs[o.orderNumber]._id }, { paymentId: pay.payment._id, paymentMethod: 'credit_card' });
      }
    }
    console.log(`  Order ${o.orderNumber}: status=${o.status} currency=${o.currency} total=${totalAmount.toLocaleString()} items=${items.length}`);
  }
  console.log(`EscrowOrders: upserted ${ORDERS.length}.`);

  // Wallets + Transactions (single-currency wallet per vendor user; balances derived from the ledger plan)
  const walletDocs = {};
  const byVendor = {};
  for (const e of events) {
    if (!byVendor[String(e.walletUser)]) byVendor[String(e.walletUser)] = { currency: e.currency, events: [] };
    byVendor[String(e.walletUser)].events.push(e);
  }

  for (const [userKey, ctx] of Object.entries(byVendor)) {
    // Settle final wallet balances first (hold adds pending, release moves to available, refund deducts).
    const final = { pending: 0, available: 0 };
    for (const e of ctx.events) {
      if (e.type === 'escrow_hold') final.pending += e.amount;
      else if (e.type === 'escrow_release') { final.pending -= e.amount; final.available += e.amount; }
      else if (e.type === 'refund') final.pending += e.amount; // negative amount
    }
    const wallet = await upsertBy(
      Wallet,
      { user: userKey },
      { user: userKey, currency: ctx.currency, availableBalance: final.available, pendingBalance: Math.max(0, final.pending) }
    );
    walletDocs[userKey] = wallet;

    // Replay events in a stable order to compute the running `balance` value of each transaction.
    const run = { pending: 0, available: 0 };
    for (const e of ctx.events) {
      let balance;
      if (e.type === 'escrow_hold') { run.pending += e.amount; balance = run.pending; }
      else if (e.type === 'escrow_release') { run.pending -= e.amount; run.available += e.amount; balance = run.available; }
      else if (e.type === 'refund') { run.pending += e.amount; balance = run.pending; }
      await upsertBy(
        Transaction,
        { user: e.walletUser, reference: e.order._id.toString(), type: e.type },
        {
          wallet: wallet._id,
          user: e.walletUser,
          type: e.type,
          amount: e.amount,
          currency: e.currency,
          balance: Math.max(0, balance),
          reference: e.order._id.toString(),
          description: `${e.type} for order ${e.order.orderNumber}`,
        }
      );
    }
    console.log(`  Wallet vendor user ${userKey}: ${ctx.currency} available=${final.available} pending=${Math.max(0, final.pending)}`);
  }
  console.log(`Wallets: ${Object.keys(walletDocs).length}. Transactions: ${events.length} ledger events.`);

  // 7) Legacy Orders + Reviews (schema-compatible with Review.order -> 'Order')
  for (const lo of LEGACY_ORDERS) {
    const product = productDocs[lo.product];
    const legacy = await Order.findOne({
      user: userDocs[lo.buyer]._id,
      status: 'delivered',
      'items.product': product._id,
    });
    if (!legacy) {
      await Order.create({
        user: userDocs[lo.buyer]._id,
        items: [{
          product: product._id,
          color: 'Standard',
          size: 'N/A',
          quantity: lo.quantity,
          price: lo.unitPrice,
        }],
        totalPrice: String(lo.unitPrice * lo.quantity),
        status: 'delivered',
        paymentMethods: 'mada',
        address: { country: 'Saudi Arabia', city: 'Riyadh' },
      });
    }
  }
  console.log(`Legacy Orders (for Reviews): ensured ${LEGACY_ORDERS.length}.`);

  for (const r of REVIEWS) {
    const product = productDocs[r.product];
    const legacyOrder = await Order.findOne({
      user: userDocs[r.buyer]._id,
      status: 'delivered',
      'items.product': product._id,
    });
    if (!legacyOrder) continue;
    await upsertBy(
      Review,
      { order: legacyOrder._id, reviewType: 'product', user: userDocs[r.buyer]._id },
      {
        user: userDocs[r.buyer]._id,
        vendor: vendorDocs[r.vendor]._id,
        product: product._id,
        order: legacyOrder._id,
        rating: r.rating,
        productQuality: r.rating,
        communication: r.rating,
        delivery: r.rating,
        packaging: r.rating,
        service: r.rating,
        title: r.title,
        comment: r.comment,
        recommendation: r.recommendation,
        isVerifiedPurchase: true,
        moderationStatus: 'approved',
        reviewType: 'product',
      }
    );
    // Recompute the product's public rating from approved reviews.
    const agg = await Review.aggregate([
      { $match: { product: product._id, moderationStatus: 'approved', isDeleted: false } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const stat = agg[0];
    if (stat) {
      await Product.updateOne(
        { _id: product._id },
        { ratingAverage: Math.round(stat.avg * 10) / 10, ratingQuantity: stat.count }
      );
    }
  }
  console.log(`Reviews: ensured ${REVIEWS.length}.`);

  // ─── Verification ─────────────────────────────────────────────────────────
  console.log('\n================================');
  console.log('SEED COMPLETED');
  console.log('================================');

  const count = async (model) => model.countDocuments().exec();
  const counts = {
    Users: await count(User),
    Vendors: await count(Vendor),
    Categories: await count(Category),
    SubCategories: await count(SubCategory),
    Brands: await count(Brand),
    Products: await count(Product),
    Orders: await count(EscrowOrder),
    Payments: await count(Payment),
    Wallets: await count(Wallet),
    Transactions: await count(Transaction),
    Reviews: await count(Review),
  };
  for (const [k, v] of Object.entries(counts)) console.log(`${k.padEnd(14)}: ${v}`);

  const dupField = async (model, field) => {
    const rows = await model.aggregate([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }], { allowDiskUse: true });
    return rows.length;
  };

  console.log('\n================================');
  console.log('INTEGRITY CHECK');
  console.log('================================');
  console.log(`${'Duplicate Users:'.padEnd(20)} ${await dupField(User, 'email')}`);
  console.log(`${'Duplicate Vendors:'.padEnd(20)} ${await dupField(Vendor, 'slug')}`);
  console.log(`${'Duplicate Products:'.padEnd(20)} ${await dupField(Product, 'slug')}`);
  console.log(`${'Duplicate Categories:'.padEnd(20)} ${await dupField(Category, 'slug')}`);
  console.log(`${'Duplicate Brands:'.padEnd(20)} ${await dupField(Brand, 'slug')}`);
  console.log(`${'Duplicate Wallets:'.padEnd(20)} ${await dupField(Wallet, 'user')}`);

  const productIds = new Set((await Product.find({}).select('_id').lean()).map((p) => String(p._id)));
  const userIds = new Set((await User.find({}).select('_id').lean()).map((u) => String(u._id)));
  const vendorIds = new Set((await Vendor.find({}).select('_id').lean()).map((v) => String(v._id)));
  const orderIds = new Set((await EscrowOrder.find({}).select('_id').lean()).map((o) => String(o._id)));

  let brokenRefs = 0;
  const allOrders = await EscrowOrder.find({}).lean();
  for (const o of allOrders) {
    if (!userIds.has(String(o.buyer)) || !vendorIds.has(String(o.vendor))) brokenRefs++;
    for (const it of o.items) if (!productIds.has(String(it.product))) brokenRefs++;
  }
  const allPayments = await Payment.find({}).lean();
  for (const p of allPayments) {
    if (!orderIds.has(String(p.order)) || !userIds.has(String(p.buyer))) brokenRefs++;
  }
  const allReviews = await Review.find({}).lean();
  for (const r of allReviews) {
    if (!userIds.has(String(r.user)) || !productIds.has(String(r.product))) brokenRefs++;
  }
  console.log(`${'Broken References:'.padEnd(20)} ${brokenRefs}`);

  let invalidOrders = 0;
  for (const o of allOrders) {
    const expects = o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    if (Math.abs(o.totalAmount - expects) > 0.001 || o.totalAmount <= 0) invalidOrders++;
  }
  console.log(`${'Invalid Orders:'.padEnd(20)} ${invalidOrders}`);

  // Wallet consistency: recompute from orders and compare.
  let walletDiffs = 0;
  for (const w of await Wallet.find({}).lean()) {
    const vendorUser = await User.findById(w.user).lean();
    const vendorDoc = vendorUser ? await Vendor.findOne({ user: vendorUser._id }).select('_id').lean() : null;
    if (!vendorDoc) { walletDiffs++; continue; }
    const vendorOrders = await EscrowOrder.find({ vendor: vendorDoc._id, currency: w.currency }).lean();
    let pending = 0, available = 0;
    for (const o of vendorOrders) {
      if (HOLD_STATUSES.has(o.status)) {
        if (REFUND_STATUSES.has(o.status)) pending += 0;
        else if (RELEASE_STATUSES.has(o.status)) available += o.totalAmount;
        else pending += o.totalAmount;
      }
    }
    if (w.pendingBalance !== pending || w.availableBalance !== available) walletDiffs++;
  }
  console.log(`${'Wallet Mismatches:'.padEnd(20)} ${walletDiffs}`);

  console.log('\n================================');
  console.log('DEMO ACCOUNTS');
  console.log('================================');
  console.log('Admin:\n  admin@manus.sa\n  Demo@1234\n');
  console.log('Vendors:\n  vendor1@manus.sa\n  vendor2@manus.sa\n  vendor3@manus.sa\n  (all) Demo@1234\n');
  console.log('Buyers:\n  buyer1@manus.sa\n  buyer2@manus.sa\n  buyer3@manus.sa\n  buyer4@manus.sa\n  (all) Demo@1234\n');

  console.log('NOTE: Payments are bound to EscrowOrder ids (mirrors escrowController.createPayment).');
  console.log('NOTE: Reviews are bound to legacy Order docs (Review.order ref -> old Order model).');
};

seed()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error('SEED FAILED:', err.message);
    if (err.errors) {
      Object.entries(err.errors).forEach(([k, e]) => console.error(`  - ${k}: ${e.message}`));
    }
    mongoose.disconnect();
    process.exit(1);
  });