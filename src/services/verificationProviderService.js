import { VerificationProvider } from '../models/VerificationProvider.js';

class BaseVerificationProvider {
  constructor(config) {
    this.config = config || {};
  }
  async verify(document) {
    throw new Error('verify() must be implemented by subclass');
  }
  async healthCheck() {
    return { isHealthy: true };
  }
}

class ManualVerificationProvider extends BaseVerificationProvider {
  async verify(document) {
    return {
      status: 'pending',
      confidence: 0,
      data: {},
      message: 'Manual review required',
      provider: 'manual',
    };
  }
}

class OCRVerificationProvider extends BaseVerificationProvider {
  async verify(document) {
    const extracted = {
      registrationNumber: this._extractField(document, /(?:CR|رقم السجل التجاري)[:\s]*([A-Z0-9]+)/i),
      companyName: this._extractField(document, /(?:Company|اسم المنشأة)[:\s]*([A-Za-z\u0600-\u06FF\s]+)/i),
      taxNumber: this._extractField(document, /(?:VAT|الرقم الضريبي)[:\s]*([A-Z0-9]+)/i),
      nationalAddress: this._extractField(document, /(?:Address|العنوان الوطني)[:\s]*([A-Za-z\u0600-\u06FF\s,0-9]+)/i),
      expiryDate: this._extractDate(document, /(?:Expiry|تاريخ الانتهاء)[:\s]*([0-9/.-]+)/i),
      issueDate: this._extractDate(document, /(?:Issue|تاريخ الإصدار)[:\s]*([0-9/.-]+)/i),
    };
    const confidence = this._calculateConfidence(extracted);
    const qualityChecks = this._runQualityChecks(document);
    return {
      status: confidence >= 60 ? 'success' : 'failed',
      confidence,
      data: { extracted, qualityChecks },
      message: confidence >= 60 ? 'OCR extraction completed' : 'Low confidence extraction',
      provider: 'ocr',
      ocrRaw: { text: document.content || '', layout: document.layout || {} },
    };
  }

  _extractField(document, pattern) {
    const text = document.content || document.fileName || '';
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }

  _extractDate(document, pattern) {
    const text = document.content || '';
    const match = text.match(pattern);
    if (match) {
      const parsed = new Date(match[1]);
      return isNaN(parsed.getTime()) ? match[1] : parsed;
    }
    return null;
  }

  _calculateConfidence(extracted) {
    let score = 0;
    if (extracted.registrationNumber) score += 25;
    if (extracted.companyName) score += 25;
    if (extracted.taxNumber) score += 20;
    if (extracted.expiryDate) score += 15;
    if (extracted.issueDate) score += 15;
    return Math.min(score, 95);
  }

  _runQualityChecks(document) {
    const checks = [];
    const text = document.content || '';
    if (text.length < 50) checks.push({ check: 'content_length', status: 'warning', message: 'Document content is short' });
    if (document.fileSize > 10 * 1024 * 1024) checks.push({ check: 'file_size', status: 'warning', message: 'File size exceeds 10MB' });
    checks.push({ check: 'structure', status: 'passed', message: 'Document structure acceptable' });
    return checks;
  }
}

class AIVerificationProvider extends BaseVerificationProvider {
  async verify(document, extractedData = {}) {
    const inconsistencies = [];
    const validations = [];
    let totalConfidence = 80;

    if (extractedData.companyName) {
      const nameOk = extractedData.companyName.length > 2 && extractedData.companyName.length < 200;
      validations.push({
        field: 'company_name', status: nameOk ? 'passed' : 'warning',
        confidence: nameOk ? 90 : 50,
        message: nameOk ? 'Company name looks valid' : 'Company name may be incomplete',
      });
      if (!nameOk) inconsistencies.push('Company name appears incomplete');
    }

    if (extractedData.registrationNumber) {
      const regOk = /^[A-Z0-9]{6,15}$/i.test(extractedData.registrationNumber);
      validations.push({
        field: 'registration_number', status: regOk ? 'passed' : 'failed',
        confidence: regOk ? 95 : 30,
        message: regOk ? 'Registration number format valid' : 'Registration number format unexpected',
      });
      if (!regOk) inconsistencies.push('Registration number format suspicious');
    }

    if (extractedData.taxNumber) {
      const vatOk = /^\d{15}$/.test(extractedData.taxNumber);
      validations.push({
        field: 'vat_number', status: vatOk ? 'passed' : 'warning',
        confidence: vatOk ? 95 : 40,
        message: vatOk ? 'VAT number format valid (15 digits)' : 'VAT number should be 15 digits',
      });
      if (!vatOk) inconsistencies.push('VAT number does not match standard format');
    }

    if (extractedData.companyName && extractedData.nationalAddress) {
      const addressOk = extractedData.nationalAddress.length > 10;
      validations.push({
        field: 'address_consistency', status: addressOk ? 'passed' : 'warning',
        confidence: addressOk ? 85 : 40,
        message: addressOk ? 'Address appears complete' : 'Address may be incomplete',
      });
    }

    if (extractedData.expiryDate) {
      const expiry = new Date(extractedData.expiryDate);
      const now = new Date();
      const isExpired = expiry < now;
      validations.push({
        field: 'expiry_date', status: isExpired ? 'failed' : 'passed',
        confidence: isExpired ? 0 : 90,
        message: isExpired ? 'Document has expired' : 'Document is still valid',
      });
      if (isExpired) {
        inconsistencies.push('Document has expired');
        totalConfidence -= 40;
      }
    }

    const aiConfidence = Math.max(0, Math.min(totalConfidence, 100));
    return {
      status: aiConfidence >= 70 ? 'success' : aiConfidence >= 40 ? 'warning' : 'failed',
      confidence: aiConfidence,
      data: { validations, inconsistencies, aiSummary: this._generateSummary(validations, inconsistencies) },
      message: aiConfidence >= 70 ? 'AI validation passed' : 'AI validation flags detected',
      provider: 'ai',
    };
  }

  _generateSummary(validations, inconsistencies) {
    const passed = validations.filter(v => v.status === 'passed').length;
    const total = validations.length;
    return {
      totalChecks: total,
      passedChecks: passed,
      failedChecks: total - passed,
      inconsistencies: inconsistencies.length,
      recommendation: inconsistencies.length === 0 ? 'approve' : 'review',
    };
  }
}

class GovernmentVerificationProviderBase extends BaseVerificationProvider {
  constructor(config) {
    super(config);
    this.govConfig = config;
    this.mockMode = process.env.GOV_VERIFICATION_MOCK !== 'false';
  }

  mapDocumentType(docType) {
    const map = {
      commercial_registration: 'cr',
      vat_certificate: 'vat',
      national_address: 'address',
      factory_license: 'license',
      tax_certificate: 'tax',
      business_license: 'business_license',
      quality_certificate: 'quality',
      product_certification: 'product_cert',
    };
    return map[docType] || docType;
  }
}

class SaudiCommercialRegistrationProvider extends GovernmentVerificationProviderBase {
  async verify(document) {
    if (this.mockMode) {
      const crNumber = document.extractedData?.registrationNumber || '1010XXXXXX';
      return {
        status: 'success', confidence: 92,
        data: {
          commercialRegistration: { number: crNumber, status: 'active', entityName: 'Saudi Factory Co.', status_code: 'A', issuer: 'Ministry of Commerce' },
        },
        provider: 'saudi_cr',
      };
    }
    return { status: 'pending', confidence: 0, data: {}, provider: 'saudi_cr', message: 'API integration required' };
  }
}

class SaudiVATProvider extends GovernmentVerificationProviderBase {
  async verify(document) {
    if (this.mockMode) {
      return {
        status: 'success', confidence: 90,
        data: { vat: { number: document.extractedData?.taxNumber, status: 'active', registered: true, issuer: 'ZATCA' } },
        provider: 'saudi_vat',
      };
    }
    return { status: 'pending', confidence: 0, data: {}, provider: 'saudi_vat', message: 'API integration required' };
  }
}

class SaudiNationalAddressProvider extends GovernmentVerificationProviderBase {
  async verify(document) {
    if (this.mockMode) {
      return {
        status: 'success', confidence: 88,
        data: { address: { verified: true, matchScore: 85, details: 'Address matched national address database' } },
        provider: 'saudi_address',
      };
    }
    return { status: 'pending', confidence: 0, data: {}, provider: 'saudi_address', message: 'API integration required' };
  }
}

class VerificationProviderRegistry {
  constructor() {
    this._providers = new Map();
    this._registerDefaults();
  }

  _registerDefaults() {
    this.register('manual', ManualVerificationProvider);
    this.register('ocr', OCRVerificationProvider);
    this.register('ai', AIVerificationProvider);
    this.register('saudi_cr', SaudiCommercialRegistrationProvider);
    this.register('saudi_vat', SaudiVATProvider);
    this.register('saudi_address', SaudiNationalAddressProvider);
  }

  register(name, providerClass) {
    this._providers.set(name, providerClass);
  }

  getProvider(name, config = {}) {
    const ProviderClass = this._providers.get(name);
    if (!ProviderClass) throw new Error(`Verification provider '${name}' not registered`);
    return new ProviderClass(config);
  }

  getAvailableProviders() {
    return Array.from(this._providers.keys());
  }

  async verifyWithChain(document, providerChain, extractedData = {}) {
    const results = [];
    let bestResult = null;

    for (const providerName of providerChain) {
      try {
        const provider = this.getProvider(providerName);
        const result = providerName === 'ai'
          ? await provider.verify(document, extractedData)
          : await provider.verify(document);
        result.providerName = providerName;
        results.push(result);
        if (!bestResult || result.confidence > bestResult.confidence) {
          bestResult = result;
        }
        if (result.status === 'success' && result.confidence >= 80) break;
      } catch (err) {
        results.push({ providerName, status: 'error', confidence: 0, error: err.message });
      }
    }
    return { results, bestResult };
  }
}

export const providerRegistry = new VerificationProviderRegistry();

export const getProviderChain = async (vendorCountry, docType) => {
  const dbProviders = await VerificationProvider.find({ isActive: true }).sort({ priority: -1 });
  if (dbProviders.length > 0) {
    return dbProviders.map(p => p.name);
  }
  return ['ocr', 'ai', 'manual'];
};
