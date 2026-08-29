export const formatDate = (date, locale = 'en') => {
  return new Date(date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

export const formatDateTime = (date, locale = 'en') => {
  return new Date(date).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US');
};

export const daysBetween = (d1, d2) => Math.floor((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));
export const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
export const isExpired = (date) => new Date(date) < new Date();
export const toISO = (date) => new Date(date).toISOString();
