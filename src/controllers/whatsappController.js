import expressAsyncHandler from 'express-async-handler';
import { Vendor } from '../models/vendorModel.js';
import { AppError } from '../middlewares/errorHandler.js';
import { sendWhatsApp, sendOrderNotification, sendShippingUpdate, sendNewMessageAlert, sendRfqNotification } from '../services/whatsappService.js';

export const getWhatsAppSettings = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id }).select('whatsapp');
  if (!vendor) throw new AppError('Vendor profile not found', 404);
  res.json({ status: true, data: vendor.whatsapp || { phone: '', notifications: { orders: true, shipping: true, messages: true, rfq: true } } });
});

export const updateWhatsAppSettings = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);
  vendor.whatsapp = { ...vendor.whatsapp, ...req.body };
  await vendor.save();
  res.json({ status: true, data: vendor.whatsapp });
});

export const sendTestMessage = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);
  if (!vendor.whatsapp?.phone) throw new AppError('No WhatsApp phone number configured', 400);

  const result = await sendWhatsApp(vendor.whatsapp.phone, '✅ This is a test message from B2B Marketplace. Your WhatsApp integration is working!');
  res.json({ status: true, data: result });
});

export const sendOrderNotificationCtrl = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);
  if (!vendor.whatsapp?.phone) throw new AppError('No WhatsApp phone number configured', 400);
  if (!vendor.whatsapp?.notifications?.orders) throw new AppError('Order notifications are disabled', 400);

  const { orderNumber, status } = req.body;
  const result = await sendOrderNotification(vendor.whatsapp.phone, orderNumber, status);
  res.json({ status: true, data: result });
});

export const sendShippingNotificationCtrl = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);
  if (!vendor.whatsapp?.phone) throw new AppError('No WhatsApp phone number configured', 400);
  if (!vendor.whatsapp?.notifications?.shipping) throw new AppError('Shipping notifications are disabled', 400);

  const { orderNumber, carrier, trackingNumber } = req.body;
  const result = await sendShippingUpdate(vendor.whatsapp.phone, orderNumber, carrier, trackingNumber);
  res.json({ status: true, data: result });
});
