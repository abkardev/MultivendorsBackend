class AiRfqGeneratorService {
  generateRfq(params) {
    const {
      products = [],
      category = '',
      budget = 0,
      targetCountry = '',
      timeline = '',
      requirements = [],
      certifications = [],
      quantity = 0,
    } = params;

    const productNames = products.map(p => p.name || p).join(', ') || 'Products';
    
    const technicalRequirements = this.generateTechnicalRequirements(params);
    const commercialRequirements = this.generateCommercialRequirements(params);
    const evaluationCriteria = this.generateEvaluationCriteria(params);
    
    return {
      title: `Request for Quotation: ${productNames}`,
      description: `We are seeking qualified suppliers for ${productNames}. This procurement is part of our strategic sourcing initiative. ${category ? `Category: ${category}.` : ''} ${targetCountry ? `Target country: ${targetCountry}.` : ''}`,
      technicalRequirements,
      commercialRequirements,
      requiredDocuments: ['Company Profile', 'Commercial Registration', 'Product Catalog', 'Quality Certificates', 'Price List', 'Sample Availability', 'Delivery Track Record'],
      supplierQualifications: [
        `Minimum ${Math.max(2, Math.floor((certifications.length || 1) * 2))} years in relevant industry`,
        'Valid commercial registration',
        certifications.length > 0 ? `Required certifications: ${certifications.join(', ')}` : 'Relevant quality certifications preferred',
        targetCountry ? `Suppliers from ${targetCountry} preferred` : 'Open to international suppliers',
        budget > 0 ? `Budget range: ${budget.toLocaleString()} SAR` : 'Competitive pricing expected',
      ],
      deliveryRequirements: {
        timeline: timeline || '30-60 days from order confirmation',
        terms: targetCountry ? 'FOB or CIF' : 'EXW or DDP',
        packaging: 'Standard export packaging',
        documentation: 'Commercial invoice, packing list, certificate of origin',
      },
      paymentTerms: budget > 100000 ? 'Letter of Credit or Escrow' : '30% advance, 70% against documents',
      warrantyRequirements: 'Minimum 12 months warranty against manufacturing defects',
      complianceRequirements: certifications.length > 0 ? `Must comply with ${certifications.join(', ')} standards` : 'Must comply with applicable local and international standards',
      incoterms: targetCountry ? ['FOB', 'CIF', 'DDP'] : ['EXW', 'FCA'],
      negotiationNotes: budget > 50000 ? 'Volume pricing expected based on order value' : 'Competitive pricing expected',
      evaluationCriteria,
      generatedAt: new Date(),
    };
  }

  generateTechnicalRequirements(params) {
    const reqs = ['Product must meet specified quality standards', 'Samples must be provided for approval'];
    if (params.certifications.length > 0) {
      reqs.push(`Products must be ${params.certifications.join(' and ')} certified`);
    }
    if (params.quantity > 0) {
      reqs.push(`Minimum quantity: ${params.quantity} units`);
    }
    return reqs;
  }

  generateCommercialRequirements(params) {
    const reqs = ['Valid commercial registration', 'Tax registration certificate', 'Bank account details'];
    if (params.budget > 0) {
      reqs.push(`Quotation must not exceed ${params.budget.toLocaleString()} SAR`);
    }
    return reqs;
  }

  generateEvaluationCriteria(params) {
    const criteria = [
      { name: 'Price Competitiveness', weight: 30 },
      { name: 'Quality & Certifications', weight: 25 },
      { name: 'Delivery Timeline', weight: 20 },
      { name: 'Payment Terms', weight: 10 },
      { name: 'Supplier Reputation', weight: 10 },
      { name: 'After-Sales Support', weight: 5 },
    ];
    if (params.certifications.length > 0) {
      criteria.find(c => c.name === 'Quality & Certifications').weight = 35;
      criteria.find(c => c.name === 'Price Competitiveness').weight = 25;
    }
    return criteria;
  }
}

export default new AiRfqGeneratorService();
