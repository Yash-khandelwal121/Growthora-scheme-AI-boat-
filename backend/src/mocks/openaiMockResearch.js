module.exports = {
  mockData: true,
  scheme: {
    name: "Prime Minister's Employment Generation Programme 2026", // Incorrectly including 2026
    currentStatus: "Active",
    ministry: "Ministry of Micro, Small and Medium Enterprises",
    implementingAgency: "KVIC",
    officialWebsite: "https://example.gov.in/mock-pmegp-portal",
    isCentrallySponsored: true,
    programOutlay: "10000 Crores"
  },
  overview: {
    shortDescription: "A credit-linked subsidy scheme for generating employment.",
    objectives: ["Generate employment", "Set up micro-enterprises"],
    targetBeneficiaries: ["Unemployed youth", "Traditional artisans"]
  },
  financialAssistance: {
    maxProjectCost: "₹50 lakh", // Conflict: Claude will say 50 lakh for manufacturing, but let's say they say 50 lakh generally.
    subsidyDetails: "15% to 35%",
    beneficiaryContribution: "5% to 10%",
    loanDetails: "Term loan for remaining amount", // Kept separate from subsidy
    disbursementMethod: "DBT"
  },
  eligibility: {
    ageLimit: "Above 18 years",
    incomeLimit: "No limit",
    education: "VIII Pass", // wording conflict
    otherCriteria: ["Only new projects"]
  },
  importantDates: {
    applicationDeadline: "31-03-2026", // Incorrect unsupported deadline
    schemeStartDate: "2008-08-15"
  },
  sources: [
    { url: "https://example.gov.in/mock-pmegp-guidelines", isMock: true, title: "PMEGP Guidelines", supportsFacts: ["maxProjectCost", "education"] },
    { url: "https://example.nic.in/mock-pmegp-eligibility", isMock: true, title: "Eligibility Details", supportsFacts: ["ageLimit"] }
  ]
};
