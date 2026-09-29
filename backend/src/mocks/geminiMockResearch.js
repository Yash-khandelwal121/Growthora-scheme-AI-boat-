module.exports = {
  mockData: true,
  scheme: {
    name: "PMEGP Scheme 2026", // Incorrectly including 2026
    currentStatus: "Active",
    ministry: "Ministry of MSME",
    implementingAgency: "KVIC",
    officialWebsite: "https://example.gov.in/mock-pmegp-portal", // Duplicate URL
    isCentrallySponsored: true,
    programOutlay: "15000 Crores"
  },
  overview: {
    shortDescription: "Credit linked subsidy programme.",
    objectives: ["Employment generation"],
    targetBeneficiaries: ["Youth"]
  },
  financialAssistance: {
    maxProjectCost: "₹50 lakh", // Agrees with OpenAI
    subsidyDetails: "Up to 35%", // Conflict on wording
    beneficiaryContribution: "5-10%",
    loanDetails: "Bank loan", // Separate from subsidy
    disbursementMethod: "Direct transfer"
  },
  eligibility: {
    ageLimit: "18+",
    incomeLimit: "None",
    education: "8th Standard", // wording conflict with VIII Pass
    otherCriteria: []
  },
  importantDates: {
    applicationDeadline: "2026-12-31", // Different unsupported deadline
    schemeStartDate: "2008"
  },
  sources: [
    { url: "https://example.gov.in/mock-pmegp-portal", isMock: true, title: "PMEGP Portal", supportsFacts: ["officialWebsite", "maxProjectCost"] }
  ]
};
