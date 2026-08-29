const AI_PROVIDER = process.env.AI_PROVIDER || 'builtin';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT) || 30000;
const AI_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 1000;
const ANTHROPIC_VERSION = process.env.ANTHROPIC_VERSION || '2023-06-01';

function matchWord(query, word) {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return re.test(query);
}

function detectIntent(query) {
  const q = query.toLowerCase();
  if (matchWord(q, 'description') || matchWord(q, 'describe') || q.includes('generate description')) return 'generate_description';
  if (matchWord(q, 'optimize') || matchWord(q, 'improve') || q.includes('better listing')) return 'optimize_listing';
  if (matchWord(q, 'category') || matchWord(q, 'classify') || q.includes('what category')) return 'suggest_category';
  if (matchWord(q, 'price') || matchWord(q, 'pricing') || matchWord(q, 'cost') && !matchWord(q, 'shipping')) return 'pricing_advice';
  if (matchWord(q, 'keyword') || matchWord(q, 'seo') || matchWord(q, 'search') && !matchWord(q, 'rfq')) return 'keyword_suggestions';
  if (matchWord(q, 'trend') || matchWord(q, 'market') || matchWord(q, 'demand')) return 'market_insight';
  if (matchWord(q, 'competitor') || matchWord(q, 'competition')) return 'competitor_analysis';
  return 'general';
}

const builtinResponses = {
  generate_description: () => ({
    type: 'description',
    content: `Based on your product information, here's an optimized product description:\n\n**Product Highlights:**\n\u2022 Premium quality materials for durability and long-lasting performance\n\u2022 Designed to meet international standards and certifications\n\u2022 Suitable for B2B bulk orders with competitive pricing\n\u2022 Custom packaging and branding options available\n\n**Technical Specifications:**\n\u2022 Available in multiple variants to suit different requirements\n\u2022 Consistent quality across all production batches\n\u2022 Compliant with industry regulations and safety standards\n\n**Why Choose Us:**\n\u2022 Reliable supply chain with on-time delivery guarantee\n\u2022 Flexible MOQ to accommodate businesses of all sizes\n\u2022 Dedicated support team for post-purchase assistance`,
  }),
  optimize_listing: () => ({
    type: 'optimization',
    content: `Here are optimization suggestions for your product listing:\n\n**1. Title Optimization**\n\u2022 Start with the most important keyword\n\u2022 Include key specifications (material, size, color)\n\u2022 Keep under 80 characters\n\n**2. Description Improvements**\n\u2022 Add bullet points for quick scanning\n\u2022 Include specific measurements and specs\n\u2022 Mention certifications and standards\n\u2022 Add a clear call-to-action\n\n**3. Images**\n\u2022 Use high-resolution images (at least 1000x1000px)\n\u2022 Show product from multiple angles\n\u2022 Include a size reference or scale\n\n**4. Pricing**\n\u2022 Consider tiered pricing for bulk orders\n\u2022 Highlight any volume discounts\n\n**5. Category & Tags**\n\u2022 Use specific subcategories\n\u2022 Add relevant industry keywords as tags`,
  }),
  suggest_category: () => ({
    type: 'category',
    content: `Based on your product description, these categories would be most suitable:\n\n**Primary Category:**\n\u2022 Textiles & Fabrics / Electronics & Components / Machinery & Equipment / Food & Beverage / Chemicals & Raw Materials / Construction Materials\n\n**Subcategories to consider:**\n\u2022 Check existing subcategories in your primary category\n\u2022 Look at similar products and their categories\n\u2022 Consider both the product type and its industry use\n\n**Tags to add:**\n\u2022 Include material type, application, industry, and any certifications`,
  }),
  pricing_advice: () => ({
    type: 'pricing',
    content: `**Pricing Strategy Recommendations:**\n\n1. **Market Analysis**\n\u2022 Research competitor pricing for similar products\n\u2022 Consider your unique value proposition\n\u2022 Factor in production costs + logistics + margin\n\n2. **Tiered Pricing Structure**\n\u2022 Sample price (1-10 units): Premium\n\u2022 Small wholesale (11-100 units): Standard\n\u2022 Bulk wholesale (100+ units): Discounted\n\n3. **B2B Pricing Tips**\n\u2022 Always quote in USD for international buyers\n\u2022 Include Incoterms (FOB, CIF, EXW)\n\u2022 Offer volume-based discounts\n\u2022 Consider seasonal pricing adjustments\n\n4. **Competitive Positioning**\n\u2022 If you offer better quality, price 10-15% above market\n\u2022 If entering a new market, consider competitive pricing initially`,
  }),
  keyword_suggestions: () => ({
    type: 'keywords',
    content: `**Recommended Keywords for Your Product Listing:**\n\n**Primary Keywords (use in title):**\n\u2022 [Product name] manufacturer\n\u2022 Wholesale [product type]\n\u2022 Bulk [product category] supplier\n\u2022 [Product material] [product type]\n\n**Secondary Keywords (use in description):**\n\u2022 OEM/ODM [product type]\n\u2022 Factory price [product category]\n\u2022 Custom [product feature]\n\u2022 [Industry] grade [product type]\n\n**Long-tail Keywords:**\n\u2022 [Product type] for [specific industry]\n\u2022 [Quality] [product type] for export\n\u2022 [Product type] with [specific feature]\n\n**Tips:**\n\u2022 Use 5-7 primary keywords in your title and first paragraph\n\u2022 Sprinkle secondary keywords naturally throughout the description\n\u2022 Add all relevant keywords as product tags`,
  }),
  market_insight: () => ({
    type: 'market',
    content: `**Market Insights & Trends:**\n\n**Current Market Trends:**\n\u2022 Growing demand for sustainable and eco-friendly products\n\u2022 Increasing preference for direct manufacturer relationships\n\u2022 Shift towards digital procurement and automated sourcing\n\n**Regional Opportunities:**\n\u2022 Middle East: Strong demand for construction materials and food products\n\u2022 Southeast Asia: Growing manufacturing and industrial sectors\n\u2022 Africa: Infrastructure development driving material demand\n\u2022 Europe: Strict quality and sustainability standards\n\n**Seasonal Considerations:**\n\u2022 Plan inventory 2-3 months ahead of peak seasons\n\u2022 Monitor trade shows and industry events for trends\n\u2022 Follow import/export regulations in target markets`,
  }),
  competitor_analysis: () => ({
    type: 'competitor',
    content: `**Competitive Analysis Framework:**\n\n**1. Identify Key Competitors**\n\u2022 Search for similar products on the platform\n\u2022 Look at top-selling vendors in your category\n\u2022 Check their pricing, reviews, and response times\n\n**2. Differentiation Opportunities**\n\u2022 Better quality or certifications\n\u2022 Faster delivery times\n\u2022 Lower MOQ or more flexible terms\n\u2022 Superior customer service\n\u2022 Unique product features or variations\n\n**3. Competitive Advantages to Highlight**\n\u2022 Years of experience in the industry\n\u2022 Manufacturing capabilities and capacity\n\u2022 Quality control processes\n\u2022 Export experience and destination countries\n\u2022 Client testimonials or case studies`,
  }),
  general: () => ({
    type: 'general',
    content: `I'm your AI Product Assistant! I can help you with:\n\n\ud83d\udcdd **Generate Product Descriptions** \u2014 Create compelling, SEO-optimized descriptions\n\ud83d\udcc8 **Optimize Listings** \u2014 Improve your product visibility and conversion\n\ud83c\udff7\ufe0f **Suggest Categories** \u2014 Find the best categories and tags\n\ud83d\udcb0 **Pricing Advice** \u2014 Get pricing strategy recommendations\n\ud83d\udd0d **Keyword Suggestions** \u2014 Discover high-impact keywords for better search ranking\n\ud83d\udcca **Market Insights** \u2014 Stay informed about trends and opportunities\n\ud83c\udfe2 **Competitor Analysis** \u2014 Understand your competitive landscape\n\nTry asking me something like:\n\u2022 "Generate a description for cotton fabric"\n\u2022 "How can I optimize my listing?"\n\u2022 "What category should I use for packaging materials?"\n\u2022 "What's the right price for textile products?"`,
  }),
};

export async function processQuery(query, context = {}) {
  if (!query || typeof query !== 'string') {
    return { type: 'error', content: 'Please provide a valid query.' };
  }
  const trimmed = query.trim();
  if (trimmed.length > 2000) {
    return { type: 'error', content: 'Query is too long. Please keep it under 2000 characters.' };
  }
  const intent = detectIntent(trimmed);
  const responder = builtinResponses[intent] || builtinResponses.general;
  return responder();
}

async function fetchWithTimeout(url, options, timeoutMs = AI_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAI(query) {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful B2B product assistant for a marketplace platform. Help vendors optimize their product listings, generate descriptions, suggest categories, and provide market insights. Respond in a clear, structured format.' },
        { role: 'user', content: query },
      ],
      max_tokens: AI_MAX_TOKENS,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
  }
  const data = await response.json();
  return { type: 'llm', content: data.choices?.[0]?.message?.content || 'No response' };
}

async function callAnthropic(query) {
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system: 'You are a helpful B2B product assistant for a marketplace platform. Help vendors optimize their product listings, generate descriptions, suggest categories, and provide market insights. Respond in a clear, structured format.',
      messages: [{ role: 'user', content: query }],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic API error: ${response.status}`);
  }
  const data = await response.json();
  return { type: 'llm', content: data.content?.[0]?.text || 'No response' };
}

export async function processWithLLM(query, context = {}) {
  if (!query || typeof query !== 'string') {
    return { type: 'error', content: 'Please provide a valid query.' };
  }
  const trimmed = query.trim();
  if (trimmed.length > 2000) {
    return { type: 'error', content: 'Query is too long. Please keep it under 2000 characters.' };
  }

  if (AI_PROVIDER === 'openai' && OPENAI_API_KEY) {
    try {
      return await callOpenAI(trimmed);
    } catch (err) {
      return { type: 'error', content: `AI service error: ${err.message}` };
    }
  }

  if (AI_PROVIDER === 'anthropic' && ANTHROPIC_API_KEY) {
    try {
      return await callAnthropic(trimmed);
    } catch (err) {
      return { type: 'error', content: `AI service error: ${err.message}` };
    }
  }

  return processQuery(trimmed, context);
}

function detectRfqIntent(query) {
  const q = query.toLowerCase();
  if (matchWord(q, 'analyze') || matchWord(q, 'review') || matchWord(q, 'evaluate') || matchWord(q, 'assessment')) return 'analyze_rfq';
  if (matchWord(q, 'response') || matchWord(q, 'reply') || matchWord(q, 'respond') || matchWord(q, 'answer')) return 'craft_response';
  if (matchWord(q, 'price') || matchWord(q, 'quote') || matchWord(q, 'cost')) return 'rfq_pricing';
  if (matchWord(q, 'create') || matchWord(q, 'write') || matchWord(q, 'post') || q.includes('new rfq')) return 'create_rfq';
  if (matchWord(q, 'win') || matchWord(q, 'competitive') || q.includes('stand out') || matchWord(q, 'edge')) return 'win_strategy';
  if (matchWord(q, 'question') || q.includes('what to ask') || matchWord(q, 'clarify')) return 'questions_to_ask';
  return 'rfq_general';
}

const rfqResponses = {
  analyze_rfq: () => ({
    type: 'rfq_analysis',
    content: `**RFQ Analysis Results:**\n\n**1. Requirements Summary**\n\u2022 Review the quantity, specifications, and delivery timeline\n\u2022 Check if your product/service meets the technical requirements\n\u2022 Verify any certifications or standards required\n\n**2. Opportunity Assessment**\n\u2022 Budget range: Evaluate if pricing within your target margin\n\u2022 Timeline: Assess if you can meet the delivery deadline\n\u2022 Competition: Number of responses expected (typically 3-10)\n\n**3. Risk Factors**\n\u2022 Payment terms and Incoterms requirements\n\u2022 Quality assurance expectations\n\u2022 Potential logistics challenges\n\n**4. Recommendation**\nBased on the analysis, this RFQ appears to be a [strong/moderate/weak] opportunity for your business. Consider your current capacity and strategic fit before proceeding.`,
  }),
  craft_response: () => ({
    type: 'rfq_response',
    content: `**Tips for Crafting a Winning RFQ Response:**\n\n**1. Structure Your Response**\n\u2022 Start with a brief introduction of your company\n\u2022 Address each requirement point by point\n\u2022 Include relevant experience and case studies\n\u2022 End with clear next steps\n\n**2. Pricing Section**\n\u2022 Provide a clear, itemized price breakdown\n\u2022 Specify Incoterms (FOB, CIF, EXW)\n\u2022 Include volume discounts if applicable\n\u2022 Mention payment terms (LC, TT, etc.)\n\n**3. Technical Proposal**\n\u2022 Describe how your product meets specifications\n\u2022 Include relevant certificates and test reports\n\u2022 Mention quality control processes\n\u2022 Provide samples if applicable\n\n**4. Timeline**\n\u2022 Production lead time\n\u2022 Shipping duration\n\u2022 Installation/implementation timeline (if applicable)\n\n**Sample Response Template:**\n\nDear [Buyer Name],\n\nThank you for the opportunity to quote on [Product/Service]. We are confident in our ability to meet your requirements based on our [X] years of experience in this field.\n\n**Price:** [Amount] per unit ([Incoterms])\n**MOQ:** [Quantity]\n**Lead Time:** [Days] days after order confirmation\n**Payment:** [Terms]\n\nWe look forward to your favorable response.\n\nBest regards,\n[Your Company Name]`,
  }),
  rfq_pricing: () => ({
    type: 'rfq_pricing',
    content: `**RFQ Pricing Strategy Guide:**\n\n**1. Cost Analysis**\n\u2022 Raw material costs: Calculate current market rates\n\u2022 Production costs: Labor, overhead, quality control\n\u2022 Logistics: Freight, insurance, customs duties\n\u2022 Margin: Standard B2B margin 15-30%\n\n**2. Competitive Pricing**\n\u2022 Research what similar suppliers charge\n\u2022 Consider your market positioning (premium vs. competitive)\n\u2022 Factor in your unique advantages\n\n**3. Pricing Models**\n\u2022 Per-unit pricing (most common for B2B)\n\u2022 Tiered pricing based on volume\n\u2022 Fixed price for the entire contract\n\n**4. Additional Considerations**\n\u2022 Include sample costs (if applicable)\n\u2022 Account for currency fluctuations\n\u2022 Consider payment term impact (LC vs. TT)\n\u2022 Add buffer for negotiations (10-15% above target)`,
  }),
  create_rfq: () => ({
    type: 'rfq_create',
    content: `**Tips for Creating an Effective RFQ:**\n\n**1. Title**\n\u2022 Be specific: Include product type, quantity, and key spec\n\u2022 Example: "Looking for 1000 units of Grade A cotton fabric"\n\n**2. Description**\n\u2022 Include detailed specifications (material, size, color, weight)\n\u2022 Mention quality standards and certifications required\n\u2022 Specify packaging and labeling requirements\n\u2022 Add delivery expectations and timeline\n\n**3. Quantity & Budget**\n\u2022 Be realistic about quantities (consider MOQ)\n\u2022 Provide a budget range to attract relevant suppliers\n\u2022 Specify if you're flexible on pricing for bulk\n\n**4. Dates**\n\u2022 Set a realistic deadline for responses (7-14 days typical)\n\u2022 Specify required delivery date\n\u2022 Include sample timeline if needed`,
  }),
  win_strategy: () => ({
    type: 'rfq_win',
    content: `**How to Stand Out and Win RFQs:**\n\n**1. Respond Quickly**\n\u2022 First responders get 40% more attention\n\u2022 Aim to respond within 24 hours\n\u2022 Set up alerts for new RFQs in your category\n\n**2. Personalize Your Response**\n\u2022 Address the buyer by name\n\u2022 Reference specific requirements from their RFQ\n\u2022 Show you've read and understood their needs\n\n**3. Demonstrate Value**\n\u2022 Include relevant experience and past projects\n\u2022 Share testimonials or case studies\n\u2022 Highlight certifications and quality standards\n\u2022 Offer samples or references\n\n**4. Competitive Edge**\n\u2022 Better pricing through efficient operations\n\u2022 Faster delivery times\n\u2022 Superior quality or certifications\n\u2022 Flexible payment terms\n\u2022 Excellent communication and support\n\n**5. Follow Up**\n\u2022 Send a polite follow-up after 3-5 days\n\u2022 Offer to answer any additional questions\n\u2022 Be proactive but not pushy`,
  }),
  questions_to_ask: () => ({
    type: 'rfq_questions',
    content: `**Key Questions to Clarify Before Responding to an RFQ:**\n\n**Product/Service Questions:**\n\u2022 Are there any specific certifications or standards required?\n\u2022 Can you provide samples or reference materials?\n\u2022 Are there any preferred brands or materials?\n\n**Commercial Questions:**\n\u2022 What are the preferred payment terms?\n\u2022 What Incoterms are preferred (FOB, CIF, EXW)?\n\u2022 Is there flexibility on pricing for long-term contracts?\n\n**Logistics Questions:**\n\u2022 What is the preferred shipping method?\n\u2022 Are there specific packaging/labeling requirements?\n\u2022 What is the delivery address and schedule?\n\n**Process Questions:**\n\u2022 What is the evaluation criteria for selecting the supplier?\n\u2022 When can we expect a decision?\n\u2022 Will there be a negotiation phase?\n\n**Relationship Questions:**\n\u2022 Is this a one-time purchase or recurring?\n\u2022 Are you looking for a long-term partnership?\n\u2022 Do you have existing suppliers for this category?`,
  }),
  rfq_general: () => ({
    type: 'rfq_general',
    content: `I'm your AI RFQ Assistant! I can help you with:\n\n\ud83d\udccb **Analyze RFQs** \u2014 Evaluate opportunities and requirements\n\u270d\ufe0f **Craft Responses** \u2014 Write compelling, professional responses\n\ud83d\udcb0 **Pricing Strategy** \u2014 Optimize your quotes for RFQs\n\ud83d\udcdd **Create Better RFQs** \u2014 Tips for buyers posting RFQs\n\ud83c\udfc6 **Win Strategies** \u2014 Stand out from competitors\n\u2753 **Questions to Ask** \u2014 Clarify RFQ requirements\n\nTry asking me something like:\n\u2022 "Analyze this RFQ for cotton fabric"\n\u2022 "Help me craft a response to an RFQ"\n\u2022 "What price should I quote for 1000 units?"\n\u2022 "How can I win more RFQs?"`,
  }),
};

export async function processRfqQuery(query, context = {}) {
  if (!query || typeof query !== 'string') {
    return { type: 'error', content: 'Please provide a valid query.' };
  }
  const trimmed = query.trim();
  if (trimmed.length > 2000) {
    return { type: 'error', content: 'Query is too long. Please keep it under 2000 characters.' };
  }
  const intent = detectRfqIntent(trimmed);
  const responder = rfqResponses[intent] || rfqResponses.rfq_general;
  return responder();
}
