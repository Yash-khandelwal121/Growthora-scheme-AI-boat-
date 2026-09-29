/**
 * Currency Formatter Utility for Indian Rupee Values
 * Standardizes rupee formatting across DOCX, previews, FAQs, tables, and SEO text.
 */

function formatRupee(text) {
  if (typeof text !== 'string' || !text.trim()) return text;

  let result = text;

  // 1. Convert Rs., Rs, INR, rupees to ₹
  result = result.replace(/\b(?:Rs\.?|INR)\s*/gi, '₹');
  result = result.replace(/(\d+)\s*(?:rupees|Rupees)\b/gi, '₹$1');

  // 2. Remove duplicate/multiple rupee symbols like "₹ ₹", "₹  ₹", "₹ ₹ ₹"
  result = result.replace(/₹\s*₹+/g, '₹');
  result = result.replace(/₹\s*₹\s*(\d)/g, '₹$1');

  // 3. Fix trailing rupee symbol after number or unit (e.g., "50,000 ₹", "5 Lakh ₹", "20 Lakh ₹ ₹")
  result = result.replace(/([\d,]+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)?\s*₹+/gi, (match, val, unit) => {
    const unitStr = unit ? ` ${unit.toLowerCase().replace(/s$/, '')}` : '';
    return `₹${val}${unitStr}`;
  });

  // 4. Fix overlapping range patterns like "₹50,000 to ₹5 lakh" -> "Above ₹50,000 and up to ₹5 lakh"
  result = result.replace(/₹?50,000\s*(?:to|-)\s*₹?5\s*lakh/gi, 'Above ₹50,000 and up to ₹5 lakh');
  result = result.replace(/₹?5\s*lakh\s*(?:to|-)\s*₹?10\s*lakh/gi, 'Above ₹5 lakh and up to ₹10 lakh');
  result = result.replace(/₹?10\s*lakh\s*(?:to|-)\s*₹?20\s*lakh/gi, 'Above ₹10 lakh and up to ₹20 lakh');

  // 5. Fix malformed range patterns like "50,000 and 5 Lakh ₹ ₹" or "50,000 and 5 lakh"
  result = result.replace(/₹?50,000\s+and\s+₹?5\s*lakh(?:\s*₹)*/gi, 'Above ₹50,000 and up to ₹5 lakh');
  result = result.replace(/₹?5\s*lakh\s+and\s+₹?10\s*lakh(?:\s*₹)*/gi, 'Above ₹5 lakh and up to ₹10 lakh');
  result = result.replace(/₹?10\s*lakh\s+and\s+₹?20\s*lakh(?:\s*₹)*/gi, 'Above ₹10 lakh and up to ₹20 lakh');

  // 6. Fix "₹ ₹50,000" or "₹ ₹5 lakh"
  result = result.replace(/₹\s*₹\s*([\d,]+)/g, '₹$1');
  result = result.replace(/₹\s*₹/g, '₹');

  // 7. Standardize Lakhs/Crores casing and singular form: "Lakh" -> "lakh", "Lakhs" -> "lakh", "Crore" -> "crore"
  result = result.replace(/\bLakhs?\b/gi, 'lakh');
  result = result.replace(/\bCrores?\b/gi, 'crore');

  // 8. Fix spacing after ₹ like "₹ 50,000" -> "₹50,000" or "₹ 5 lakh" -> "₹5 lakh"
  result = result.replace(/₹\s+(\d)/g, '₹$1');

  // 9. Clean up any trailing "₹ ₹" or duplicate "₹" that might have been leftover
  result = result.replace(/₹\s*₹+/g, '₹');

  return result;
}

function applyCurrencyFormatting(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return formatRupee(data);
  if (Array.isArray(data)) return data.map(item => applyCurrencyFormatting(item));
  if (typeof data === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(data)) {
      cleaned[key] = applyCurrencyFormatting(value);
    }
    return cleaned;
  }
  return data;
}

module.exports = {
  formatRupee,
  applyCurrencyFormatting
};
