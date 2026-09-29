const { z } = require('zod');

const ResearchRequestSchema = z.object({
  schemeName: z.string().min(1, "Scheme name is required"),
  primaryKeyword: z.string().min(1, "Primary keyword is required"),
  secondaryKeywords: z.array(z.string()).default([]),
  location: z.string().min(1, "Location is required"),
  outcome: z.string().default('Complete Scheme Guide'),
  language: z.string().default('English')
});

const SourceSchema = z.object({
  url: z.string().url(),
  title: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  sourceType: z.string().nullable().optional(),
  authorityLevel: z.string().nullable().optional(),
  authorityScore: z.number().nullable().optional(),
  provider: z.string().nullable().optional(),
  accessedAt: z.string().nullable().optional(),
  supportsFacts: z.array(z.string()).default([])
});

const ProviderResearchSchema = z.object({
  provider: z.string(),
  scheme: z.object({
    name: z.string().nullable(),
    fullName: z.string().nullable(),
    abbreviation: z.string().nullable(),
    currentStatus: z.string().nullable(),
    launchDate: z.string().nullable(),
    launchYear: z.string().nullable(),
    country: z.string().nullable(),
    state: z.string().nullable(),
    ministry: z.union([
      z.string(),
      z.object({
        officialName: z.string(),
        verifiedAliases: z.array(z.string()).optional(),
        supportedBy: z.array(z.string()).optional()
      })
    ]).nullable(),
    department: z.string().nullable(),
    implementingAgency: z.union([
      z.string(),
      z.object({
        officialName: z.string(),
        verifiedAliases: z.array(z.string()).optional(),
        supportedBy: z.array(z.string()).optional()
      })
    ]).nullable(),
    officialWebsite: z.string().nullable(),
    applicationWebsite: z.string().nullable(),
    applicationPortalAvailable: z.boolean().optional(),
    sourceIds: z.array(z.string()).optional()
  }),
  overview: z.object({
    objective: z.string().nullable(),
    targetBeneficiaries: z.array(z.string()).default([]),
    schemeType: z.string().nullable()
  }),
  financialAssistance: z.object({
    maxProjectCost: z.object({
      manufacturing: z.object({
        value: z.string().nullable(),
        supportedBy: z.array(z.string()).optional()
      }).optional(),
      service: z.object({
        value: z.string().nullable(),
        supportedBy: z.array(z.string()).optional()
      }).optional()
    }).optional(),
    subsidyStructure: z.array(z.object({
      beneficiaryCategory: z.string().nullable(),
      contribution: z.string().nullable(),
      urbanSubsidy: z.string().nullable(),
      ruralSubsidy: z.string().nullable(),
      supportedBy: z.array(z.string()).optional()
    })).default([]),
    maximumAmount: z.string().nullable().optional(),
    minimumAmount: z.string().nullable().optional(),
    grantAmount: z.string().nullable().optional(),
    loanAmount: z.string().nullable().optional(),
    subsidyPercentage: z.string().nullable().optional(),
    beneficiaryContribution: z.string().nullable().optional(),
    interestRate: z.string().nullable().optional(),
    collateralRequirement: z.string().nullable().optional()
  }),
  eligibility: z.object({
    ageLimit: z.object({
      value: z.string().nullable(),
      supportedBy: z.array(z.string()).optional()
    }).optional(),
    educationRequirement: z.object({
      value: z.string().nullable(),
      supportedBy: z.array(z.string()).optional()
    }).optional(),
    age: z.string().nullable().optional(),
    education: z.string().nullable().optional(),
    income: z.string().nullable().optional(),
    eligibleEntities: z.array(z.string()).default([]),
    eligibleBusinessTypes: z.array(z.string()).default([]),
    locationRequirements: z.array(z.string()).default([]),
    otherConditions: z.array(z.string()).default([]),
    exclusions: z.array(z.string()).default([])
  }),
  benefits: z.array(z.string()).default([]),
  documentsRequired: z.array(z.string()).default([]),
  applicationProcess: z.array(z.string()).default([]),
  importantDates: z.object({
    applicationStartDate: z.string().nullable(),
    applicationDeadline: z.string().nullable(),
    schemeValidity: z.string().nullable()
  }),
  officialContact: z.object({
    phone: z.string().nullable(),
    email: z.string().nullable(),
    address: z.string().nullable()
  }),
  sources: z.array(SourceSchema).default([]),
  uncertainClaims: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([])
});

const ConfidenceSchema = z.object({
  level: z.enum(['high', 'medium', 'low', 'unverified', '']),
  score: z.number().min(0).max(1)
});

const MasterSchemeResearchSchema = z.object({
  researchId: z.string(),
  generatedAt: z.string(),
  researchDate: z.string(),
  input: ResearchRequestSchema,
  scheme: z.any(),
  overview: z.any(),
  financialAssistance: z.any(),
  benefits: z.array(z.any()).default([]),
  eligibility: z.any(),
  documentsRequired: z.array(z.any()).default([]),
  applicationProcess: z.array(z.any()).default([]),
  importantDates: z.any(),
  officialContact: z.any(),
  sources: z.array(SourceSchema).default([]),
  verification: z.object({
    openaiCompleted: z.boolean(),
    geminiCompleted: z.boolean(),
    claudeCompleted: z.boolean(),
    officialSourcesFound: z.number(),
    conflictsFound: z.array(z.any()).default([]),
    conflictsResolved: z.array(z.any()).default([]),
    unresolvedConflicts: z.array(z.any()).default([]),
    needsHumanReview: z.array(z.any()).default([]),
    overallConfidence: ConfidenceSchema
  })
});

module.exports = {
  ResearchRequestSchema,
  SourceSchema,
  ProviderResearchSchema,
  MasterSchemeResearchSchema
};
