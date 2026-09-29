function analyzeSourceAuthority(urlStr, schemeName = "", evidenceText = "") {
  try {
    const parsedUrl = new URL(urlStr);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    // Default assumption
    let authorityLevel = 'other';
    let authorityScore = 10;
    
    // Check for scheme name in URL to boost relevance
    const isSchemeMatch = schemeName && hostname.includes(schemeName.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    if (hostname.includes('pib.gov.in') || hostname.includes('myscheme.gov.in')) {
      authorityLevel = 'government_portal';
      authorityScore = 95;
    } else if (hostname.endsWith('.gov.in') || hostname.endsWith('.nic.in')) {
      if (isSchemeMatch) {
        authorityLevel = 'official_scheme_portal';
        authorityScore = 100;
      } else {
        authorityLevel = 'official_government';
        authorityScore = 90;
      }
    } else if (hostname.endsWith('.edu') || hostname.endsWith('.ac.in')) {
      authorityLevel = 'academic';
      authorityScore = 80;
    } else if (hostname.endsWith('.org')) {
      authorityLevel = 'organization';
      authorityScore = 60;
    } else if (
      hostname.includes('cleartax') || 
      hostname.includes('bankbazaar') || 
      hostname.includes('paisabazaar') ||
      hostname.includes('vakilsearch') ||
      hostname.includes('indiafilings')
    ) {
      authorityLevel = 'reputable_secondary';
      authorityScore = 70;
    } else {
      authorityLevel = 'unknown';
      authorityScore = 30;
    }
    
    // If it's a PDF link from a government site, it's likely a guideline or notification
    if (urlStr.toLowerCase().endsWith('.pdf') && (authorityLevel.includes('government') || authorityLevel.includes('official'))) {
      authorityLevel = 'government_guideline';
      authorityScore = 100;
    }
    
    return {
      authorityLevel,
      authorityScore,
      domain: hostname
    };
  } catch (e) {
    return {
      authorityLevel: 'invalid_url',
      authorityScore: 0,
      domain: null
    };
  }
}

module.exports = {
  analyzeSourceAuthority
};
