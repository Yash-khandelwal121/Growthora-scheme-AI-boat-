module.exports = {
  mockData: true,
  verifiedFacts: {
    scheme: {
      name: "Prime Minister's Employment Generation Programme", // Fixed name, removed 2026
      currentStatus: "Active",
      ministry: "Ministry of Micro, Small and Medium Enterprises",
      implementingAgency: "Khadi and Village Industries Commission (KVIC)",
      officialWebsite: "https://example.gov.in/mock-pmegp-portal",
      isCentrallySponsored: true,
      programOutlay: "₹13,554.42 Crore"
    },
    overview: {
      shortDescription: "A major credit-linked subsidy programme aimed at generating self-employment opportunities.",
      objectives: ["To generate continuous and sustainable employment"],
      targetBeneficiaries: ["Any individual, above 18 years of age"]
    },
    financialAssistance: {
      maxProjectCost: "₹50 lakh for manufacturing, ₹20 lakh for service sector", // True resolved value based on strong evidence
      subsidyDetails: "15% to 35% depending on category and area",
      beneficiaryContribution: "5% for Special Category, 10% for General",
      loanDetails: "Term Loan provided by banks",
      disbursementMethod: "Direct Benefit Transfer (DBT)"
    },
    eligibility: {
      ageLimit: "Above 18 years",
      incomeLimit: "No income ceiling",
      education: "Passed VIII standard for manufacturing > ₹10 lakh / service > ₹5 lakh",
      otherCriteria: ["Only new projects are considered"]
    },
    importantDates: {
      applicationDeadline: null, // Corrected missing deadline
      schemeStartDate: "2008-08-15"
    }
  },
  conflictsIdentified: [
    {
      field: "scheme.name",
      openaiValue: "Prime Minister's Employment Generation Programme 2026",
      geminiValue: "PMEGP Scheme 2026",
      resolution: "Removed '2026'. Official name does not include the year.",
      confidence: "high"
    },
    {
      field: "financialAssistance.maxProjectCost",
      openaiValue: "₹50 lakh",
      geminiValue: "₹50 lakh",
      resolution: "₹50 lakh is only for manufacturing. It is ₹20 lakh for service sector. Overriding majority due to official evidence.",
      confidence: "high"
    },
    {
      field: "importantDates.applicationDeadline",
      openaiValue: "31-03-2026",
      geminiValue: "2026-12-31",
      resolution: "The scheme is continuous. No official deadline exists. Set to null.",
      confidence: "high"
    },
    {
      field: "eligibility.education",
      openaiValue: "VIII Pass",
      geminiValue: "8th Standard",
      resolution: "Standardized wording to 'Passed VIII standard for manufacturing > ₹10 lakh / service > ₹5 lakh'.",
      confidence: "medium"
    },
    {
      field: "some.unresolved.fact",
      openaiValue: "A",
      geminiValue: "B",
      resolution: null,
      confidence: "low"
    }
  ],
  sources: [
    { url: "https://example.gov.in/mock-pmegp-portal", isMock: true, title: "Official PMEGP Portal", supportsFacts: ["scheme.name", "importantDates.applicationDeadline"] },
    { url: "https://example.gov.in/mock-pmegp-guidelines", isMock: true, title: "Detailed Guidelines 2023", supportsFacts: ["financialAssistance.maxProjectCost", "eligibility.education"] },
    { url: "https://example.com/some-weak-source", isMock: true, title: "Blog Post", supportsFacts: ["some.unresolved.fact"] }
  ]
};
