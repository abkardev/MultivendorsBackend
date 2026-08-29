import commerceIntelligenceService from './commerceIntelligenceService.js';

class ComparisonIntelligenceService {
  async enhanceComparison(comparisonData) {
    if (!comparisonData?.items || comparisonData.items.length < 2) {
      return { ...comparisonData, highlights: [], summary: 'Add at least 2 items to compare' };
    }

    const highlights = [];

    const intelResults = await Promise.all(
      comparisonData.items.map(async (item) => {
        const priceIntel = await commerceIntelligenceService.getPriceIntelligence(item._id).catch(() => null);
        return { item, priceIntel };
      })
    );

    const prices = intelResults.map(r => r.item.price || 0).filter(p => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const bestPriceItems = intelResults.filter(r => r.item.price === minPrice);
    if (bestPriceItems.length > 0) {
      highlights.push({ type: 'lowest_price', itemIds: bestPriceItems.map(r => r.item._id), label: 'Lowest Price' });
    }

    const labels = intelResults.map(r => r.priceIntel?.label).filter(Boolean);
    const bestLabels = ['Excellent Deal', 'Good Deal'];
    const bestDealItems = intelResults.filter(r => bestLabels.includes(r.priceIntel?.label));
    if (bestDealItems.length > 0) {
      highlights.push({ type: 'best_deal', itemIds: bestDealItems.map(r => r.item._id), label: 'Best Deal' });
    }

    let summary = '';
    if (highlights.length > 0) {
      const highlightLabels = highlights.map(h => h.label).join(', ');
      summary = `Analysis complete. Key highlights: ${highlightLabels}. `;
      if (minPrice > 0) {
        summary += `The lowest price is ${minPrice} SAR. `;
      }
    } else {
      summary = 'Comparison completed. No significant price or value differences detected.';
    }

    return { ...comparisonData, highlights, summary };
  }
}

export default new ComparisonIntelligenceService();
