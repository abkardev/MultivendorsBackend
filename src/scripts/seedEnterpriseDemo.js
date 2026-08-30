// import mongoose from 'mongoose';
// import dotenv from 'dotenv';
// import User from '../models/userModel.js';
// import { Vendor } from '../models/vendorModel.js';
// import { Department } from '../models/Department.js';
// import { Document } from '../models/Document.js';
// import { ApprovalWorkflow, ApprovalRequest } from '../models/ApprovalWorkflow.js';
// import { FactoryProfile } from '../models/FactoryProfile.js';
// import { Warehouse, Country } from '../models/Warehouse.js';
// import { Notification } from '../models/Notification.js';
// import { Tender } from '../models/tenderModel.js';
// import { BuyingRequest } from '../models/buyingRequestModel.js';
// import { Product } from '../models/productModel.js';
// import { Category } from '../models/categoryModel.js';
// import { Setting } from '../models/Setting.js';
// import { RfqTemplate } from '../models/rfqTemplateModel.js';
// import { AdCampaign } from '../models/adCampaignModel.js';
// import { CrmContact } from '../models/crmContactModel.js';
// import { ProcurementRequest, PurchaseOrder } from '../models/procurementModel.js';
// import EscrowOrder from '../models/Order.js';
// import Wallet from '../models/Wallet.js';
// import Transaction from '../models/Transaction.js';
// import Payment from '../models/Payment.js';
// import Subscription from '../models/Subscription.js';
// import WithdrawalRequest from '../models/WithdrawalRequest.js';
// import Dispute from '../models/Dispute.js';
// import { Announcement } from '../models/announcementModel.js';
// import { Chat } from '../models/chatModel.js';
// import { Message } from '../models/messageModel.js';
// import Review from '../models/reviewModel.js';
// import { Wishlist } from '../models/wishlistModel.js';
// import { Support } from '../models/supportSchema.js';

// dotenv.config();

// const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/multivendormanus';

// const seedEnterprise = async () => {
//   try {
//     await mongoose.connect(MONGODB_URI);
//     console.log('Connected to MongoDB for enterprise demo seeding...');

//     const users = await User.find({});
//     const vendors = await Vendor.find({});
//     const products = await Product.find({});

//     const admin = users.find(u => u.role === 'admin');
//     const buyer = users.find(u => u.email === 'buyer@test.com');
//     const staff = users.find(u => u.role === 'staff');
//     const vendors_m = vendors.filter(v => v.storeName?.en);
//     const techpro = vendors.find(v => v.slug === 'techpro-electronics');
//     const textiles = vendors.find(v => v.slug === 'global-textiles');
//     const foods = vendors.find(v => v.slug === 'fresh-foods');

//     const vendorUsers = vendors_m.map(v => ({
//       vendor: v,
//       user: users.find(u => String(u._id) === String(v.user)),
//     })).filter(vu => vu.user);

//     const firstVendorUser = vendorUsers[0]?.user;
//     const firstVendor = vendorUsers[0]?.vendor;
//     const secondVendor = vendorUsers[1]?.vendor;

//     console.log(`Found ${users.length} users, ${vendors.length} vendors, ${products.length} products`);

//     // 1. Departments
//     console.log('\n--- Seeding Departments ---');
//     const deptData = [
//       { name: { en: 'Procurement', ar: 'المشتريات' }, code: 'PROC' },
//       { name: { en: 'Finance', ar: 'المالية' }, code: 'FIN' },
//       { name: { en: 'Operations', ar: 'العمليات' }, code: 'OPS' },
//       { name: { en: 'Compliance', ar: 'الامتثال' }, code: 'COMP' },
//       { name: { en: 'Logistics', ar: 'اللوجستيات' }, code: 'LOG' },
//     ];
//     for (const d of deptData) {
//       await Department.findOneAndUpdate({ code: d.code }, { $setOnInsert: d }, { upsert: true });
//     }
//     console.log(`${deptData.length} departments created`);

//     // 2. Documents
//     console.log('\n--- Seeding Documents ---');
//     for (const vu of vendorUsers) {
//       const existing = await Document.countDocuments({ owner: vu.user._id });
//       if (existing === 0) {
//         await Document.create({
//           title: { en: `${vu.vendor.storeName?.en || 'Vendor'} Business License`, ar: 'رخصة تجارية' },
//           docType: 'business_license', category: 'verification',
//           owner: vu.user._id, status: 'approved',
//           versions: [{ versionNumber: 1, fileName: 'license.pdf', fileUrl: 'https://placehold.co/400x300?text=License', uploadedBy: vu.user._id }],
//           expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
//         });
//       }
//     }
//     if (admin) {
//       const adminDocCount = await Document.countDocuments({ owner: admin._id });
//       if (adminDocCount === 0) {
//         await Document.create({
//           title: { en: 'Platform Terms of Service v2', ar: 'شروط خدمة المنصة الإصدار 2' },
//           docType: 'contract', category: 'compliance',
//           owner: admin._id, status: 'approved', isPublic: true,
//           versions: [{ versionNumber: 1, fileName: 'tos-v2.pdf', fileUrl: 'https://placehold.co/400x300?text=TOS', uploadedBy: admin._id }],
//         });
//         await Document.create({
//           title: { en: 'Supplier Code of Conduct', ar: 'مدونة قواعد سلوك الموردين' },
//           docType: 'contract', category: 'compliance',
//           owner: admin._id, status: 'approved', isPublic: true,
//           versions: [{ versionNumber: 1, fileName: 'code-of-conduct.pdf', fileUrl: 'https://placehold.co/400x300?text=CoC', uploadedBy: admin._id }],
//         });
//       }
//     }
//     console.log('Documents seeded');

//     // 3. Approval Workflows
//     console.log('\n--- Seeding Approval Workflows ---');
//     const wfCount = await ApprovalWorkflow.countDocuments({});
//     if (wfCount === 0) {
//       await ApprovalWorkflow.create({
//         name: { en: 'Procurement Approval', ar: 'الموافقة على المشتريات' },
//         resourceType: 'procurement',
//         steps: [
//           { stepNumber: 1, label: { en: 'Manager Review', ar: 'مراجعة المدير' }, assigneeRole: 'admin', status: 'pending' },
//           { stepNumber: 2, label: { en: 'Finance Approval', ar: 'الموافقة المالية' }, assigneeRole: 'admin', status: 'pending' },
//           { stepNumber: 3, label: { en: 'Director Final Sign-off', ar: 'اعتماد المدير النهائي' }, assigneeRole: 'admin', status: 'pending' },
//         ],
//       });
//       await ApprovalWorkflow.create({
//         name: { en: 'Vendor Verification', ar: 'التحقق من المورد' },
//         resourceType: 'verification',
//         steps: [
//           { stepNumber: 1, label: { en: 'Document Check', ar: 'فحص المستندات' }, assigneeRole: 'admin', status: 'pending' },
//           { stepNumber: 2, label: { en: 'Background Verification', ar: 'التحقق الخلفي' }, assigneeRole: 'admin', status: 'pending' },
//         ],
//       });
//       console.log('Approval workflows created');
//     } else {
//       console.log('Approval workflows already exist');
//     }

//     // 4. Approval Requests
//     console.log('\n--- Seeding Approval Requests ---');
//     const arCount = await ApprovalRequest.countDocuments({});
//     if (arCount === 0 && buyer) {
//       await ApprovalRequest.create({
//         resourceType: 'procurement',
//         requester: buyer._id,
//         title: { en: 'Q3 Office Equipment Purchase', ar: 'شراء معدات مكتبية للربع الثالث' },
//         description: 'Purchase request for 20 laptops and office furniture',
//         status: 'in_progress', priority: 'high',
//         currentStep: 0,
//         steps: [
//           { stepNumber: 1, label: { en: 'Manager Review', ar: 'مراجعة المدير' }, status: 'pending' },
//           { stepNumber: 2, label: { en: 'Finance Approval', ar: 'الموافقة المالية' }, status: 'pending' },
//         ],
//       });
//       await ApprovalRequest.create({
//         resourceType: 'verification',
//         requester: buyer._id,
//         title: { en: 'Supplier Onboarding - Fresh Foods Co', ar: 'تسجيل مورد جديد - شركة الأطعمة الطازجة' },
//         status: 'pending', priority: 'medium',
//         steps: [
//           { stepNumber: 1, label: { en: 'Document Check', ar: 'فحص المستندات' }, status: 'pending' },
//         ],
//       });
//       console.log('Approval requests created');
//     } else {
//       console.log('Approval requests already exist');
//     }

//     // 5. Factory Profiles
//     console.log('\n--- Seeding Factory Profiles ---');
//     for (const vu of vendorUsers) {
//       const existing = await FactoryProfile.findOne({ vendor: vu.user._id });
//       if (!existing) {
//         await FactoryProfile.create({
//           vendor: vu.user._id,
//           factoryName: { en: `${vu.vendor.storeName?.en || 'Factory'} Manufacturing`, ar: 'مصنع تصنيع' },
//           factoryAddress: { city: 'Riyadh', country: 'Saudi Arabia' },
//           establishedYear: 2015 + Math.floor(Math.random() * 10),
//           employeeCount: 50 + Math.floor(Math.random() * 200),
//           factorySize: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
//           certifications: [{ name: 'ISO 9001:2015', issuer: 'SASO', verified: true }],
//           exportMarkets: ['UAE', 'Kuwait', 'Qatar'],
//           isVerified: true,
//           scoring: {
//             overall: 85 + Math.floor(Math.random() * 10),
//             delivery: 80 + Math.floor(Math.random() * 15),
//             quality: 85 + Math.floor(Math.random() * 10),
//             communication: 78 + Math.floor(Math.random() * 15),
//             compliance: 60 + Math.floor(Math.random() * 35),
//             lastCalculated: new Date(),
//           },
//         });
//       }
//     }
//     console.log('Factory profiles seeded');

//     // 6. Warehouses
//     console.log('\n--- Seeding Warehouses ---');
//     for (const vu of vendorUsers) {
//       const existing = await Warehouse.countDocuments({ vendor: vu.user._id });
//       if (existing === 0) {
//         await Warehouse.create({
//           name: { en: `${vu.vendor.storeName?.en || 'Main'} Warehouse`, ar: 'المستودع الرئيسي' },
//           code: `WH-${vu.vendor.storeName?.en?.substring(0, 3).toUpperCase() || 'XXX'}-001`,
//           vendor: vu.user._id,
//           address: { city: 'Riyadh', country: 'Saudi Arabia', street: 'King Fahd Road' },
//           capacity: { total: 5000, used: 1200, unit: 'sqm' },
//           isActive: true,
//         });
//       }
//     }
//     console.log('Warehouses seeded');

//     // 7. Notifications
//     console.log('\n--- Seeding Notifications ---');
//     for (const user of users) {
//       const existing = await Notification.countDocuments({ recipient: user._id });
//       if (existing === 0) {
//         const notifs = [
//           { type: 'system_announcement', title: { en: 'Welcome to B2B Market!', ar: 'مرحباً بك في سوق B2B!' }, body: { en: 'Explore the platform and connect with verified suppliers.', ar: 'استكشف المنصة وتواصل مع الموردين الموثقين.' }, priority: 'medium', link: '/dashboard' },
//           { type: 'order_placed', title: { en: 'Order #1001 placed successfully', ar: 'تم تقديم الطلب #1001 بنجاح' }, body: { en: 'Your order has been received and is being processed.', ar: 'تم استلام طلبك وهو قيد المعالجة.' }, priority: 'medium', link: '/orders' },
//           { type: 'message_received', title: { en: 'New message from a supplier', ar: 'رسالة جديدة من مورد' }, body: { en: 'A supplier has responded to your RFQ inquiry.', ar: 'قام مورد بالرد على استفسار طلب السعر الخاص بك.' }, priority: 'low', link: '/chat' },
//         ];
//         for (const n of notifs) {
//           await Notification.create({ ...n, recipient: user._id, channels: ['in_app'] });
//         }
//       }
//     }
//     console.log('Notifications seeded');

//     // 8. Tenders
//     console.log('\n--- Seeding Tenders ---');
//     const tenderCount = await Tender.countDocuments({});
//     if (tenderCount === 0 && buyer) {
//       const cat1 = await Category.findOne({});
//       await Tender.create({
//         buyer: buyer._id, category: cat1?._id,
//         title: { en: 'Supply of 5000 units of LED Panels', ar: 'توريد 5000 وحدة من ألواح LED' },
//         description: { en: 'Looking for a reliable supplier of high-quality LED panels for a commercial project.', ar: 'نبحث عن مورد موثوق لألواح LED عالية الجودة لمشروعنا التجاري.' },
//         quantity: 5000, unit: 'units',
//         budget: { min: 50000, max: 75000 },
//         deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
//         status: 'open',
//       });
//       await Tender.create({
//         buyer: buyer._id, category: cat1?._id,
//         title: { en: 'Annual IT Equipment Maintenance Contract', ar: 'عقد صيانة سنوي لمعدات تقنية المعلومات' },
//         description: { en: 'Seeking proposals for annual maintenance of server infrastructure.', ar: 'نطلب عروضاً للصيانة السنوية للبنية التحتية للخوادم.' },
//         quantity: 1, unit: 'contract',
//         budget: { min: 20000, max: 40000 },
//         deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
//         status: 'open',
//       });
//       console.log('Tenders created');
//     } else {
//       console.log('Tenders already exist');
//     }

//     // 9. Buying Requests
//     console.log('\n--- Seeding Buying Requests ---');
//     const brCount = await BuyingRequest.countDocuments({});
//     if (brCount === 0 && buyer) {
//       const cat1 = await Category.findOne({});
//       await BuyingRequest.create({
//         buyer: buyer._id, category: cat1?._id,
//         title: { en: 'Looking for Organic Cotton Fabric', ar: 'أبحث عن قماش قطني عضوي' },
//         description: { en: 'Need 2000 meters of organic cotton fabric for summer collection.', ar: 'أحتاج 2000 متر من القماش القطني العضوي لمجموعة الصيف.' },
//         quantity: 2000, unit: 'meters', budget: 5000,
//         status: 'open',
//       });
//       await BuyingRequest.create({
//         buyer: buyer._id, category: cat1?._id,
//         title: { en: 'Industrial Packaging Materials', ar: 'مواد تغليف صناعية' },
//         description: { en: 'Looking for bulk packaging materials for our production line.', ar: 'أبحث عن مواد تغليف بالجملة لخط الإنتاج الخاص بنا.' },
//         quantity: 10000, unit: 'pieces', budget: 15000,
//         status: 'open',
//       });
//       console.log('Buying requests created');
//     } else {
//       console.log('Buying requests already exist');
//     }

//     // 10. RFQ Templates
//     console.log('\n--- Seeding RFQ Templates ---');
//     const rtCount = await RfqTemplate.countDocuments({});
//     if (rtCount === 0 && buyer) {
//       await RfqTemplate.create({
//         user: buyer._id,
//         name: 'Raw Materials Request',
//         defaultTitle: { en: 'Request for Raw Materials', ar: 'طلب مواد خام' },
//         defaultQuantity: 1000, defaultUnit: 'kg',
//       });
//       await RfqTemplate.create({
//         user: buyer._id,
//         name: 'Packaging Request',
//         defaultTitle: { en: 'Request for Packaging Supplies', ar: 'طلب مستلزمات التعبئة' },
//         defaultQuantity: 500, defaultUnit: 'boxes',
//       });
//       console.log('RFQ Templates created');
//     } else { console.log('RFQ Templates already exist'); }

//     // 11. Platform Settings
//     console.log('\n--- Seeding Platform Settings ---');
//     const defaults = [
//       { key: 'platform_name', value: 'B2B Market', type: 'string', label: { en: 'Platform Name', ar: 'اسم المنصة' }, category: 'general', isPublic: true },
//       { key: 'support_email', value: 'support@b2bmarket.com', type: 'string', label: { en: 'Support Email', ar: 'بريد الدعم' }, category: 'general' },
//       { key: 'commission_rate', value: 5, type: 'number', label: { en: 'Default Commission Rate (%)', ar: 'نسبة العمولة الافتراضية (%)' }, category: 'commission' },
//       { key: 'currency', value: 'SAR', type: 'string', label: { en: 'Default Currency', ar: 'العملة الافتراضية' }, category: 'localization', isPublic: true },
//       { key: 'max_file_upload_mb', value: 10, type: 'number', label: { en: 'Max File Upload (MB)', ar: 'الحد الأقصى لرفع الملفات' }, category: 'general' },
//       { key: 'new_registrations_open', value: true, type: 'boolean', label: { en: 'Allow New Registrations', ar: 'السماح بالتسجيلات الجديدة' }, category: 'security' },
//       { key: 'default_currency', value: 'SAR', type: 'string', label: { en: 'Default Currency', ar: 'العملة الافتراضية' }, category: 'localization', isPublic: true },
//       { key: 'tax_percentage', value: 15, type: 'number', label: { en: 'Tax Percentage (%)', ar: 'نسبة الضريبة (%)' }, category: 'financial' },
//       { key: 'payment_gateway', value: 'stripe', type: 'string', label: { en: 'Payment Gateway', ar: 'بوابة الدفع' }, category: 'payment' },
//     ];
//     for (const def of defaults) {
//       await Setting.findOneAndUpdate({ key: def.key }, { $setOnInsert: def }, { upsert: true });
//     }
//     console.log(`${defaults.length} settings seeded`);

//     // 12. Countries
//     console.log('\n--- Seeding Countries ---');
//     const countryDefaults = [
//       { code: 'SA', name: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' }, currency: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' }, phoneCode: '+966', isActive: true },
//       { code: 'AE', name: { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة' }, currency: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' }, phoneCode: '+971', isActive: true },
//       { code: 'KW', name: { en: 'Kuwait', ar: 'الكويت' }, currency: { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' }, phoneCode: '+965', isActive: false },
//       { code: 'QA', name: { en: 'Qatar', ar: 'قطر' }, currency: { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' }, phoneCode: '+974', isActive: false },
//       { code: 'EG', name: { en: 'Egypt', ar: 'مصر' }, currency: { code: 'EGP', symbol: 'ج.م', name: 'Egyptian Pound' }, phoneCode: '+20', isActive: false },
//     ];
//     for (const c of countryDefaults) {
//       await Country.findOneAndUpdate({ code: c.code }, { $setOnInsert: c }, { upsert: true });
//     }
//     console.log(`${countryDefaults.length} countries seeded`);

//     // 13. Ad Campaigns
//     console.log('\n--- Seeding Ad Campaigns ---');
//     const adCount = await AdCampaign.countDocuments({});
//     if (adCount === 0 && firstVendor && products.length > 0) {
//       await AdCampaign.create({
//         vendor: firstVendor._id,
//         product: products[0]._id,
//         title: 'Sponsored Electronics Showcase',
//         placement: 'sponsored',
//         budget: 1000, spent: 250,
//         impressions: 15000, clicks: 320,
//         status: 'active',
//         startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
//         endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
//         dailyBudget: 50,
//       });
//       await AdCampaign.create({
//         vendor: firstVendor._id,
//         product: products[1]?._id || products[0]._id,
//         title: 'Featured Products Banner',
//         placement: 'banner',
//         budget: 500, spent: 500,
//         impressions: 25000, clicks: 180,
//         status: 'ended',
//         startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
//         endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
//         dailyBudget: 25,
//       });
//       console.log('Ad campaigns created');
//     } else { console.log('Ad campaigns already exist'); }

//     // 14. CRM Contacts
//     console.log('\n--- Seeding CRM Contacts ---');
//     const crmCount = await CrmContact.countDocuments({});
//     if (crmCount === 0 && firstVendor) {
//       const buyers = users.filter(u => u.role === 'buyer' || u.email?.includes('buyer'));
//       for (const b of buyers) {
//         await CrmContact.create({
//           vendor: firstVendor._id,
//           buyer: b._id,
//           company: `${b.name?.en || b.name || 'Buyer'}'s Company`,
//           email: b.email,
//           phone: '+966512345678',
//           tags: ['wholesale', 'active'],
//           status: 'active',
//           interactions: [
//             { type: 'rfq', description: 'Requested quote for LED panels', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
//             { type: 'message', description: 'Discussed bulk pricing', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
//           ],
//         });
//       }
//       if (secondVendor) {
//         await CrmContact.create({
//           vendor: secondVendor._id,
//           buyer: users[0]._id,
//           company: 'Alfa Imports LLC',
//           email: users[0].email,
//           phone: '+971501234567',
//           tags: ['textile', 'lead'],
//           status: 'lead',
//           interactions: [
//             { type: 'email', description: 'Sent introductory email about fabric collection', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
//           ],
//         });
//       }
//       console.log('CRM contacts created');
//     } else { console.log('CRM contacts already exist'); }

//     // 15. Procurement Requests & Purchase Orders
//     console.log('\n--- Seeding Procurement Requests ---');
//     const prCount = await ProcurementRequest.countDocuments({});
//     if (prCount === 0 && buyer) {
//       await ProcurementRequest.create({
//         buyer: buyer._id,
//         title: 'Office Renovation Supplies',
//         description: 'Materials needed for H2 office renovation project',
//         department: 'PROC',
//         items: [
//           { description: 'LED Office Panels', quantity: 200, unit: 'units', estimatedPrice: 15000, category: 'Electronics', requiredDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
//           { description: 'Ergonomic Chairs', quantity: 50, unit: 'units', estimatedPrice: 25000, category: 'Furniture', requiredDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) },
//         ],
//         estimatedBudget: 40000,
//         status: 'pending_approval',
//         priority: 'medium',
//         approvals: admin ? [{ approvedBy: admin._id, status: 'approved', comment: 'Approved for Q3 budget', date: new Date() }] : [],
//       });
//       await ProcurementRequest.create({
//         buyer: buyer._id,
//         title: 'Raw Materials - Q4 Production',
//         description: 'Bulk raw materials for Q4 manufacturing run',
//         department: 'OPS',
//         items: [
//           { description: 'Steel Sheets 2mm', quantity: 1000, unit: 'sqm', estimatedPrice: 50000, category: 'Raw Materials', requiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
//           { description: 'Aluminum Profiles', quantity: 500, unit: 'meters', estimatedPrice: 30000, category: 'Raw Materials', requiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
//         ],
//         estimatedBudget: 80000,
//         status: 'draft',
//         priority: 'high',
//       });
//       console.log('Procurement requests created');
//     } else { console.log('Procurement requests already exist'); }

//     // Purchase Orders
//     console.log('\n--- Seeding Purchase Orders ---');
//     const poCount = await PurchaseOrder.countDocuments({});
//     if (poCount === 0 && buyer && firstVendor) {
//       await PurchaseOrder.create({
//         buyer: buyer._id,
//         vendor: firstVendor._id,
//         poNumber: 'PO-2024-001',
//         title: 'Initial Electronics Stock Order',
//         items: [
//           { description: 'Wireless Headphones', quantity: 100, unit: 'units', unitPrice: 45, totalPrice: 4500 },
//           { description: 'USB-C Cables', quantity: 500, unit: 'units', unitPrice: 3, totalPrice: 1500 },
//         ],
//         subtotal: 6000, tax: 900, shipping: 200,
//         totalAmount: 7100,
//         status: 'delivered',
//         paymentTerms: 'Net 30',
//         deliveryAddress: 'Warehouse A, Riyadh Industrial Zone',
//         expectedDelivery: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
//       });
//       await PurchaseOrder.create({
//         buyer: buyer._id,
//         vendor: firstVendor._id,
//         poNumber: 'PO-2024-002',
//         title: 'Q4 Electronics Replenishment',
//         items: [
//           { description: 'Smart LED Bulbs', quantity: 200, unit: 'units', unitPrice: 12, totalPrice: 2400 },
//           { description: 'Bluetooth Speakers', quantity: 50, unit: 'units', unitPrice: 35, totalPrice: 1750 },
//         ],
//         subtotal: 4150, tax: 622.50, shipping: 150,
//         totalAmount: 4922.50,
//         status: 'sent',
//         paymentTerms: 'Net 15',
//         deliveryAddress: 'Warehouse A, Riyadh Industrial Zone',
//         expectedDelivery: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
//       });
//       console.log('Purchase orders created');
//     } else { console.log('Purchase orders already exist'); }

//     // 16. Escrow Orders
//     console.log('\n--- Seeding Escrow Orders ---');
//     const escrowCount = await EscrowOrder.countDocuments({});
//     if (escrowCount === 0 && buyer && firstVendor && products.length > 0) {
//       const order = await EscrowOrder.create({
//         buyer: buyer._id,
//         vendor: firstVendor._id,
//         items: [
//           { product: products[0]._id, name: { en: products[0].name?.en || 'Product' }, quantity: 10, unitPrice: 50, totalPrice: 500 },
//           { product: products[1]?._id || products[0]._id, name: { en: products[1]?.name?.en || 'Product 2' }, quantity: 5, unitPrice: 100, totalPrice: 500 },
//         ],
//         totalAmount: 1000,
//         currency: 'USD',
//         status: 'in_escrow',
//         paymentMethod: 'credit_card',
//         escrowReleasedAt: null,
//         autoReleaseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
//       });
//       // create payment for this order
//       await Payment.create({
//         order: order._id,
//         buyer: buyer._id,
//         amount: 1000,
//         method: 'credit_card',
//         status: 'completed',
//         gatewayRef: 'pi_demo_' + Date.now(),
//       });
//       // create wallets and transactions
//       let wallet = await Wallet.findOne({ user: firstVendor.user || firstVendor._id });
//       if (!wallet) {
//         wallet = await Wallet.create({ user: firstVendor.user || firstVendor._id, availableBalance: 850, pendingBalance: 1000 });
//       }
//       await Transaction.create({
//         wallet: wallet._id,
//         user: firstVendor.user || firstVendor._id,
//         type: 'escrow_hold',
//         amount: 1000,
//         balance: wallet.availableBalance,
//         reference: order.orderNumber,
//         description: `Escrow hold for order ${order.orderNumber}`,
//       });
//       console.log('Escrow order, payment, wallet & transaction created');
//     } else { console.log('Escrow orders already exist'); }

//     // 17. Subscriptions
//     console.log('\n--- Seeding Subscriptions ---');
//     const subCount = await Subscription.countDocuments({});
//     if (subCount === 0) {
//       const subData = [];
//       for (const vu of vendorUsers) {
//         subData.push({
//           userId: vu.user._id,
//           planType: 'growth',
//           status: 'active',
//           startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
//           endDate: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
//           commissionRate: 5,
//           features: { maxProducts: 500, analytics: true, apiAccess: true, support: 'priority' },
//           autoRenew: true,
//         });
//       }
//       if (subData.length > 0) {
//         await Subscription.insertMany(subData);
//         console.log(`${subData.length} subscriptions created`);
//       }
//     } else { console.log('Subscriptions already exist'); }

//     // 18. Withdrawal Requests
//     console.log('\n--- Seeding Withdrawal Requests ---');
//     const wdCount = await WithdrawalRequest.countDocuments({});
//     if (wdCount === 0 && firstVendorUser) {
//       await WithdrawalRequest.create({
//         user: firstVendorUser._id,
//         amount: 500,
//         status: 'completed',
//         bankDetails: { bankName: 'Al Rajhi Bank', accountNumber: 'SA1234567890', iban: 'SA0380000000123456789012', swiftCode: 'RJHISARI' },
//         processedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
//       });
//       await WithdrawalRequest.create({
//         user: firstVendorUser._id,
//         amount: 1200,
//         status: 'pending',
//         bankDetails: { bankName: 'Al Rajhi Bank', accountNumber: 'SA1234567890', iban: 'SA0380000000123456789012', swiftCode: 'RJHISARI' },
//       });
//       console.log('Withdrawal requests created');
//     } else { console.log('Withdrawal requests already exist'); }

//     // 19. Disputes
//     console.log('\n--- Seeding Disputes ---');
//     const disputeCount = await Dispute.countDocuments({});
//     if (disputeCount === 0 && buyer && firstVendor) {
//       const lastOrder = await EscrowOrder.findOne({});
//       if (lastOrder) {
//         await Dispute.create({
//           order: lastOrder._id,
//           buyer: buyer._id,
//           vendor: firstVendor._id,
//           reason: 'Item not as described',
//           description: 'Received 50 units with visible damage to packaging and some items were incorrect.',
//           status: 'under_review',
//           evidence: [
//             { type: 'image', url: 'https://placehold.co/400x300?text=Damage+Photo+1', note: 'Damaged packaging on arrival', uploadedBy: buyer._id },
//             { type: 'note', note: 'Items do not match PO specifications - ordered XL size but received L size', uploadedBy: buyer._id },
//           ],
//         });
//         console.log('Dispute created');
//       }
//     } else { console.log('Disputes already exist'); }

//     // 20. Announcements
//     console.log('\n--- Seeding Announcements ---');
//     const annCount = await Announcement.countDocuments({});
//     if (annCount === 0 && buyer) {
//       const cat1 = await Category.findOne({});
//       await Announcement.create({
//         buyer: buyer._id, category: cat1?._id,
//         title: { en: 'Bulk Order: Industrial Safety Equipment', ar: 'طلب بالجملة: معدات السلامة الصناعية' },
//         description: { en: 'We need a long-term supplier for safety helmets, vests, and gloves.', ar: 'نحتاج مورد طويل الأمد للخوذات وسترات السلامة والقفازات.' },
//         quantity: 10000, unit: 'units',
//         budget: { min: 50000, max: 80000 },
//         deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
//       });
//       await Announcement.create({
//         buyer: buyer._id, category: cat1?._id,
//         title: { en: 'Office Furniture - 100 Workstations', ar: 'أثاث مكتبي - 100 محطة عمل' },
//         description: { en: 'Looking for a supplier of modern ergonomic office furniture for our new HQ.', ar: 'نبحث عن مورد لأثاث مكتبي مريح حديث للمقر الجديد.' },
//         quantity: 100, unit: 'sets',
//         budget: { min: 150000, max: 200000 },
//         deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
//       });
//       console.log('Announcements created');
//     } else { console.log('Announcements already exist'); }

//     // 21. Chat & Messages
//     console.log('\n--- Seeding Chat & Messages ---');
//     const chatCount = await Chat.countDocuments({});
//     if (chatCount === 0 && buyer && firstVendor && firstVendorUser) {
//       const chat = await Chat.create({
//         participants: [buyer._id, firstVendorUser._id],
//         vendor: firstVendor._id,
//       });
//       await Message.create({
//         chat: chat._id,
//         sender: firstVendorUser._id,
//         content: 'Hello! Thank you for your interest in our products. How can I help you today?',
//         isRead: true,
//       });
//       await Message.create({
//         chat: chat._id,
//         sender: buyer._id,
//         content: 'Hi, I was looking at your LED panel catalog. Do you offer bulk discounts for 1000+ units?',
//         isRead: true,
//       });
//       await Message.create({
//         chat: chat._id,
//         sender: firstVendorUser._id,
//         content: 'Yes, we offer 15% discount for orders above 1000 units. I can send you a detailed quote.',
//         isRead: false,
//       });
//       // Update last message
//       chat.lastMessage = (await Message.findOne({ chat: chat._id }).sort({ createdAt: -1 }))._id;
//       await chat.save();
//       console.log('Chat & messages created');
//     } else { console.log('Chat already exist'); }

//     // 22. Reviews
//     console.log('\n--- Seeding Reviews ---');
//     const reviewCount = await Review.countDocuments({});
//     if (reviewCount === 0 && buyer && products.length > 0) {
//       await Review.create({
//         user: buyer._id,
//         product: products[0]._id,
//         rating: 4,
//         comment: 'Good quality product, fast shipping. Packaging could be improved.',
//         isApproved: true,
//         vendorReply: { comment: 'Thank you for your feedback! We will improve our packaging.', createdAt: new Date() },
//       });
//       if (products.length > 1) {
//         await Review.create({
//           user: buyer._id,
//           product: products[1]._id,
//           rating: 5,
//           comment: 'Excellent product! Exceeded our expectations. Will order again.',
//           isApproved: true,
//         });
//       }
//       if (staff || users.find(u => u.role === 'staff')) {
//         const staffUser = users.find(u => u.role === 'staff');
//         await Review.create({
//           user: staffUser?._id || buyer._id,
//           product: products[0]._id,
//           rating: 3,
//           comment: 'Average performance for the price. Works as described.',
//           isApproved: false,
//         });
//       }
//       console.log('Reviews created');
//     } else { console.log('Reviews already exist'); }

//     // 23. Wishlists
//     console.log('\n--- Seeding Wishlists ---');
//     const wlCount = await Wishlist.countDocuments({});
//     if (wlCount === 0 && buyer && products.length > 0) {
//       for (const p of products) {
//         await Wishlist.create({ user: buyer._id, products: p._id });
//       }
//       if (admin) {
//         await Wishlist.create({ user: admin._id, products: products[0]._id });
//       }
//       console.log('Wishlists created');
//     } else { console.log('Wishlists already exist'); }

//     // 24. Support Tickets
//     console.log('\n--- Seeding Support Tickets ---');
//     const supportCount = await Support.countDocuments({});
//     if (supportCount === 0 && buyer && products.length > 0) {
//       const ticket = await Support.create({
//         user: buyer._id,
//         product: products[0]._id,
//         subject: 'Defective product received',
//         message: [{ user: buyer._id, message: 'I received a defective unit in my last order. The device does not power on.' }],
//         status: 'in_progress',
//         priority: 'medium',
//         category: 'product_quality',
//       });
//       if (admin) {
//         ticket.message.push({ user: admin._id, message: 'We apologize for the inconvenience. Please provide your order number and we will process a replacement immediately.' });
//         ticket.assignedTo = admin._id;
//         ticket.assignedBy = admin._id;
//         await ticket.save();
//       }
//       await Support.create({
//         user: buyer._id,
//         product: products[0]._id,
//         subject: 'Shipping delay inquiry',
//         message: [{ user: buyer._id, message: 'My order was supposed to arrive 3 days ago. Can you check the status?' }],
//         status: 'open',
//         priority: 'medium',
//         category: 'shipping',
//       });
//       console.log('Support tickets created');
//     } else { console.log('Support tickets already exist'); }

//     console.log('\n========================================');
//     console.log('Enterprise demo data seeded successfully!');
//     console.log('========================================');
//     console.log('Demo data for all 20+ feature modules:');
//     console.log('  - Departments (5)');
//     console.log('  - Documents (licenses, contracts, policies)');
//     console.log('  - Approval Workflows (procurement, verification)');
//     console.log('  - Approval Requests (pending reviews)');
//     console.log('  - Factory Profiles (scored supplier profiles)');
//     console.log('  - Warehouses (per vendor)');
//     console.log('  - Notifications (welcome, order, messages)');
//     console.log('  - Tenders (2 open opportunities)');
//     console.log('  - Buying Requests (2 open requests)');
//     console.log('  - RFQ Templates (2 templates)');
//     console.log('  - Platform Settings (9 defaults)');
//     console.log('  - Countries (5 GCC/MENA countries)');
//     console.log('  - Ad Campaigns (sponsored + banner)');
//     console.log('  - CRM Contacts (buyer relationships)');
//     console.log('  - Procurement Requests + Purchase Orders');
//     console.log('  - Escrow Orders + Payments + Wallets + Transactions');
//     console.log('  - Subscriptions (one per vendor)');
//     console.log('  - Withdrawal Requests (completed + pending)');
//     console.log('  - Disputes (under review)');
//     console.log('  - Announcements (bulk buying requests)');
//     console.log('  - Chat & Messages (sample conversation)');
//     console.log('  - Reviews (approved + pending)');
//     console.log('  - Wishlists (per user)');
//     console.log('  - Support Tickets (in-progress + open)');
//     console.log('\nRun: node src/scripts/seedEnterpriseDemo.js');
//     process.exit(0);
//   } catch (error) {
//     console.error('Error seeding enterprise demo data:', error);
//     process.exit(1);
//   }
// };

// seedEnterprise();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Department } from '../models/Department.js';
import { Document } from '../models/Document.js';
import { ApprovalWorkflow, ApprovalRequest } from '../models/ApprovalWorkflow.js';
import { FactoryProfile } from '../models/FactoryProfile.js';
import { Warehouse, Country } from '../models/Warehouse.js';
import { Notification } from '../models/Notification.js';
import { Tender } from '../models/tenderModel.js';
import { BuyingRequest } from '../models/buyingRequestModel.js';
import { Product } from '../models/productModel.js';
import { Category } from '../models/categoryModel.js';
import { Setting } from '../models/Setting.js';
import { RfqTemplate } from '../models/rfqTemplateModel.js';
import { AdCampaign } from '../models/adCampaignModel.js';
import { CrmContact } from '../models/crmContactModel.js';
import {
  ProcurementRequest,
  PurchaseOrder,
} from '../models/procurementModel.js';
import EscrowOrder from '../models/Order.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import Dispute from '../models/Dispute.js';
import { Announcement } from '../models/announcementModel.js';
import { Chat } from '../models/chatModel.js';
import { Message } from '../models/messageModel.js';
import Review from '../models/reviewModel.js';
import { Wishlist } from '../models/wishlistModel.js';
import { Support } from '../models/supportSchema.js';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/multivendormanus';

const seedEnterprise = async () => {
  try {
    await mongoose.connect(MONGODB_URI);

    console.log('Connected to MongoDB for enterprise demo seeding...');

    const users = await User.find({});
    const vendors = await Vendor.find({});
    const products = await Product.find({});

    const admin = users.find((u) => u.role === 'admin');

    // FIX:
    // The main seed creates buyer1@manus.sa, buyer2@manus.sa, etc.
    // instead of buyer@test.com.
    const buyer =
      users.find((u) => u.email === 'buyer1@manus.sa') ||
      users.find((u) => u.role === 'buyer');

    const staff = users.find((u) => u.role === 'staff');

    const vendors_m = vendors.filter((v) => v.storeName?.en);

    const techpro = vendors.find(
      (v) => v.slug === 'techpro-electronics'
    );

    const textiles = vendors.find(
      (v) => v.slug === 'global-textiles'
    );

    const foods = vendors.find(
      (v) => v.slug === 'fresh-foods'
    );

    const vendorUsers = vendors_m
      .map((v) => ({
        vendor: v,
        user: users.find(
          (u) => String(u._id) === String(v.user)
        ),
      }))
      .filter((vu) => vu.user);

    const firstVendorUser = vendorUsers[0]?.user;
    const firstVendor = vendorUsers[0]?.vendor;
    const secondVendor = vendorUsers[1]?.vendor;

    console.log(
      `Found ${users.length} users, ${vendors.length} vendors, ${products.length} products`
    );

    // =========================================================
    // 1. Departments
    // =========================================================

    console.log('\n--- Seeding Departments ---');

    const deptData = [
      {
        name: {
          en: 'Procurement',
          ar: 'المشتريات',
        },
        code: 'PROC',
      },
      {
        name: {
          en: 'Finance',
          ar: 'المالية',
        },
        code: 'FIN',
      },
      {
        name: {
          en: 'Operations',
          ar: 'العمليات',
        },
        code: 'OPS',
      },
      {
        name: {
          en: 'Compliance',
          ar: 'الامتثال',
        },
        code: 'COMP',
      },
      {
        name: {
          en: 'Logistics',
          ar: 'اللوجستيات',
        },
        code: 'LOG',
      },
    ];

    for (const d of deptData) {
      await Department.findOneAndUpdate(
        { code: d.code },
        { $setOnInsert: d },
        { upsert: true }
      );
    }

    console.log(`${deptData.length} departments created`);

    // =========================================================
    // 2. Documents
    // =========================================================

    console.log('\n--- Seeding Documents ---');

    // Vendor business licenses
    for (const vu of vendorUsers) {
      const existing = await Document.findOne({
        createdBy: vu.user._id,
        'metadata.documentType': 'business_license',
      });

      if (!existing) {
        await Document.create({
          title: `${
            vu.vendor.storeName?.en || 'Vendor'
          } Business License`,

          description:
            'Business license document for vendor verification',

          file: {
            url: 'https://placehold.co/400x300?text=License',
            name: 'license.pdf',
            size: 250000,
            mimeType: 'application/pdf',
            pages: 1,
          },

          type: 'pdf',

          // FIX:
          // Document schema supports:
          // draft, published, archived, deleted
          status: 'published',

          version: 1,

          permissions: [
            {
              role: 'admin',
              access: 'manage',
            },
            {
              role: 'vendor',
              access: 'view',
            },
          ],

          // Extra enterprise information is stored
          // inside the existing Mixed metadata field.
          metadata: {
            documentType: 'business_license',
            category: 'verification',
            vendorId: vu.vendor._id,
            ownerId: vu.user._id,
            expiryDate: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000
            ),
            isPublic: false,
          },

          createdBy: vu.user._id,

          retentionDate: new Date(
            Date.now() + 5 * 365 * 24 * 60 * 60 * 1000
          ),
        });
      }
    }

    // Admin documents
    if (admin) {
      const adminDocCount = await Document.countDocuments({
        createdBy: admin._id,
      });

      if (adminDocCount === 0) {
        await Document.create({
          title: 'Platform Terms of Service v2',

          description: 'Platform terms of service',

          file: {
            url: 'https://placehold.co/400x300?text=TOS',
            name: 'tos-v2.pdf',
            size: 180000,
            mimeType: 'application/pdf',
            pages: 8,
          },

          type: 'pdf',
          status: 'published',
          version: 1,

          permissions: [
            {
              role: 'admin',
              access: 'manage',
            },
            {
              role: 'vendor',
              access: 'view',
            },
          ],

          metadata: {
            documentType: 'contract',
            category: 'compliance',
            isPublic: true,
          },

          createdBy: admin._id,
        });

        await Document.create({
          title: 'Supplier Code of Conduct',

          description:
            'Code of conduct for platform suppliers',

          file: {
            url: 'https://placehold.co/400x300?text=CoC',
            name: 'code-of-conduct.pdf',
            size: 150000,
            mimeType: 'application/pdf',
            pages: 6,
          },

          type: 'pdf',
          status: 'published',
          version: 1,

          permissions: [
            {
              role: 'admin',
              access: 'manage',
            },
            {
              role: 'vendor',
              access: 'view',
            },
          ],

          metadata: {
            documentType: 'policy',
            category: 'compliance',
            isPublic: true,
          },

          createdBy: admin._id,
        });
      }
    }

    console.log('Documents seeded');

    // =========================================================
    // 3. Approval Workflows
    // =========================================================

    console.log('\n--- Seeding Approval Workflows ---');

    const wfCount = await ApprovalWorkflow.countDocuments({});

    if (wfCount === 0) {
      await ApprovalWorkflow.create({
        name: {
          en: 'Procurement Approval',
          ar: 'الموافقة على المشتريات',
        },

        resourceType: 'procurement',

        steps: [
          {
            stepNumber: 1,
            label: {
              en: 'Manager Review',
              ar: 'مراجعة المدير',
            },
            assigneeRole: 'admin',
            status: 'pending',
          },
          {
            stepNumber: 2,
            label: {
              en: 'Finance Approval',
              ar: 'الموافقة المالية',
            },
            assigneeRole: 'admin',
            status: 'pending',
          },
          {
            stepNumber: 3,
            label: {
              en: 'Director Final Sign-off',
              ar: 'اعتماد المدير النهائي',
            },
            assigneeRole: 'admin',
            status: 'pending',
          },
        ],
      });

      await ApprovalWorkflow.create({
        name: {
          en: 'Vendor Verification',
          ar: 'التحقق من المورد',
        },

        resourceType: 'verification',

        steps: [
          {
            stepNumber: 1,
            label: {
              en: 'Document Check',
              ar: 'فحص المستندات',
            },
            assigneeRole: 'admin',
            status: 'pending',
          },
          {
            stepNumber: 2,
            label: {
              en: 'Background Verification',
              ar: 'التحقق الخلفي',
            },
            assigneeRole: 'admin',
            status: 'pending',
          },
        ],
      });

      console.log('Approval workflows created');
    } else {
      console.log('Approval workflows already exist');
    }

    // =========================================================
    // 4. Approval Requests
    // =========================================================

    console.log('\n--- Seeding Approval Requests ---');

    const arCount = await ApprovalRequest.countDocuments({});

    if (arCount === 0 && buyer) {
      await ApprovalRequest.create({
        resourceType: 'procurement',
        requester: buyer._id,

        title: {
          en: 'Q3 Office Equipment Purchase',
          ar: 'شراء معدات مكتبية للربع الثالث',
        },

        description:
          'Purchase request for 20 laptops and office furniture',

        status: 'in_progress',
        priority: 'high',
        currentStep: 0,

        steps: [
          {
            stepNumber: 1,
            label: {
              en: 'Manager Review',
              ar: 'مراجعة المدير',
            },
            status: 'pending',
          },
          {
            stepNumber: 2,
            label: {
              en: 'Finance Approval',
              ar: 'الموافقة المالية',
            },
            status: 'pending',
          },
        ],
      });

      await ApprovalRequest.create({
        resourceType: 'verification',
        requester: buyer._id,

        title: {
          en: 'Supplier Onboarding - Fresh Foods Co',
          ar: 'تسجيل مورد جديد - شركة الأطعمة الطازجة',
        },

        status: 'pending',
        priority: 'medium',

        steps: [
          {
            stepNumber: 1,
            label: {
              en: 'Document Check',
              ar: 'فحص المستندات',
            },
            status: 'pending',
          },
        ],
      });

      console.log('Approval requests created');
    } else {
      console.log('Approval requests already exist');
    }

    // =========================================================
    // 5. Factory Profiles
    // =========================================================

    console.log('\n--- Seeding Factory Profiles ---');

    for (const vu of vendorUsers) {
      const existing = await FactoryProfile.findOne({
        vendor: vu.user._id,
      });

      if (!existing) {
        await FactoryProfile.create({
          vendor: vu.user._id,

          factoryName: {
            en: `${
              vu.vendor.storeName?.en || 'Factory'
            } Manufacturing`,
            ar: 'مصنع تصنيع',
          },

          factoryAddress: {
            city: 'Riyadh',
            country: 'Saudi Arabia',
          },

          establishedYear:
            2015 + Math.floor(Math.random() * 10),

          employeeCount:
            50 + Math.floor(Math.random() * 200),

          factorySize: [
            'small',
            'medium',
            'large',
          ][Math.floor(Math.random() * 3)],

          certifications: [
            {
              name: 'ISO 9001:2015',
              issuer: 'SASO',
              verified: true,
            },
          ],

          exportMarkets: [
            'UAE',
            'Kuwait',
            'Qatar',
          ],

          isVerified: true,

          scoring: {
            overall:
              85 + Math.floor(Math.random() * 10),

            delivery:
              80 + Math.floor(Math.random() * 15),

            quality:
              85 + Math.floor(Math.random() * 10),

            communication:
              78 + Math.floor(Math.random() * 15),

            compliance:
              60 + Math.floor(Math.random() * 35),

            lastCalculated: new Date(),
          },
        });
      }
    }

    console.log('Factory profiles seeded');

    // =========================================================
    // 6. Warehouses
    // =========================================================

    console.log('\n--- Seeding Warehouses ---');

    for (const vu of vendorUsers) {
      const existing = await Warehouse.countDocuments({
        vendor: vu.user._id,
      });

      if (existing === 0) {
        await Warehouse.create({
          name: {
            en: `${
              vu.vendor.storeName?.en || 'Main'
            } Warehouse`,
            ar: 'المستودع الرئيسي',
          },

          code: `WH-${
            vu.vendor.storeName?.en
              ?.substring(0, 3)
              .toUpperCase() || 'XXX'
          }-001`,

          vendor: vu.user._id,

          address: {
            city: 'Riyadh',
            country: 'Saudi Arabia',
            street: 'King Fahd Road',
          },

          capacity: {
            total: 5000,
            used: 1200,
            unit: 'sqm',
          },

          isActive: true,
        });
      }
    }

    console.log('Warehouses seeded');

    // =========================================================
    // 7. Notifications
    // =========================================================

    console.log('\n--- Seeding Notifications ---');

    for (const user of users) {
      const existing = await Notification.countDocuments({
        recipient: user._id,
      });

      if (existing === 0) {
        const notifs = [
          {
            type: 'system_announcement',

            title: {
              en: 'Welcome to B2B Market!',
              ar: 'مرحباً بك في سوق B2B!',
            },

            body: {
              en: 'Explore the platform and connect with verified suppliers.',
              ar: 'استكشف المنصة وتواصل مع الموردين الموثقين.',
            },

            priority: 'medium',
            link: '/dashboard',
          },

          {
            type: 'order_placed',

            title: {
              en: 'Order #1001 placed successfully',
              ar: 'تم تقديم الطلب #1001 بنجاح',
            },

            body: {
              en: 'Your order has been received and is being processed.',
              ar: 'تم استلام الطلب وهو قيد المعالجة.',
            },

            priority: 'medium',
            link: '/orders',
          },

          {
            type: 'message_received',

            title: {
              en: 'New message from a supplier',
              ar: 'رسالة جديدة من مورد',
            },

            body: {
              en: 'A supplier has responded to your RFQ inquiry.',
              ar: 'قام مورد بالرد على استفسار طلب السعر الخاص بك.',
            },

            priority: 'low',
            link: '/chat',
          },
        ];

        for (const n of notifs) {
          await Notification.create({
            ...n,
            recipient: user._id,
            channels: ['in_app'],
          });
        }
      }
    }

    console.log('Notifications seeded');

    // =========================================================
    // 8. Tenders
    // =========================================================

    console.log('\n--- Seeding Tenders ---');

    const tenderCount = await Tender.countDocuments({});

    if (tenderCount === 0 && buyer) {
      const cat1 = await Category.findOne({});

      await Tender.create({
        buyer: buyer._id,
        category: cat1?._id,

        title: {
          en: 'Supply of 5000 units of LED Panels',
          ar: 'توريد 5000 وحدة من ألواح LED',
        },

        description: {
          en: 'Looking for a reliable supplier of high-quality LED panels for a commercial project.',
          ar: 'نبحث عن مورد موثوق لألواح LED عالية الجودة لمشروعنا التجاري.',
        },

        quantity: 5000,
        unit: 'units',

        budget: {
          min: 50000,
          max: 75000,
        },

        deadline: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ),

        status: 'open',
      });

      await Tender.create({
        buyer: buyer._id,
        category: cat1?._id,

        title: {
          en: 'Annual IT Equipment Maintenance Contract',
          ar: 'عقد صيانة سنوي لمعدات تقنية المعلومات',
        },

        description: {
          en: 'Seeking proposals for annual maintenance of server infrastructure.',
          ar: 'نطلب عروضاً للصيانة السنوية للبنية التحتية للخوادم.',
        },

        quantity: 1,
        unit: 'contract',

        budget: {
          min: 20000,
          max: 40000,
        },

        deadline: new Date(
          Date.now() + 45 * 24 * 60 * 60 * 1000
        ),

        status: 'open',
      });

      console.log('Tenders created');
    } else {
      console.log('Tenders already exist');
    }

    // =========================================================
    // 9. Buying Requests
    // =========================================================

    console.log('\n--- Seeding Buying Requests ---');

    const brCount = await BuyingRequest.countDocuments({});

    if (brCount === 0 && buyer) {
      const cat1 = await Category.findOne({});

      await BuyingRequest.create({
        buyer: buyer._id,
        category: cat1?._id,

        title: {
          en: 'Looking for Organic Cotton Fabric',
          ar: 'أبحث عن قماش قطني عضوي',
        },

        description: {
          en: 'Need 2000 meters of organic cotton fabric for summer collection.',
          ar: 'أحتاج 2000 متر من القماش القطني العضوي لمجموعة الصيف.',
        },

        quantity: 2000,
        unit: 'meters',
        budget: 5000,
        status: 'open',
      });

      await BuyingRequest.create({
        buyer: buyer._id,
        category: cat1?._id,

        title: {
          en: 'Industrial Packaging Materials',
          ar: 'مواد تغليف صناعية',
        },

        description: {
          en: 'Looking for bulk packaging materials for our production line.',
          ar: 'أبحث عن مواد تغليف بالجملة لخط الإنتاج الخاص بنا.',
        },

        quantity: 10000,
        unit: 'pieces',
        budget: 15000,
        status: 'open',
      });

      console.log('Buying requests created');
    } else {
      console.log('Buying requests already exist');
    }

    // =========================================================
    // 10. RFQ Templates
    // =========================================================

    console.log('\n--- Seeding RFQ Templates ---');

    const rtCount = await RfqTemplate.countDocuments({});

    if (rtCount === 0 && buyer) {
      await RfqTemplate.create({
        user: buyer._id,
        name: 'Raw Materials Request',

        defaultTitle: {
          en: 'Request for Raw Materials',
          ar: 'طلب مواد خام',
        },

        defaultQuantity: 1000,
        defaultUnit: 'kg',
      });

      await RfqTemplate.create({
        user: buyer._id,
        name: 'Packaging Request',

        defaultTitle: {
          en: 'Request for Packaging Supplies',
          ar: 'طلب مستلزمات التعبئة',
        },

        defaultQuantity: 500,
        defaultUnit: 'boxes',
      });

      console.log('RFQ Templates created');
    } else {
      console.log('RFQ Templates already exist');
    }

    // =========================================================
    // 11. Platform Settings
    // =========================================================

    console.log('\n--- Seeding Platform Settings ---');

    const defaults = [
      {
        key: 'platform_name',
        value: 'B2B Market',
        type: 'string',

        label: {
          en: 'Platform Name',
          ar: 'اسم المنصة',
        },

        category: 'general',
        isPublic: true,
      },

      {
        key: 'support_email',
        value: 'support@b2bmarket.com',
        type: 'string',

        label: {
          en: 'Support Email',
          ar: 'بريد الدعم',
        },

        category: 'general',
      },

      {
        key: 'commission_rate',
        value: 5,
        type: 'number',

        label: {
          en: 'Default Commission Rate (%)',
          ar: 'نسبة العمولة الافتراضية (%)',
        },

        category: 'commission',
      },

      {
        key: 'currency',
        value: 'SAR',
        type: 'string',

        label: {
          en: 'Default Currency',
          ar: 'العملة الافتراضية',
        },

        category: 'localization',
        isPublic: true,
      },

      {
        key: 'max_file_upload_mb',
        value: 10,
        type: 'number',

        label: {
          en: 'Max File Upload (MB)',
          ar: 'الحد الأقصى لرفع الملفات',
        },

        category: 'general',
      },

      {
        key: 'new_registrations_open',
        value: true,
        type: 'boolean',

        label: {
          en: 'Allow New Registrations',
          ar: 'السماح بالتسجيلات الجديدة',
        },

        category: 'security',
      },

      {
        key: 'default_currency',
        value: 'SAR',
        type: 'string',

        label: {
          en: 'Default Currency',
          ar: 'العملة الافتراضية',
        },

        category: 'localization',
        isPublic: true,
      },

      {
        key: 'tax_percentage',
        value: 15,
        type: 'number',

        label: {
          en: 'Tax Percentage (%)',
          ar: 'نسبة الضريبة (%)',
        },

        category: 'financial',
      },

      {
        key: 'payment_gateway',
        value: 'stripe',
        type: 'string',

        label: {
          en: 'Payment Gateway',
          ar: 'بوابة الدفع',
        },

        category: 'payment',
      },
    ];

    for (const def of defaults) {
      await Setting.findOneAndUpdate(
        { key: def.key },
        { $setOnInsert: def },
        { upsert: true }
      );
    }

    console.log(`${defaults.length} settings seeded`);

    // =========================================================
    // 12. Countries
    // =========================================================

    console.log('\n--- Seeding Countries ---');

    const countryDefaults = [
      {
        code: 'SA',
        name: {
          en: 'Saudi Arabia',
          ar: 'المملكة العربية السعودية',
        },
        currency: {
          code: 'SAR',
          symbol: '﷼',
          name: 'Saudi Riyal',
        },
        phoneCode: '+966',
        isActive: true,
      },

      {
        code: 'AE',
        name: {
          en: 'United Arab Emirates',
          ar: 'الإمارات العربية المتحدة',
        },
        currency: {
          code: 'AED',
          symbol: 'د.إ',
          name: 'UAE Dirham',
        },
        phoneCode: '+971',
        isActive: true,
      },

      {
        code: 'KW',
        name: {
          en: 'Kuwait',
          ar: 'الكويت',
        },
        currency: {
          code: 'KWD',
          symbol: 'د.ك',
          name: 'Kuwaiti Dinar',
        },
        phoneCode: '+965',
        isActive: false,
      },

      {
        code: 'QA',
        name: {
          en: 'Qatar',
          ar: 'قطر',
        },
        currency: {
          code: 'QAR',
          symbol: 'ر.ق',
          name: 'Qatari Riyal',
        },
        phoneCode: '+974',
        isActive: false,
      },

      {
        code: 'EG',
        name: {
          en: 'Egypt',
          ar: 'مصر',
        },
        currency: {
          code: 'EGP',
          symbol: 'ج.م',
          name: 'Egyptian Pound',
        },
        phoneCode: '+20',
        isActive: false,
      },
    ];

    for (const c of countryDefaults) {
      await Country.findOneAndUpdate(
        { code: c.code },
        { $setOnInsert: c },
        { upsert: true }
      );
    }

    console.log(`${countryDefaults.length} countries seeded`);

    // =========================================================
    // 13. Ad Campaigns
    // =========================================================

    console.log('\n--- Seeding Ad Campaigns ---');

    const adCount = await AdCampaign.countDocuments({});

    if (
      adCount === 0 &&
      firstVendor &&
      products.length > 0
    ) {
      await AdCampaign.create({
        vendor: firstVendor._id,
        product: products[0]._id,

        title: 'Sponsored Electronics Showcase',

        placement: 'sponsored',

        budget: 1000,
        spent: 250,

        impressions: 15000,
        clicks: 320,

        status: 'active',

        startDate: new Date(
          Date.now() - 14 * 24 * 60 * 60 * 1000
        ),

        endDate: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000
        ),

        dailyBudget: 50,
      });

      await AdCampaign.create({
        vendor: firstVendor._id,

        product:
          products[1]?._id ||
          products[0]._id,

        title: 'Featured Products Banner',

        placement: 'banner',

        budget: 500,
        spent: 500,

        impressions: 25000,
        clicks: 180,

        status: 'ended',

        startDate: new Date(
          Date.now() - 60 * 24 * 60 * 60 * 1000
        ),

        endDate: new Date(
          Date.now() - 1 * 24 * 60 * 60 * 1000
        ),

        dailyBudget: 25,
      });

      console.log('Ad campaigns created');
    } else {
      console.log('Ad campaigns already exist');
    }

    // =========================================================
    // 14. CRM Contacts
    // =========================================================

    console.log('\n--- Seeding CRM Contacts ---');

    const crmCount = await CrmContact.countDocuments({});

    if (crmCount === 0 && firstVendor) {
      const buyers = users.filter(
        (u) =>
          u.role === 'buyer' ||
          u.email?.includes('buyer')
      );

      for (const b of buyers) {
        await CrmContact.create({
          vendor: firstVendor._id,
          buyer: b._id,

          company: `${
            b.name?.en ||
            b.name ||
            'Buyer'
          }'s Company`,

          email: b.email,
          phone: '+966512345678',

          tags: [
            'wholesale',
            'active',
          ],

          status: 'active',

          interactions: [
            {
              type: 'rfq',
              description:
                'Requested quote for LED panels',
              date: new Date(
                Date.now() -
                  10 *
                    24 *
                    60 *
                    60 *
                    1000
              ),
            },

            {
              type: 'message',
              description:
                'Discussed bulk pricing',
              date: new Date(
                Date.now() -
                  5 *
                    24 *
                    60 *
                    60 *
                    1000
              ),
            },
          ],
        });
      }

      if (secondVendor) {
        await CrmContact.create({
          vendor: secondVendor._id,

          buyer: users[0]._id,

          company: 'Alfa Imports LLC',

          email: users[0].email,

          phone: '+971501234567',

          tags: [
            'textile',
            'lead',
          ],

          status: 'lead',

          interactions: [
            {
              type: 'email',
              description:
                'Sent introductory email about fabric collection',
              date: new Date(
                Date.now() -
                  3 *
                    24 *
                    60 *
                    60 *
                    1000
              ),
            },
          ],
        });
      }

      console.log('CRM contacts created');
    } else {
      console.log('CRM contacts already exist');
    }

    // =========================================================
    // 15. Procurement Requests & Purchase Orders
    // =========================================================

    console.log(
      '\n--- Seeding Procurement Requests ---'
    );

    const prCount =
      await ProcurementRequest.countDocuments({});

    if (prCount === 0 && buyer) {
      await ProcurementRequest.create({
        buyer: buyer._id,

        title: 'Office Renovation Supplies',

        description:
          'Materials needed for H2 office renovation project',

        department: 'PROC',

        items: [
          {
            description: 'LED Office Panels',
            quantity: 200,
            unit: 'units',
            estimatedPrice: 15000,
            category: 'Electronics',

            requiredDate: new Date(
              Date.now() +
                60 *
                  24 *
                  60 *
                  60 *
                  1000
            ),
          },

          {
            description: 'Ergonomic Chairs',
            quantity: 50,
            unit: 'units',
            estimatedPrice: 25000,
            category: 'Furniture',

            requiredDate: new Date(
              Date.now() +
                45 *
                  24 *
                  60 *
                  60 *
                  1000
            ),
          },
        ],

        estimatedBudget: 40000,

        status: 'pending_approval',

        priority: 'medium',

        approvals: admin
          ? [
              {
                approvedBy: admin._id,
                status: 'approved',
                comment:
                  'Approved for Q3 budget',
                date: new Date(),
              },
            ]
          : [],
      });

      await ProcurementRequest.create({
        buyer: buyer._id,

        title: 'Raw Materials - Q4 Production',

        description:
          'Bulk raw materials for Q4 manufacturing run',

        department: 'OPS',

        items: [
          {
            description: 'Steel Sheets 2mm',
            quantity: 1000,
            unit: 'sqm',
            estimatedPrice: 50000,
            category: 'Raw Materials',

            requiredDate: new Date(
              Date.now() +
                30 *
                  24 *
                  60 *
                  60 *
                  1000
            ),
          },

          {
            description: 'Aluminum Profiles',
            quantity: 500,
            unit: 'meters',
            estimatedPrice: 30000,
            category: 'Raw Materials',

            requiredDate: new Date(
              Date.now() +
                30 *
                  24 *
                  60 *
                  60 *
                  1000
            ),
          },
        ],

        estimatedBudget: 80000,

        status: 'draft',

        priority: 'high',
      });

      console.log('Procurement requests created');
    } else {
      console.log(
        'Procurement requests already exist'
      );
    }

    // Purchase Orders
    console.log('\n--- Seeding Purchase Orders ---');

    const poCount =
      await PurchaseOrder.countDocuments({});

    if (
      poCount === 0 &&
      buyer &&
      firstVendor
    ) {
      await PurchaseOrder.create({
        buyer: buyer._id,
        vendor: firstVendor._id,

        poNumber: 'PO-2024-001',

        title:
          'Initial Electronics Stock Order',

        items: [
          {
            description:
              'Wireless Headphones',
            quantity: 100,
            unit: 'units',
            unitPrice: 45,
            totalPrice: 4500,
          },

          {
            description:
              'USB-C Cables',
            quantity: 500,
            unit: 'units',
            unitPrice: 3,
            totalPrice: 1500,
          },
        ],

        subtotal: 6000,
        tax: 900,
        shipping: 200,

        totalAmount: 7100,

        status: 'delivered',

        paymentTerms: 'Net 30',

        deliveryAddress:
          'Warehouse A, Riyadh Industrial Zone',

        expectedDelivery: new Date(
          Date.now() -
            15 *
              24 *
              60 *
              60 *
              1000
        ),
      });

      await PurchaseOrder.create({
        buyer: buyer._id,
        vendor: firstVendor._id,

        poNumber: 'PO-2024-002',

        title:
          'Q4 Electronics Replenishment',

        items: [
          {
            description:
              'Smart LED Bulbs',
            quantity: 200,
            unit: 'units',
            unitPrice: 12,
            totalPrice: 2400,
          },

          {
            description:
              'Bluetooth Speakers',
            quantity: 50,
            unit: 'units',
            unitPrice: 35,
            totalPrice: 1750,
          },
        ],

        subtotal: 4150,
        tax: 622.5,
        shipping: 150,

        totalAmount: 4922.5,

        status: 'sent',

        paymentTerms: 'Net 15',

        deliveryAddress:
          'Warehouse A, Riyadh Industrial Zone',

        expectedDelivery: new Date(
          Date.now() +
            10 *
              24 *
              60 *
              60 *
              1000
        ),
      });

      console.log('Purchase orders created');
    } else {
      console.log(
        'Purchase orders already exist'
      );
    }

    // =========================================================
    // 16. Escrow Orders
    // =========================================================

    console.log('\n--- Seeding Escrow Orders ---');

    const escrowCount =
      await EscrowOrder.countDocuments({});

    if (
      escrowCount === 0 &&
      buyer &&
      firstVendor &&
      products.length > 0
    ) {
      const order =
        await EscrowOrder.create({
          buyer: buyer._id,

          vendor: firstVendor._id,

          items: [
            {
              product: products[0]._id,

              name: {
                en:
                  products[0].name?.en ||
                  'Product',
              },

              quantity: 10,
              unitPrice: 50,
              totalPrice: 500,
            },

            {
              product:
                products[1]?._id ||
                products[0]._id,

              name: {
                en:
                  products[1]?.name?.en ||
                  'Product 2',
              },

              quantity: 5,
              unitPrice: 100,
              totalPrice: 500,
            },
          ],

          totalAmount: 1000,

          currency: 'USD',

          status: 'in_escrow',

          paymentMethod: 'credit_card',

          escrowReleasedAt: null,

          autoReleaseDate: new Date(
            Date.now() +
              14 *
                24 *
                60 *
                60 *
                1000
          ),
        });

      // Create payment for this order
      await Payment.create({
        order: order._id,

        buyer: buyer._id,

        amount: 1000,

        method: 'credit_card',

        status: 'completed',

        gatewayRef:
          'pi_demo_' + Date.now(),
      });

      // Create wallet and transaction
      let wallet = await Wallet.findOne({
        user:
          firstVendor.user ||
          firstVendor._id,
      });

      if (!wallet) {
        wallet = await Wallet.create({
          user:
            firstVendor.user ||
            firstVendor._id,

          availableBalance: 850,

          pendingBalance: 1000,
        });
      }

      await Transaction.create({
        wallet: wallet._id,

        user:
          firstVendor.user ||
          firstVendor._id,

        type: 'escrow_hold',

        amount: 1000,

        balance:
          wallet.availableBalance,

        reference:
          order.orderNumber,

        description:
          `Escrow hold for order ${order.orderNumber}`,
      });

      console.log(
        'Escrow order, payment, wallet & transaction created'
      );
    } else {
      console.log(
        'Escrow orders already exist'
      );
    }

    // =========================================================
    // 17. Subscriptions
    // =========================================================

    console.log('\n--- Seeding Subscriptions ---');

    const subCount =
      await Subscription.countDocuments({});

    if (subCount === 0) {
      const subData = [];

      for (const vu of vendorUsers) {
        subData.push({
          userId: vu.user._id,

          planType: 'growth',

          status: 'active',

          startDate: new Date(
            Date.now() -
              90 *
                24 *
                60 *
                60 *
                1000
          ),

          endDate: new Date(
            Date.now() +
              275 *
                24 *
                60 *
                60 *
                1000
          ),

          commissionRate: 5,

          features: {
            maxProducts: 500,
            analytics: true,
            apiAccess: true,
            support: 'priority',
          },

          autoRenew: true,
        });
      }

      if (subData.length > 0) {
        await Subscription.insertMany(
          subData
        );

        console.log(
          `${subData.length} subscriptions created`
        );
      }
    } else {
      console.log(
        'Subscriptions already exist'
      );
    }

    // =========================================================
    // 18. Withdrawal Requests
    // =========================================================

    console.log(
      '\n--- Seeding Withdrawal Requests ---'
    );

    const wdCount =
      await WithdrawalRequest.countDocuments({});

    if (
      wdCount === 0 &&
      firstVendorUser
    ) {
      await WithdrawalRequest.create({
        user: firstVendorUser._id,

        amount: 500,

        status: 'completed',

        bankDetails: {
          bankName: 'Al Rajhi Bank',
          accountNumber:
            'SA1234567890',
          iban:
            'SA0380000000123456789012',
          swiftCode: 'RJHISARI',
        },

        processedAt: new Date(
          Date.now() -
            5 *
              24 *
              60 *
              60 *
              1000
        ),
      });

      await WithdrawalRequest.create({
        user: firstVendorUser._id,

        amount: 1200,

        status: 'pending',

        bankDetails: {
          bankName: 'Al Rajhi Bank',
          accountNumber:
            'SA1234567890',
          iban:
            'SA0380000000123456789012',
          swiftCode: 'RJHISARI',
        },
      });

      console.log(
        'Withdrawal requests created'
      );
    } else {
      console.log(
        'Withdrawal requests already exist'
      );
    }

    // =========================================================
    // 19. Disputes
    // =========================================================

    console.log('\n--- Seeding Disputes ---');

    const disputeCount =
      await Dispute.countDocuments({});

    if (
      disputeCount === 0 &&
      buyer &&
      firstVendor
    ) {
      const lastOrder =
        await EscrowOrder.findOne({});

      if (lastOrder) {
        await Dispute.create({
          order: lastOrder._id,

          buyer: buyer._id,

          vendor: firstVendor._id,

          reason:
            'Item not as described',

          description:
            'Received 50 units with visible damage to packaging and some items were incorrect.',

          status: 'under_review',

          evidence: [
            {
              type: 'image',

              url:
                'https://placehold.co/400x300?text=Damage+Photo+1',

              note:
                'Damaged packaging on arrival',

              uploadedBy: buyer._id,
            },

            {
              type: 'note',

              note:
                'Items do not match PO specifications - ordered XL size but received L size',

              uploadedBy: buyer._id,
            },
          ],
        });

        console.log('Dispute created');
      }
    } else {
      console.log(
        'Disputes already exist'
      );
    }

    // =========================================================
    // 20. Announcements
    // =========================================================

    console.log('\n--- Seeding Announcements ---');

    const annCount =
      await Announcement.countDocuments({});

    if (
      annCount === 0 &&
      buyer
    ) {
      const cat1 =
        await Category.findOne({});

      await Announcement.create({
        buyer: buyer._id,

        category: cat1?._id,

        title: {
          en:
            'Bulk Order: Industrial Safety Equipment',

          ar:
            'طلب بالجملة: معدات السلامة الصناعية',
        },

        description: {
          en:
            'We need a long-term supplier for safety helmets, vests, and gloves.',

          ar:
            'نحتاج مورد طويل الأمد للخوذات وسترات السلامة والقفازات.',
        },

        quantity: 10000,

        unit: 'units',

        budget: {
          min: 50000,
          max: 80000,
        },

        deadline: new Date(
          Date.now() +
            21 *
              24 *
              60 *
              60 *
              1000
        ),
      });

      await Announcement.create({
        buyer: buyer._id,

        category: cat1?._id,

        title: {
          en:
            'Office Furniture - 100 Workstations',

          ar:
            'أثاث مكتبي - 100 محطة عمل',
        },

        description: {
          en:
            'Looking for a supplier of modern ergonomic office furniture for our new HQ.',

          ar:
            'نبحث عن مورد لأثاث مكتبي مريح حديث للمقر الجديد.',
        },

        quantity: 100,

        unit: 'sets',

        budget: {
          min: 150000,
          max: 200000,
        },

        deadline: new Date(
          Date.now() +
            45 *
              24 *
              60 *
              60 *
              1000
        ),
      });

      console.log(
        'Announcements created'
      );
    } else {
      console.log(
        'Announcements already exist'
      );
    }

    // =========================================================
    // 21. Chat & Messages
    // =========================================================

    console.log(
      '\n--- Seeding Chat & Messages ---'
    );

    const chatCount =
      await Chat.countDocuments({});

    if (
      chatCount === 0 &&
      buyer &&
      firstVendor &&
      firstVendorUser
    ) {
      const chat =
        await Chat.create({
          participants: [
            buyer._id,
            firstVendorUser._id,
          ],

          vendor:
            firstVendor._id,
        });

      await Message.create({
        chat: chat._id,

        sender:
          firstVendorUser._id,

        content:
          'Hello! Thank you for your interest in our products. How can I help you today?',

        isRead: true,
      });

      await Message.create({
        chat: chat._id,

        sender:
          buyer._id,

        content:
          'Hi, I was looking at your LED panel catalog. Do you offer bulk discounts for 1000+ units?',

        isRead: true,
      });

      await Message.create({
        chat: chat._id,

        sender:
          firstVendorUser._id,

        content:
          'Yes, we offer 15% discount for orders above 1000 units. I can send you a detailed quote.',

        isRead: false,
      });

      const lastMessage =
        await Message.findOne({
          chat: chat._id,
        }).sort({
          createdAt: -1,
        });

      if (lastMessage) {
        chat.lastMessage =
          lastMessage._id;

        await chat.save();
      }

      console.log(
        'Chat & messages created'
      );
    } else {
      console.log(
        'Chat already exist'
      );
    }

    // =========================================================
    // 22. Reviews
    // =========================================================

    console.log('\n--- Seeding Reviews ---');

    const reviewCount =
      await Review.countDocuments({});

    if (
      reviewCount === 0 &&
      buyer &&
      products.length > 0
    ) {
      await Review.create({
        user: buyer._id,

        product:
          products[0]._id,

        rating: 4,

        comment:
          'Good quality product, fast shipping. Packaging could be improved.',

        isApproved: true,

        vendorReply: {
          comment:
            'Thank you for your feedback! We will improve our packaging.',

          createdAt: new Date(),
        },
      });

      if (products.length > 1) {
        await Review.create({
          user: buyer._id,

          product:
            products[1]._id,

          rating: 5,

          comment:
            'Excellent product! Exceeded our expectations. Will order again.',

          isApproved: true,
        });
      }

      const staffUser =
        users.find(
          (u) => u.role === 'staff'
        );

      if (staffUser) {
        await Review.create({
          user: staffUser._id,

          product:
            products[0]._id,

          rating: 3,

          comment:
            'Average performance for the price. Works as described.',

          isApproved: false,
        });
      }

      console.log('Reviews created');
    } else {
      console.log(
        'Reviews already exist'
      );
    }

    // =========================================================
    // 23. Wishlists
    // =========================================================

    // 23. Wishlists
console.log('\n--- Seeding Wishlists ---');

const wlCount = await Wishlist.countDocuments({});

if (wlCount === 0 && buyer && products.length > 0) {
  for (const p of products) {
    if (!p?._id) continue;

    await Wishlist.create({
      user: buyer._id,
      product: p._id,
    });
  }

  if (admin && products[0]?._id) {
    await Wishlist.create({
      user: admin._id,
      product: products[0]._id,
    });
  }

  console.log(`Wishlists created: ${products.length + (admin ? 1 : 0)}`);
} else {
  console.log('Wishlists already exist');
}

    // =========================================================
    // 24. Support Tickets
    // =========================================================

    console.log(
      '\n--- Seeding Support Tickets ---'
    );

    const supportCount =
      await Support.countDocuments({});

    if (
      supportCount === 0 &&
      buyer &&
      products.length > 0
    ) {
      const ticket =
        await Support.create({
          user: buyer._id,

          product:
            products[0]._id,

          subject:
            'Defective product received',

          message: [
            {
              user: buyer._id,

              message:
                'I received a defective unit in my last order. The device does not power on.',
            },
          ],

          status: 'in_progress',

          priority: 'medium',

          category: 'product_quality',
        });

      if (admin) {
        ticket.message.push({
          user: admin._id,

          message:
            'We apologize for the inconvenience. Please provide your order number and we will process a replacement immediately.',
        });

        ticket.assignedTo =
          admin._id;

        ticket.assignedBy =
          admin._id;

        await ticket.save();
      }

      await Support.create({
        user: buyer._id,

        product:
          products[0]._id,

        subject:
          'Shipping delay inquiry',

        message: [
          {
            user: buyer._id,

            message:
              'My order was supposed to arrive 3 days ago. Can you check the status?',
          },
        ],

        status: 'open',

        priority: 'medium',

        category: 'shipping',
      });

      console.log(
        'Support tickets created'
      );
    } else {
      console.log(
        'Support tickets already exist'
      );
    }

    // =========================================================
    // Completed
    // =========================================================

    console.log(
      '\n========================================'
    );

    console.log(
      'Enterprise demo data seeded successfully!'
    );

    console.log(
      '========================================'
    );

    console.log(
      'Demo data for all 20+ feature modules:'
    );

    console.log('  - Departments (5)');
    console.log(
      '  - Documents (licenses, contracts, policies)'
    );
    console.log(
      '  - Approval Workflows (procurement, verification)'
    );
    console.log(
      '  - Approval Requests (pending reviews)'
    );
    console.log(
      '  - Factory Profiles (scored supplier profiles)'
    );
    console.log(
      '  - Warehouses (per vendor)'
    );
    console.log(
      '  - Notifications (welcome, order, messages)'
    );
    console.log(
      '  - Tenders (2 open opportunities)'
    );
    console.log(
      '  - Buying Requests (2 open requests)'
    );
    console.log(
      '  - RFQ Templates (2 templates)'
    );
    console.log(
      '  - Platform Settings (9 defaults)'
    );
    console.log(
      '  - Countries (5 GCC/MENA countries)'
    );
    console.log(
      '  - Ad Campaigns (sponsored + banner)'
    );
    console.log(
      '  - CRM Contacts (buyer relationships)'
    );
    console.log(
      '  - Procurement Requests + Purchase Orders'
    );
    console.log(
      '  - Escrow Orders + Payments + Wallets + Transactions'
    );
    console.log(
      '  - Subscriptions (one per vendor)'
    );
    console.log(
      '  - Withdrawal Requests (completed + pending)'
    );
    console.log(
      '  - Disputes (under review)'
    );
    console.log(
      '  - Announcements (bulk buying requests)'
    );
    console.log(
      '  - Chat & Messages (sample conversation)'
    );
    console.log(
      '  - Reviews (approved + pending)'
    );
    console.log(
      '  - Wishlists (per user)'
    );
    console.log(
      '  - Support Tickets (in-progress + open)'
    );

    console.log(
      '\nRun: node src/scripts/seedEnterpriseDemo.js'
    );

    process.exit(0);
  } catch (error) {
    console.error(
      'Error seeding enterprise demo data:',
      error
    );

    process.exit(1);
  }
};

seedEnterprise();