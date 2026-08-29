import { Vendor } from '../models/vendorModel.js';

// Blocks vendors who are not verified from accessing certain routes
export function requireVendorVerification(req, res, next) {
  if (req.user?.role !== 'vendor') return next();

  Vendor.findOne({ user: req.user._id }).then((vendor) => {
    if (!vendor) {
      return res.status(403).json({
        status: false,
        message: 'Vendor profile not found. Please complete your registration.',
        code: 'NO_VENDOR_PROFILE',
      });
    }
    if (!vendor.isVerified || vendor.verificationStatus !== 'approved') {
      return res.status(403).json({
        status: false,
        message: 'Your account is not yet verified. Please complete the verification process before selling products.',
        code: 'VENDOR_NOT_VERIFIED',
        verificationUrl: '/vendor/verification',
      });
    }
    next();
  }).catch(next);
}

// Blocks vendors from buying/connecting with other vendors
export function restrictVendorToVendor(req, res, next) {
  if (req.user?.role === 'vendor') {
    // Check if the target of the request is also a vendor
    const targetUserId = req.params.userId || req.body.userId || req.query.userId;
    if (targetUserId) {
      Vendor.findOne({ user: targetUserId }).then((targetVendor) => {
        if (targetVendor) {
          return res.status(403).json({
            status: false,
            message: 'Vendors cannot initiate contact with other vendors.',
            code: 'VENDOR_TO_VENDOR_BLOCKED',
          });
        }
        next();
      }).catch(next);
      return;
    }
  }
  next();
}

// Blocks vendors from placing orders (buying)
export function restrictVendorBuying(req, res, next) {
  if (req.user?.role === 'vendor') {
    return res.status(403).json({
      status: false,
      message: 'Vendors cannot place orders. Use a buyer account to make purchases.',
      code: 'VENDOR_CANNOT_BUY',
    });
  }
  next();
}
