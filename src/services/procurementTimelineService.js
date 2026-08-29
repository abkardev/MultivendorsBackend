class ProcurementTimelineService {
  generateTimeline(params = {}) {
    const { type = 'standard', urgency = 'normal', isInternational = false } = params;
    const multiplier = urgency === 'urgent' ? 0.5 : urgency === 'expedited' ? 0.75 : 1;
    
    const phases = [
      { name: 'Planning & Strategy', duration: 3, dependencies: [] },
      { name: 'Requirements Definition', duration: 2, dependencies: ['Planning & Strategy'] },
      { name: 'Supplier Identification', duration: 5, dependencies: ['Requirements Definition'] },
      { name: 'RFQ Creation & Publishing', duration: 2, dependencies: ['Supplier Identification'] },
      { name: 'Supplier Response Period', duration: 7, dependencies: ['RFQ Creation & Publishing'] },
      { name: 'Quotation Evaluation', duration: 3, dependencies: ['Supplier Response Period'] },
      { name: 'Supplier Shortlisting', duration: 2, dependencies: ['Quotation Evaluation'] },
      { name: 'Negotiation', duration: 5, dependencies: ['Supplier Shortlisting'] },
      { name: 'Internal Approval', duration: 3, dependencies: ['Negotiation'] },
      { name: 'Contract Award', duration: 1, dependencies: ['Internal Approval'] },
      { name: 'Payment Processing', duration: 3, dependencies: ['Contract Award'] },
      { name: 'Production/Manufacturing', duration: 15, dependencies: ['Payment Processing'] },
      { name: 'Quality Inspection', duration: 3, dependencies: ['Production/Manufacturing'] },
      { name: 'Packaging & Loading', duration: 2, dependencies: ['Quality Inspection'] },
      { name: 'Shipment', duration: isInternational ? 20 : 5, dependencies: ['Packaging & Loading'] },
      { name: 'Customs Clearance', duration: isInternational ? 5 : 1, dependencies: ['Shipment'] },
      { name: 'Delivery & Receiving', duration: 2, dependencies: ['Customs Clearance'] },
      { name: 'Inspection & Acceptance', duration: 2, dependencies: ['Delivery & Receiving'] },
      { name: 'Payment Release/Escrow', duration: 2, dependencies: ['Inspection & Acceptance'] },
    ];

    let currentDate = new Date();
    return phases.map(p => {
      const duration = Math.max(1, Math.round(p.duration * multiplier));
      const start = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + duration);
      return { ...p, duration, startDate: start, endDate: new Date(currentDate), status: 'pending' };
    });
  }

  getTotalDuration(timeline) {
    if (!timeline || timeline.length === 0) return 0;
    const first = new Date(timeline[0].startDate);
    const last = new Date(timeline[timeline.length - 1].endDate);
    return Math.round((last - first) / (1000 * 60 * 60 * 24));
  }
}

export default new ProcurementTimelineService();
