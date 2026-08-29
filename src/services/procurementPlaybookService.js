class ProcurementPlaybookService {
  constructor() {
    this.playbooks = this.initializePlaybooks();
  }

  initializePlaybooks() {
    return {
      emergency: {
        name: 'Emergency Procurement',
        description: 'Fast-track procurement for urgent requirements',
        supplierStrategy: 'Direct award to pre-qualified suppliers with highest availability',
        negotiationStrategy: 'Limited negotiation, focus on speed',
        shipmentStrategy: 'Premium air freight or express shipping',
        paymentStrategy: 'Advance payment to secure priority',
        escrowUsage: false,
        approvalFlow: 'Streamlined - single approval',
        riskMitigation: 'Accept higher cost for guaranteed delivery',
        timeline: 'Accelerated - 50% of standard timeline',
      },
      cost_optimization: {
        name: 'Cost Optimization',
        description: 'Minimize procurement costs through competitive bidding',
        supplierStrategy: 'Multi-supplier competition, focus on lowest total cost',
        negotiationStrategy: 'Aggressive negotiation, bulk discounts, long-term contracts',
        shipmentStrategy: 'Economy shipping, consolidate shipments',
        paymentStrategy: 'Extended payment terms, net-60 or net-90',
        escrowUsage: true,
        approvalFlow: 'Standard approval with cost-benefit analysis',
        riskMitigation: 'Higher risk tolerance for cost savings',
        timeline: 'Extended to maximize negotiation leverage',
      },
      strategic_sourcing: {
        name: 'Strategic Sourcing',
        description: 'Long-term supplier partnerships for critical categories',
        supplierStrategy: 'Strategic partnerships with top-tier suppliers',
        negotiationStrategy: 'Collaborative negotiation, win-win outcomes',
        shipmentStrategy: 'Reliable shipping with tracking, scheduled deliveries',
        paymentStrategy: 'Negotiated payment terms based on relationship',
        escrowUsage: true,
        approvalFlow: 'Executive approval with strategic justification',
        riskMitigation: 'Thorough due diligence, diversified sourcing',
        timeline: 'Standard timeline with quality gates',
      },
      government: {
        name: 'Government Procurement',
        description: 'Compliant procurement for government contracts',
        supplierStrategy: 'Pre-qualified government vendors, local preference',
        negotiationStrategy: 'Transparent, auditable negotiation process',
        shipmentStrategy: 'Secure shipping with documentation',
        paymentStrategy: 'Standard government payment terms',
        escrowUsage: true,
        approvalFlow: 'Multi-level government approval required',
        riskMitigation: 'Strict compliance monitoring',
        timeline: 'Extended for compliance reviews',
      },
      export_procurement: {
        name: 'Export Procurement',
        description: 'International procurement from export-ready suppliers',
        supplierStrategy: 'Export-experienced suppliers with international certifications',
        negotiationStrategy: 'Include incoterms, customs duties, international warranty',
        shipmentStrategy: 'Sea freight with cargo insurance',
        paymentStrategy: 'Letter of credit or escrow for payment security',
        escrowUsage: true,
        approvalFlow: 'Standard with international compliance check',
        riskMitigation: 'Currency risk hedging, quality inspections',
        timeline: 'Extended for shipping and customs clearance',
      },
      low_risk: {
        name: 'Low Risk Procurement',
        description: 'Minimum-risk procurement for critical supplies',
        supplierStrategy: 'Highest-rated suppliers with proven track record',
        negotiationStrategy: 'Conservative negotiation, focus on terms and warranties',
        shipmentStrategy: 'Insured shipping with real-time tracking',
        paymentStrategy: 'Escrow payments for all transactions',
        escrowUsage: true,
        approvalFlow: 'Thorough approval with risk assessment',
        riskMitigation: 'Maximum risk mitigation at every step',
        timeline: 'Standard with extra validation steps',
      },
      sustainable: {
        name: 'Sustainable Procurement (ESG)',
        description: 'Environmentally and socially responsible procurement',
        supplierStrategy: 'Suppliers with sustainability certifications and practices',
        negotiationStrategy: 'Include ESG criteria in evaluation',
        shipmentStrategy: 'Low-emission shipping options',
        paymentStrategy: 'Standard terms with ESG compliance milestones',
        escrowUsage: true,
        approvalFlow: 'Include ESG compliance review',
        riskMitigation: 'Supply chain sustainability audit',
        timeline: 'Extended for ESG verification',
      },
    };
  }

  getPlaybook(name) {
    return this.playbooks[name] || null;
  }

  getAllPlaybooks() {
    return Object.entries(this.playbooks).map(([key, value]) => ({ id: key, ...value }));
  }

  getRecommendedPlaybook(intent) {
    const lower = intent.toLowerCase();
    if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('immediate')) return 'emergency';
    if (lower.includes('cheap') || lower.includes('cost') || lower.includes('budget') || lower.includes('save')) return 'cost_optimization';
    if (lower.includes('strategic') || lower.includes('partnership') || lower.includes('long term')) return 'strategic_sourcing';
    if (lower.includes('government') || lower.includes('public') || lower.includes('tender')) return 'government';
    if (lower.includes('export') || lower.includes('international') || lower.includes('import')) return 'export_procurement';
    if (lower.includes('safe') || lower.includes('low risk') || lower.includes('secure')) return 'low_risk';
    if (lower.includes('green') || lower.includes('sustainable') || lower.includes('esg') || lower.includes('eco')) return 'sustainable';
    return 'cost_optimization';
  }
}

export default new ProcurementPlaybookService();
