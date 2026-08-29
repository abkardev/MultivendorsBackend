import { Product } from '../models/productModel.js';

/**
 * AI-powered product search.
 * Uses OpenAI (or any compatible) to interpret natural-language queries,
 * extract structured filters, then runs a MongoDB query.
 */

const AI_BASE = process.env.AI_SEARCH_BASE_URL || process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
const AI_KEY = process.env.OPENAI_API_KEY || process.env.LOVABLE_API_KEY;
const AI_MODEL = process.env.AI_SEARCH_MODEL || 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are a B2B product search assistant. Given a buyer's natural-language query,
extract structured filters as JSON. Return ONLY valid JSON, no prose.
Schema:
{
  "intent": "short human-readable summary of what the buyer is looking for",
  "keywords": ["array", "of", "search", "terms"],
  "filters": {
    "category": "optional category slug",
    "minPrice": null,
    "maxPrice": null,
    "currency": "USD",
    "country": "optional ISO country name",
    "minQuantity": null
  }
}`;

async function interpretQuery(query) {
  if (!AI_KEY) {
    // Fallback: dumb keyword extraction so the feature still works without AI key
    return {
      intent: `Search for "${query}"`,
      keywords: query.split(/\s+/).filter((w) => w.length > 2),
      filters: {},
    };
  }
  
  try {
    const resp = await fetch(`${AI_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
        temperature: 0.2,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error('AI search interpret error:', resp.status, t);
      return { intent: `Search for "${query}"`, keywords: query.split(/\s+/), filters: {} };
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('AI interpret exception:', error);
    return { intent: `Search for "${query}"`, keywords: query.split(/\s+/), filters: {} };
  }
}

// POST /api/search/ai  { query }
export const aiSearch = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ status: false, message: 'query string required' });
    }

    const interpreted = await interpretQuery(query);

    // Build mongo query
    const mongoQuery = {}; // Removed isActive: true as it might not be in the product model yet
    const keywords = (interpreted.keywords || []).filter(Boolean);
    
    if (keywords.length) {
      const regex = new RegExp(keywords.map(escapeRegex).join('|'), 'i');
      mongoQuery.$or = [
        { 'name.en': regex },
        { 'name.ar': regex },
        { 'description.en': regex },
        { 'description.ar': regex },
      ];
    }

    const f = interpreted.filters || {};
    // Adjusting to the actual Product model structure found in productModel.js
    // Product model uses variations which have prices. 
    // For simple search, we'll just search by name/description for now.
    // If we wanted to filter by price, we'd need a more complex aggregation.

    const products = await Product.find(mongoQuery)
      .populate('vendor', 'storeName slug')
      .limit(20)
      .lean();

    const results = products.map((p) => ({
      _id: p._id,
      name: p.name,
      vendor: p.vendor,
      // Fallback for price since it's in variations
      price: p.variations?.[0]?.price || 0,
      image: p.image?.[0],
      matchReason: keywords.length ? `Matches: ${keywords.slice(0, 3).join(', ')}` : undefined,
    }));

    res.json({ status: true, data: { interpreted, results } });
  } catch (err) {
    console.error('aiSearch error:', err);
    res.status(500).json({ status: false, message: err.message });
  }
};

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
