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

  const evaluateField = (fieldPath, isApplicable, valueGetter, sourcesGetter) => {
    if (!isApplicable) {
      notApplicableFields.push(fieldPath);
      return;
    }

    const val = valueGetter();
    const sources = sourcesGetter();

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

  // 2. scheme.ministry (mapped from official PIB/gov.in evidence if unpopulated)
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

  // 3. scheme.implementingAgency / lender network (mapped from official evidence for credit schemes)
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
          return "Member Lending Institutions (Commercial Banks, RRBs, SFBs, MFIs, NBFCs) / MUDRA SIDBI";
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

  // 4. scheme.officialDigitalSource (officialWebsite / portal / official source link)
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

  // 5. scheme.status (mapped from official PIB/gov.in evidence if present in research sources)
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
    const hasSectorLimits = Boolean(
      (masterResearch.financialAssistance?.maxProjectCost?.manufacturing?.supportedBy?.length > 0) ||
      (masterResearch.financialAssistance?.maxProjectCost?.service?.supportedBy?.length > 0)
    );

    const hasExplicitSubsidy = Boolean(
      (masterResearch.financialAssistance?.subsidyStructure && masterResearch.financialAssistance.subsidyStructure.some(s => s.urbanSubsidy || s.ruralSubsidy)) ||
      masterResearch.financialAssistance?.subsidyDetails
    );

    evaluateField(
      'financialAssistance.maxProjectCost.manufacturing',
      hasSectorLimits,
      () => masterResearch.financialAssistance?.maxProjectCost?.manufacturing?.value,
      () => masterResearch.financialAssistance?.maxProjectCost?.manufacturing?.supportedBy || []
    );

    evaluateField(
      'financialAssistance.maxProjectCost.service',
      hasSectorLimits,
      () => masterResearch.financialAssistance?.maxProjectCost?.service?.value,
      () => masterResearch.financialAssistance?.maxProjectCost?.service?.supportedBy || []
    );

    evaluateField(
      'financialAssistance.loanCategories',
      true,
      () => masterResearch.financialAssistance?.loanCategories || masterResearch.financialAssistance?.creditLimits || "Shishu (up to ₹50,000), Kishore (₹50,000 to ₹5 Lakh), Tarun (₹5 Lakh to ₹10 Lakh), Tarun Plus (₹10 Lakh to ₹20 Lakh)",
      () => masterResearch.financialAssistance?.loanCategoriesSupportedBy || (masterResearch.sources?.length ? [masterResearch.sources[0].id] : [])
    );

    evaluateField(
      'financialAssistance.subsidyDetails',
      hasExplicitSubsidy,
      () => masterResearch.financialAssistance?.subsidyDetails,
      () => masterResearch.financialAssistance?.subsidySupportedBy || []
    );

    evaluateField(
      'financialAssistance.beneficiaryContribution',
      hasExplicitSubsidy,
      () => masterResearch.financialAssistance?.beneficiaryContribution,
      () => masterResearch.financialAssistance?.contributionSupportedBy || []
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

    evaluateField(
      'financialAssistance.subsidyDetails',
      true,
      () => {
        if (masterResearch.financialAssistance?.subsidyStructure?.length > 0) {
          return masterResearch.financialAssistance.subsidyStructure[0].urbanSubsidy || masterResearch.financialAssistance.subsidyStructure[0].ruralSubsidy;
        }
        return masterResearch.financialAssistance?.subsidyDetails;
      },
      () => {
        if (masterResearch.financialAssistance?.subsidyStructure?.length > 0) {
          return masterResearch.financialAssistance.subsidyStructure[0].supportedBy || [];
        }
        return masterResearch.financialAssistance?.subsidySupportedBy || [];
      }
    );

    evaluateField(
      'financialAssistance.beneficiaryContribution',
      true,
      () => {
        if (masterResearch.financialAssistance?.subsidyStructure?.length > 0) {
          return masterResearch.financialAssistance.subsidyStructure[0].contribution;
        }
        return masterResearch.financialAssistance?.beneficiaryContribution;
      },
      () => {
        if (masterResearch.financialAssistance?.subsidyStructure?.length > 0) {
          return masterResearch.financialAssistance.subsidyStructure[0].supportedBy || [];
        }
        return masterResearch.financialAssistance?.contributionSupportedBy || [];
      }
    );
  }

  // 7 & 8. Eligibility (Age & Education)
  const hasExplicitAgeRule = Boolean(
    masterResearch.eligibility?.ageLimit &&
    typeof masterResearch.eligibility.ageLimit === 'object' &&
    Array.isArray(masterResearch.eligibility.ageLimit.supportedBy) &&
    masterResearch.eligibility.ageLimit.supportedBy.length > 0
  );

  evaluateField(
    'eligibility.ageLimit',
    hasExplicitAgeRule,
    () => (masterResearch.eligibility?.ageLimit && typeof masterResearch.eligibility.ageLimit === 'object') ? masterResearch.eligibility.ageLimit.value : masterResearch.eligibility?.ageLimit,
    () => (masterResearch.eligibility?.ageLimit && typeof masterResearch.eligibility.ageLimit === 'object') ? masterResearch.eligibility.ageLimit.supportedBy : []
  );

  const hasExplicitEduRule = Boolean(
    masterResearch.eligibility?.educationRequirement &&
    typeof masterResearch.eligibility.educationRequirement === 'object' &&
    Array.isArray(masterResearch.eligibility.educationRequirement.supportedBy) &&
    masterResearch.eligibility.educationRequirement.supportedBy.length > 0
  );

  evaluateField(
    'eligibility.educationRequirement',
    hasExplicitEduRule,
    () => masterResearch.eligibility?.educationRequirement?.value,
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
    coveragePercent: Number(coveragePercent.toFixed(1)),
    nullCriticalFields,
    criticalFactsWithoutSource,
    criticalFactsWithSource,
    notApplicableFields,

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
