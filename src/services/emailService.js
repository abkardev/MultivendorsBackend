import nodemailer from 'nodemailer';
import { getLogger } from './logger.js';

const logger = getLogger('email');
const NODE_ENV = process.env.NODE_ENV || 'development';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
    return transporter;
  }

  const explicitlyDisabled = process.env.SMTP_ENABLED === 'false';
  if (NODE_ENV === 'production' && !explicitlyDisabled) {
    // Fail loudly: never silently drop or fake email delivery in production.
    throw new Error('SMTP is not configured. Set SMTP_HOST/SMTP_PORT (and SMTP_ENABLED=false only if email is intentionally off) before starting in production.');
  }

  logger.warn('SMTP not configured — using jsonTransport (dev/test only, email is not actually delivered)');
  transporter = nodemailer.createTransport({ jsonTransport: true });
  return transporter;
};

const TEMPLATES = {
  passwordReset: (name, resetUrl, expiresInMinutes, lang = 'en') => {
    const isAr = lang === 'ar';
    return {
      subject: isAr ? 'إعادة تعيين كلمة المرور' : 'Password Reset Request',
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}table{border-collapse:collapse}.container{max-width:600px;margin:0 auto;padding:40px 20px}.card{background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,.08)}.logo{text-align:center;margin-bottom:24px}h1{font-size:24px;color:#1a1a2e;margin:0 0 16px;text-align:${isAr?'right':'left'}}p{font-size:16px;color:#4a4a6a;line-height:1.6;margin:0 0 16px;text-align:${isAr?'right':'left'}}.btn{display:inline-block;background:#2563eb;color:#fff!important;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;margin:20px 0}.btn-wrap{text-align:center}.footer{text-align:center;margin-top:32px;font-size:13px;color:#888;line-height:1.6}.warning{background:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:8px;margin:20px 0;font-size:14px;color:#991b1b;text-align:${isAr?'right':'left'}}</style></head><body><div class="container"><div class="card"><div class="logo"><svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#2563eb"/><path d="M24 14a7 7 0 00-7 7v4h-2v14h18V25h-2v-4a7 7 0 00-7-7zm-5 11v-4a5 5 0 0110 0v4H19z" fill="#fff"/></svg></div><h1>${isAr?'إعادة تعيين كلمة المرور':'Reset Your Password'}</h1><p>${isAr?`مرحباً ${name}،`:`Hi ${name},`}</p><p>${isAr?'لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في مانوس.':'We received a request to reset the password for your Manus account.'}</p><div class="btn-wrap"><a href="${resetUrl}" class="btn">${isAr?'إعادة تعيين كلمة المرور':'Reset Password'}</a></div><p style="text-align:center;font-size:14px;color:#888">${isAr?`هذا الرابط صالح لمدة ${expiresInMinutes} دقيقة.`:`This link expires in ${expiresInMinutes} minutes.`}</p><p style="text-align:center;font-size:14px;color:#888">${isAr?'إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد الإلكتروني.':'If you did not request this reset, please ignore this email.'}</p><div class="warning"><strong>⚠ ${isAr?'تنبيه أمني':'Security Notice'}:</strong> ${isAr?'لا تشارك رابط إعادة تعيين كلمة المرور مع أي شخص. فريق مانوس لن يطلب منك كلمة مرورك أبداً.':'Never share your password reset link with anyone. Manus will never ask for your password.'}</div></div><div class="footer"><p>${isAr?'هذا بريد إلكتروني تلقائي، يرجى عدم الرد عليه.':'This is an automated email, please do not reply.'}</p><p>© ${new Date().getFullYear()} Manus — ${isAr?'منصة التجارة B2B':'B2B Marketplace'}</p><p>${isAr?'للاستفسار، تواصل معنا على support@manus.sa':'For support, contact us at support@manus.sa'}</p></div></div></body></html>`,
    };
  },

  passwordChanged: (name, lang = 'en') => {
    const isAr = lang === 'ar';
    return {
      subject: isAr ? 'تم تغيير كلمة المرور بنجاح' : 'Password Changed Successfully',
      html: `<html><body><div style="max-width:600px;margin:40px auto;padding:40px;background:#fff;border-radius:12px"><h1 style="color:#1a1a2e">${isAr?'تم تغيير كلمة المرور':'Password Changed'}</h1><p>${isAr?`مرحباً ${name}،`:`Hi ${name},`}</p><p>${isAr?'تم تغيير كلمة المرور لحسابك في مانوس بنجاح.':'Your Manus account password has been changed successfully.'}</p><p style="background:#f0fdf4;padding:16px;border-radius:8px;font-size:14px">✅ ${isAr?'إذا قمت بهذا التغيير، لا داعي للقلق.':'If you made this change, no further action is needed.'}</p><p>${isAr?'إذا لم تقم بتغيير كلمة المرور، يرجى الاتصال بفريق الدعم فوراً.':'If you did not make this change, please contact our support team immediately.'}</p><p style="color:#888;font-size:13px;text-align:center;margin-top:32px">${isAr?'فريق الأمان - مانوس':'Manus Security Team'}</p></div></body></html>`,
    };
  },

  twoFactorEnabled: (name, lang = 'en') => {
    const isAr = lang === 'ar';
    return {
      subject: isAr ? 'تم تفعيل التحقق بخطوتين' : 'Two-Factor Authentication Enabled',
      html: `<html><body><div style="max-width:600px;margin:40px auto;padding:40px;background:#fff;border-radius:12px"><h1 style="color:#1a1a2e">${isAr?'تم تفعيل التحقق بخطوتين':'2FA Enabled'}</h1><p>${isAr?`مرحباً ${name}،`:`Hi ${name},`}</p><p>${isAr?'تم تفعيل التحقق بخطوتين (2FA) لحسابك في مانوس بنجاح.':'Two-factor authentication has been enabled on your Manus account.'}</p><p style="background:#f0fdf4;padding:16px;border-radius:8px;font-size:14px">✅ ${isAr?'تمت إضافة طبقة حماية إضافية لحسابك.':'An extra layer of security has been added to your account.'}</p><p>${isAr?'إذا لم تقم بهذا التفعيل، يرجى الاتصال بفريق الدعم فوراً.':'If you did not enable this, please contact support immediately.'}</p></div></body></html>`,
    };
  },

  twoFactorDisabled: (name, lang = 'en') => {
    const isAr = lang === 'ar';
    return {
      subject: isAr ? 'تم إلغاء تفعيل التحقق بخطوتين' : 'Two-Factor Authentication Disabled',
      html: `<html><body><div style="max-width:600px;margin:40px auto;padding:40px;background:#fff;border-radius:12px"><h1 style="color:#1a1a2e">${isAr?'تم إلغاء تفعيل التحقق بخطوتين':'2FA Disabled'}</h1><p>${isAr?`مرحباً ${name}،`:`Hi ${name},`}</p><p>${isAr?'تم إلغاء تفعيل التحقق بخطوتين (2FA) لحسابك في مانوس.':'Two-factor authentication has been disabled on your Manus account.'}</p><p style="background:#fef2f2;padding:16px;border-radius:8px;font-size:14px">⚠ ${isAr?'حسابك الآن أقل أماناً. يوصى بتفعيل 2FA لحماية أفضل.':'Your account is now less secure. Enabling 2FA is recommended.'}</p></div></body></html>`,
    };
  },

  newDeviceLogin: (name, deviceName, browser, os, ipAddress, country, time, lang = 'en') => {
    const isAr = lang === 'ar';
    return {
      subject: isAr ? 'تسجيل دخول جديد من جهاز غير معروف' : 'New Device Login Detected',
      html: `<html><body><div style="max-width:600px;margin:40px auto;padding:40px;background:#fff;border-radius:12px"><h1 style="color:#1a1a2e">${isAr?'تسجيل دخول جديد':'New Device Login'}</h1><p>${isAr?`مرحباً ${name}،`:`Hi ${name},`}</p><p>${isAr?'تم تسجيل الدخول إلى حسابك من جهاز جديد:':'A new device has logged into your account:'}</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">${isAr?'الجهاز':'Device'}</td><td style="padding:8px;border-bottom:1px solid #eee">${deviceName||isAr?'غير معروف':'Unknown'}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">${isAr?'المتصفح':'Browser'}</td><td style="padding:8px;border-bottom:1px solid #eee">${browser||isAr?'غير معروف':'Unknown'}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">${isAr?'نظام التشغيل':'OS'}</td><td style="padding:8px;border-bottom:1px solid #eee">${os||isAr?'غير معروف':'Unknown'}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">IP</td><td style="padding:8px;border-bottom:1px solid #eee">${ipAddress||'-'}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">${isAr?'الدولة':'Country'}</td><td style="padding:8px;border-bottom:1px solid #eee">${country||'-'}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888">${isAr?'الوقت':'Time'}</td><td style="padding:8px;border-bottom:1px solid #eee">${time}</td></tr></table><p style="background:#fef2f2;padding:16px;border-radius:8px;font-size:14px">${isAr?'إذا لم يكن هذا أنت، يرجى تغيير كلمة المرور فوراً وتفعيل 2FA.':'If this wasn\'t you, please change your password immediately and enable 2FA.'}</p></div></body></html>`,
    };
  },

  recoveryCodesUsed: (name, remaining, lang = 'en') => {
    const isAr = lang === 'ar';
    return {
      subject: isAr ? 'تم استخدام رمز استرداد' : 'Recovery Code Used',
      html: `<html><body><div style="max-width:600px;margin:40px auto;padding:40px;background:#fff;border-radius:12px"><h1 style="color:#1a1a2e">${isAr?'تم استخدام رمز استرداد':'Recovery Code Used'}</h1><p>${isAr?`مرحباً ${name}،`:`Hi ${name},`}</p><p>${isAr?'تم استخدام أحد رموز الاسترداد الخاصة بحسابك.':'One of your recovery codes has been used.'}</p><p>${isAr?`الرموز المتبقية: ${remaining}`:`Remaining codes: ${remaining}`}</p><p style="background:#fef2f2;padding:16px;border-radius:8px;font-size:14px">⚠ ${isAr?'إذا لم تقم بذلك، فهذا يعني أن شخصاً آخر لديه حق الوصول إلى رموز الاسترداد الخاصة بك.':'If you did not do this, someone else may have access to your recovery codes.'}</p></div></body></html>`,
    };
  },
};

export const sendEmail = async ({ to, subject, html }) => {
  const t = getTransporter();
  try {
    const info = await t.sendMail({
      from: process.env.SMTP_FROM || `"Manus Security" <${process.env.SMTP_USER || 'security@manus.sa'}>`,
      to, subject, html,
    });
    if (info.messageId) logger.debug({ to, messageId: info.messageId }, 'Email sent');
    return info;
  } catch (err) {
    // Structured error + rethrow: callers must NOT report success to the user
    // when an email that must be delivered did not send.
    logger.error({ err, to, subject }, 'Email delivery failed');
    throw err;
  }
};

export const sendPasswordResetEmail = async (user, resetUrl, lang = 'en') => {
  const { subject, html } = TEMPLATES.passwordReset(user.name || user.email, resetUrl, 30, lang);
  return sendEmail({ to: user.email, subject, html });
};

export const sendPasswordChangedEmail = async (user, lang = 'en') => {
  const { subject, html } = TEMPLATES.passwordChanged(user.name || user.email, lang);
  return sendEmail({ to: user.email, subject, html });
};

export const sendTwoFactorEnabledEmail = async (user, lang = 'en') => {
  const { subject, html } = TEMPLATES.twoFactorEnabled(user.name || user.email, lang);
  return sendEmail({ to: user.email, subject, html });
};

export const sendTwoFactorDisabledEmail = async (user, lang = 'en') => {
  const { subject, html } = TEMPLATES.twoFactorDisabled(user.name || user.email, lang);
  return sendEmail({ to: user.email, subject, html });
};

export const sendNewDeviceLoginEmail = async (user, deviceInfo, lang = 'en') => {
  const { subject, html } = TEMPLATES.newDeviceLogin(
    user.name || user.email, deviceInfo.deviceName, deviceInfo.browser,
    deviceInfo.os, deviceInfo.ipAddress, deviceInfo.country,
    new Date().toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US'), lang,
  );
  return sendEmail({ to: user.email, subject, html });
};

export const sendRecoveryCodesUsedEmail = async (user, remaining, lang = 'en') => {
  const { subject, html } = TEMPLATES.recoveryCodesUsed(user.name || user.email, remaining, lang);
  return sendEmail({ to: user.email, subject, html });
};
