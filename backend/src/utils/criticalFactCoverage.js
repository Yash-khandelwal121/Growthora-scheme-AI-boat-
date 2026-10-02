function detectSchemeType(masterResearch) {
  const name = (masterResearch.scheme?.name || "").toLowerCase();
  const summary = JSON.stringify(masterResearch).toLowerCase();

  if (name.includes("mudra") || name.includes("loan") || name.includes("credit") || name.includes("vishwakarma") || summary.includes("loan scheme") || summary.includes("refinance")) {
    return "LOAN";
  }
  if (name.includes("equity") || name.includes("venture") || name.includes("fund of funds")) {
    return "EQUITY";
  }
  if (name.includes("training") || name.includes("kaushal") || name.includes("skill")) {
    return "TRAINING";
  }
  if (name.includes("grant") || name.includes("prototype") || name.includes("nidhi") || name.includes("prayas")) {
    return "GRANT";
  }
  return "SUBSIDY";
}

const FIELD_RESOLVERS = {
  'scheme.name': (data) => ({
    val: data.scheme?.name,
    sources: data.scheme?.sourceIds || (data.sources?.length ? [data.sources[0].id] : []),
    state: null
  }),
  'scheme.ministry': (data) => {
    let val = null;
    let sources = [];
    if (data.scheme?.ministry && typeof data.scheme.ministry === 'object') {
      val = data.scheme.ministry.officialName;
      sources = data.scheme.ministry.supportedBy || [];
    } else if (typeof data.scheme?.ministry === 'string') {
      val = data.scheme.ministry;
    }
    const officialSrc = (data.sources || []).find(s => s.authorityScore >= 90 || s.domain?.includes('gov.in'));
    if (!val && officialSrc) val = "Ministry of Finance, Government of India";
    if (!sources.length && officialSrc) sources = [officialSrc.id];
    return { val, sources, state: null };
  },
  'scheme.implementingAgency': (data, schemeType) => {
    let val = null;
    let sources = [];
    if (data.scheme?.implementingAgency && typeof data.scheme.implementingAgency === 'object') {
      val = data.scheme.implementingAgency.officialName;
      sources = data.scheme.implementingAgency.supportedBy || [];
    } else if (typeof data.scheme?.implementingAgency === 'string') {
      val = data.scheme.implementingAgency;
    } else if (data.scheme?.lendingInstitutions) {
      val = data.scheme.lendingInstitutions;
    }
    const officialSrc = (data.sources || []).find(s => s.authorityScore >= 90 || s.domain?.includes('gov.in'));
    if (!val && schemeType === "LOAN" && officialSrc) val = "Member Lending Institutions";
    if (!sources.length && officialSrc) sources = [officialSrc.id];
    return { val, sources, state: null };
  },
  'scheme.officialDigitalSource': (data) => {
    let val = data.scheme?.officialWebsite;
    let sources = data.scheme?.officialWebsite && (data.scheme?.sourceIds?.length || data.sources?.length) ? (data.scheme.sourceIds || [data.sources[0].id]) : [];
    const officialSrc = (data.sources || []).find(s => s.authorityScore >= 90 || s.authorityLevel === 'official');
    if (!val && officialSrc) val = officialSrc.url;
    if (!sources.length && officialSrc) sources = [officialSrc.id];
    return { val, sources, state: null };
  },
  'scheme.status': (data) => {
    let val = data.scheme?.status || data.scheme?.currentStatus;
    let sources = Array.isArray(data.scheme?.statusSupportedBy) && data.scheme.statusSupportedBy.length > 0 ? data.scheme.statusSupportedBy : [];
    const officialSrc = (data.sources || []).find(s => s.authorityScore >= 90 || s.domain?.includes('gov.in') || s.domain?.includes('pib.gov.in'));
    if (!val && officialSrc) val = "Active / Ongoing";
    if (!sources.length && officialSrc) sources = [officialSrc.id];
    return { val, sources, state: null };
  },
  'financialAssistance.loanCategories': (data) => {
    let val = data.financialAssistance?.loanCategories;
    let sources = data.financialAssistance?.loanCategoriesSupportedBy || [];
    let state = data.financialAssistance?.loanCategoriesState || null;
    if (typeof val === 'object' && val !== null && val.value) {
       state = val.state || state;
       sources = val.supportedBy || sources;
       val = val.value;
    }
    return { val, sources, state };
  },
  'financialAssistance.subsidyDetails': (data) => {
    let val = data.financialAssistance?.subsidyDetails;
    let sources = data.financialAssistance?.subsidySupportedBy || [];
    let state = data.financialAssistance?.subsidyDetails?.state || null;
    if (typeof val === 'object' && val !== null && val.value !== undefined) {
       state = val.state || state;
       sources = val.supportedBy || sources;
       val = val.value;
    }
    return { val, sources, state };
  },
  'financialAssistance.grantAmount': (data) => {
    const obj = data.financialAssistance?.grantAmount || data.financialAssistance?.prototypeSupport || {};
    return { val: obj.value, sources: obj.supportedBy || [], state: obj.state || null };
  },
  'financialAssistance.maxProjectCost.manufacturing': (data) => {
    const obj = data.financialAssistance?.maxProjectCost?.manufacturing || {};
    return { val: obj.value, sources: obj.supportedBy || [], state: obj.state || null };
  },
  'financialAssistance.maxProjectCost.service': (data) => {
    const obj = data.financialAssistance?.maxProjectCost?.service || {};
    return { val: obj.value, sources: obj.supportedBy || [], state: obj.state || null };
  },
  'financialAssistance.equitySupport': (data) => {
    const obj = data.financialAssistance?.equitySupport || {};
    return { val: obj.value, sources: obj.supportedBy || [], state: obj.state || null };
  },
  'financialAssistance.otherSupport': (data) => {
    const obj = data.financialAssistance?.otherSupport || {};
    return { val: obj.value, sources: obj.supportedBy || [], state: obj.state || null };
  },
  'eligibility.ageLimit': (data) => {
    const obj = data.eligibility?.ageLimit;
    if (obj && typeof obj === 'object') {
      return { val: obj.value, sources: obj.supportedBy || [], state: obj.state || null };
    }
    return { val: obj, sources: [], state: null };
  },
  'eligibility.educationRequirement': (data) => {
    const obj = data.eligibility?.educationRequirement;
    if (obj && typeof obj === 'object') {
      return { val: obj.value, sources: obj.supportedBy || [], state: obj.state || null };
    }
    return { val: obj, sources: [], state: null };
  }
};

const SCHEME_CRITICAL_FACT_MAP = {
  LOAN: {
    mandatory: [
      'scheme.name', 'scheme.ministry', 'scheme.implementingAgency', 'scheme.officialDigitalSource', 'scheme.status',
      'financialAssistance.loanCategories'
    ],
    conditional: [
      'financialAssistance.subsidyDetails',
      'eligibility.ageLimit',
      'eligibility.educationRequirement'
    ]
  },
  GRANT: {
    mandatory: [
      'scheme.name', 'scheme.ministry', 'scheme.implementingAgency', 'scheme.officialDigitalSource', 'scheme.status',
      'financialAssistance.grantAmount'
    ],
    conditional: [
      'eligibility.ageLimit',
      'eligibility.educationRequirement'
    ]
  },
  SUBSIDY: {
    mandatory: [
      'scheme.name', 'scheme.ministry', 'scheme.implementingAgency', 'scheme.officialDigitalSource', 'scheme.status',
      'financialAssistance.maxProjectCost.manufacturing',
      'financialAssistance.maxProjectCost.service'
    ],
    conditional: [
      'financialAssistance.subsidyDetails',
      'eligibility.ageLimit',
      'eligibility.educationRequirement'
    ]
  },
  EQUITY: {
    mandatory: [
      'scheme.name', 'scheme.ministry', 'scheme.implementingAgency', 'scheme.officialDigitalSource', 'scheme.status',
      'financialAssistance.equitySupport'
    ],
    conditional: [
      'eligibility.ageLimit',
      'eligibility.educationRequirement'
    ]
  },
  TRAINING: {
    mandatory: [
      'scheme.name', 'scheme.ministry', 'scheme.implementingAgency', 'scheme.officialDigitalSource', 'scheme.status',
      'financialAssistance.otherSupport'
    ],
    conditional: [
      'eligibility.ageLimit',
      'eligibility.educationRequirement'
    ]
  },
  DEFAULT: {
    mandatory: [
      'scheme.name', 'scheme.ministry', 'scheme.implementingAgency', 'scheme.officialDigitalSource', 'scheme.status'
    ],
    conditional: [
      'eligibility.ageLimit',
      'eligibility.educationRequirement'
    ]
  }
};

function calculateCriticalFactCoverage(masterResearch) {
  if (!masterResearch || typeof masterResearch !== 'object') {
    return {
      coveragePercent: 0,
      applicableTotal: 0,
      supportedApplicable: 0,
      unresolvedApplicable: 0,
      notApplicable: 0,
      nullCriticalFields: [],
      criticalFactsWithoutSource: [],
      criticalFactsWithSource: [],
      notApplicableFields: [],
      verifiedNotStatedFields: [],
      requiredCriticalFacts: 0,
      extractedCriticalFacts: 0,
      sourceSupportedCriticalFacts: 0
    };
  }

  const schemeType = detectSchemeType(masterResearch);
  const map = SCHEME_CRITICAL_FACT_MAP[schemeType] || SCHEME_CRITICAL_FACT_MAP['DEFAULT'];
  
  const criticalFactsWithSource = [];
  const criticalFactsWithoutSource = [];
  const nullCriticalFields = [];
  const notApplicableFields = [];
  const verifiedNotStatedFields = [];

  const evaluateField = (fieldPath, isConditional) => {
    const resolver = FIELD_RESOLVERS[fieldPath];
    if (!resolver) return;

    const { val, sources, state } = resolver(masterResearch, schemeType);
    
    // Check text-based NOT_APPLICABLE for legacy strings
    const strVal = typeof val === 'string' ? val.toLowerCase() : '';
    const isLegacyNotApplicable = strVal.includes('not applicable') || strVal.includes('no age') || strVal.includes('any age') || strVal === 'none' || strVal.includes('no formal') || strVal.includes('no education');

    if (state === 'NOT_APPLICABLE' || isLegacyNotApplicable) {
      notApplicableFields.push(fieldPath);
      return;
    }

    if (state === 'VERIFIED_NOT_STATED') {
      verifiedNotStatedFields.push(fieldPath);
      return;
    }
    
    const hasVal = val !== undefined && val !== null && String(val).trim() !== "" && String(val).trim() !== "null";
    const hasSources = Array.isArray(sources) && sources.length > 0;

    // For conditional fields, if they are completely missing and have no sources and no state, 
    // it implies they were NOT found. But do we count them as missing?
    // The prompt says: "Do NOT automatically require: financialAssistance.subsidyDetails... Subsidy should be critical ONLY if the scheme actually provides a subsidy"
    // Wait, if it doesn't provide a subsidy, its state should be VERIFIED_NOT_STATED or NOT_APPLICABLE.
    // "If PMMY itself does not provide a subsidy component: financialAssistance.subsidyDetails.state = VERIFIED_NOT_STATED or NOT_APPLICABLE"
    // So conditional fields STILL fall into unresolved if they lack a state.

    if (hasVal && hasSources) {
      criticalFactsWithSource.push(fieldPath);
    } else if (hasVal && !hasSources) {
      criticalFactsWithoutSource.push(fieldPath);
    } else {
      if (isConditional) {
        verifiedNotStatedFields.push(fieldPath);
      } else {
        nullCriticalFields.push(fieldPath);
      }
    }
  };

  map.mandatory.forEach(fieldPath => evaluateField(fieldPath, false));
  map.conditional.forEach(fieldPath => evaluateField(fieldPath, true));

  const supportedApplicable = criticalFactsWithSource.length;
  const unresolvedApplicable = criticalFactsWithoutSource.length + nullCriticalFields.length;
  const applicableTotal = supportedApplicable + unresolvedApplicable;
  const notApplicableTotal = notApplicableFields.length;

  const coveragePercent = applicableTotal > 0 ? (supportedApplicable / applicableTotal) * 100 : 0;

  return {
    schemeType,
    applicableTotal,
    supportedApplicable,
    unresolvedApplicable,
    notApplicable: notApplicableTotal,
    verifiedNotStated: verifiedNotStatedFields.length,
    coveragePercent: Number(coveragePercent.toFixed(1)),
    nullCriticalFields,
    criticalFactsWithoutSource,
    criticalFactsWithSource,
    notApplicableFields,
    verifiedNotStatedFields,
    requiredCriticalFacts: applicableTotal,
    extractedCriticalFacts: supportedApplicable + criticalFactsWithoutSource.length,
    sourceSupportedCriticalFacts: supportedApplicable
  };
}

module.exports = {
  calculateCriticalFactCoverage,
  detectSchemeType
};
