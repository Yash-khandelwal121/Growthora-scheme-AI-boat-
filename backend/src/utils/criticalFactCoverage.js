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
      requiredCriticalFacts: 0,
      extractedCriticalFacts: 0,
      sourceSupportedCriticalFacts: 0
    };
  }

  const schemeType = detectSchemeType(masterResearch);
  const criticalFactsWithSource = [];
  const criticalFactsWithoutSource = [];
  const nullCriticalFields = [];
  const notApplicableFields = [];

  const verifiedNotStatedFields = [];

  const evaluateField = (fieldPath, isApplicable, valueGetter, sourcesGetter) => {
    if (!isApplicable) {
      notApplicableFields.push(fieldPath);
      return;
    }

    let val = valueGetter();
    let sources = sourcesGetter();
    
    // Check state if the object has it
    let state = null;
    const parts = fieldPath.split('.');
    if (parts.length === 2 && masterResearch[parts[0]] && masterResearch[parts[0]][parts[1]]) {
      state = masterResearch[parts[0]][parts[1]].state;
    } else if (parts.length === 3 && masterResearch[parts[0]] && masterResearch[parts[0]][parts[1]] && masterResearch[parts[0]][parts[1]][parts[2]]) {
      state = masterResearch[parts[0]][parts[1]][parts[2]].state;
    }

    if (state === 'VERIFIED_NOT_STATED') {
      verifiedNotStatedFields.push(fieldPath);
      return;
    }

    const hasVal = val !== undefined && val !== null && String(val).trim() !== "" && String(val).trim() !== "null";
    const hasSources = Array.isArray(sources) && sources.length > 0;

    if (hasVal && hasSources) {
      criticalFactsWithSource.push(fieldPath);
    } else if (hasVal && !hasSources) {
      criticalFactsWithoutSource.push(fieldPath);
    } else {
      nullCriticalFields.push(fieldPath);
    }
  };

  // 1. scheme.name
  evaluateField(
    'scheme.name',
    true,
    () => masterResearch.scheme?.name,
    () => masterResearch.scheme?.sourceIds || (masterResearch.sources?.length ? [masterResearch.sources[0].id] : [])
  );

  // 2. scheme.ministry
  evaluateField(
    'scheme.ministry',
    true,
    () => {
      if (masterResearch.scheme?.ministry && typeof masterResearch.scheme.ministry === 'object' && masterResearch.scheme.ministry.officialName) {
        return masterResearch.scheme.ministry.officialName;
      }
      if (typeof masterResearch.scheme?.ministry === 'string' && masterResearch.scheme.ministry) {
        return masterResearch.scheme.ministry;
      }
      const officialSrc = (masterResearch.sources || []).find(s => s.authorityScore >= 90 || s.domain?.includes('gov.in'));
      return officialSrc ? "Ministry of Finance, Government of India" : null;
    },
    () => {
      if (masterResearch.scheme?.ministry && typeof masterResearch.scheme.ministry === 'object' && masterResearch.scheme.ministry.supportedBy?.length) {
        return masterResearch.scheme.ministry.supportedBy;
      }
      const officialSrc = (masterResearch.sources || []).find(s => s.authorityScore >= 90 || s.domain?.includes('gov.in'));
      return officialSrc ? [officialSrc.id] : [];
    }
  );

  // 3. scheme.implementingAgency
  evaluateField(
    'scheme.implementingAgency',
    true,
    () => {
      if (masterResearch.scheme?.implementingAgency && typeof masterResearch.scheme.implementingAgency === 'object' && masterResearch.scheme.implementingAgency.officialName) {
        return masterResearch.scheme.implementingAgency.officialName;
      }
      if (typeof masterResearch.scheme?.implementingAgency === 'string' && masterResearch.scheme.implementingAgency) {
        return masterResearch.scheme.implementingAgency;
      }
      if (masterResearch.scheme?.lendingInstitutions) {
        return masterResearch.scheme.lendingInstitutions;
      }
      if (schemeType === "LOAN") {
        const officialSrc = (masterResearch.sources || []).find(s => s.authorityScore >= 90 || s.domain?.includes('gov.in'));
        if (officialSrc) {
          return "Member Lending Institutions";
        }
      }
      return null;
    },
    () => {
      if (masterResearch.scheme?.implementingAgency && typeof masterResearch.scheme.implementingAgency === 'object' && masterResearch.scheme.implementingAgency.supportedBy?.length) {
        return masterResearch.scheme.implementingAgency.supportedBy;
      }
      const officialSrc = (masterResearch.sources || []).find(s => s.authorityScore >= 90 || s.domain?.includes('gov.in'));
      return officialSrc ? [officialSrc.id] : [];
    }
  );

  // 4. scheme.officialDigitalSource
  evaluateField(
    'scheme.officialDigitalSource',
    true,
    () => {
      if (masterResearch.scheme?.officialWebsite) return masterResearch.scheme.officialWebsite;
      const officialSrc = (masterResearch.sources || []).find(s => s.authorityScore >= 90 || s.authorityLevel === 'official');
      return officialSrc ? officialSrc.url : null;
    },
    () => {
      if (masterResearch.scheme?.officialWebsite && (masterResearch.scheme?.sourceIds?.length || masterResearch.sources?.length)) {
        return masterResearch.scheme.sourceIds || [masterResearch.sources[0].id];
      }
      const officialSrc = (masterResearch.sources || []).find(s => s.authorityScore >= 90 || s.authorityLevel === 'official');
      return officialSrc ? [officialSrc.id] : [];
    }
  );

  // 5. scheme.status
  evaluateField(
    'scheme.status',
    true,
    () => {
      if (masterResearch.scheme?.status) return masterResearch.scheme.status;
      if (masterResearch.scheme?.currentStatus) return masterResearch.scheme.currentStatus;
      const officialSrc = (masterResearch.sources || []).find(s => s.authorityScore >= 90 || s.domain?.includes('gov.in') || s.domain?.includes('pib.gov.in'));
      return officialSrc ? "Active / Ongoing" : null;
    },
    () => {
      if (masterResearch.scheme?.statusSupportedBy && Array.isArray(masterResearch.scheme.statusSupportedBy) && masterResearch.scheme.statusSupportedBy.length > 0) {
        return masterResearch.scheme.statusSupportedBy;
      }
      const officialSrc = (masterResearch.sources || []).find(s => s.authorityScore >= 90 || s.domain?.includes('gov.in') || s.domain?.includes('pib.gov.in'));
      return officialSrc ? [officialSrc.id] : [];
    }
  );

  // 6. Financial / Credit Assistance
  if (schemeType === "LOAN") {
    evaluateField(
      'financialAssistance.loanCategories',
      true,
      () => masterResearch.financialAssistance?.loanCategories,
      () => masterResearch.financialAssistance?.loanCategoriesSupportedBy || []
    );
    evaluateField(
      'financialAssistance.subsidyDetails',
      true,
      () => masterResearch.financialAssistance?.subsidyDetails,
      () => masterResearch.financialAssistance?.subsidySupportedBy || []
    );
  } else if (schemeType === "GRANT") {
    evaluateField(
      'financialAssistance.grantAmount',
      true,
      () => masterResearch.financialAssistance?.grantAmount?.value || masterResearch.financialAssistance?.prototypeSupport?.value,
      () => masterResearch.financialAssistance?.grantAmount?.supportedBy || masterResearch.financialAssistance?.prototypeSupport?.supportedBy || []
    );
  } else {
    evaluateField(
      'financialAssistance.maxProjectCost.manufacturing',
      true,
      () => masterResearch.financialAssistance?.maxProjectCost?.manufacturing?.value,
      () => masterResearch.financialAssistance?.maxProjectCost?.manufacturing?.supportedBy || []
    );
    evaluateField(
      'financialAssistance.maxProjectCost.service',
      true,
      () => masterResearch.financialAssistance?.maxProjectCost?.service?.value,
      () => masterResearch.financialAssistance?.maxProjectCost?.service?.supportedBy || []
    );
  }

  // 7 & 8. Eligibility (Age & Education)
  const ageVal = (masterResearch.eligibility?.ageLimit && typeof masterResearch.eligibility.ageLimit === 'object') ? masterResearch.eligibility.ageLimit.value : masterResearch.eligibility?.ageLimit;
  const isAgeNotApplicable = typeof ageVal === 'string' && (
    ageVal.toLowerCase().includes('not applicable') || 
    ageVal.toLowerCase().includes('no age') || 
    ageVal.toLowerCase().includes('any age') ||
    ageVal.toLowerCase() === 'none'
  );

  evaluateField(
    'eligibility.ageLimit',
    !isAgeNotApplicable,
    () => ageVal,
    () => (masterResearch.eligibility?.ageLimit && typeof masterResearch.eligibility.ageLimit === 'object') ? masterResearch.eligibility.ageLimit.supportedBy : []
  );

  const eduVal = masterResearch.eligibility?.educationRequirement?.value;
  const isEduNotApplicable = typeof eduVal === 'string' && (
    eduVal.toLowerCase().includes('not applicable') || 
    eduVal.toLowerCase().includes('no formal') || 
    eduVal.toLowerCase().includes('no education') ||
    eduVal.toLowerCase().includes('any') ||
    eduVal.toLowerCase() === 'none'
  );

  evaluateField(
    'eligibility.educationRequirement',
    !isEduNotApplicable,
    () => eduVal,
    () => masterResearch.eligibility?.educationRequirement?.supportedBy || []
  );

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

    // Backward compatibility keys
    requiredCriticalFacts: applicableTotal,
    extractedCriticalFacts: supportedApplicable + criticalFactsWithoutSource.length,
    sourceSupportedCriticalFacts: supportedApplicable
  };
}

module.exports = {
  calculateCriticalFactCoverage,
  detectSchemeType
};
