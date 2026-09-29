const researchSchema = {
  name: "MASTER_SCHEME_RESEARCH_JSON",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["scheme", "financialAssistance", "eligibility", "documents", "applicationProcess", "importantDates", "sources"],
    properties: {
      scheme: {
        type: "object",
        additionalProperties: false,
        required: ["name", "status", "applicationPortalAvailable", "ministry", "implementingAgency", "officialWebsite", "sourceIds"],
        properties: {
          name: { type: ["string", "null"] },
          status: { type: ["string", "null"] },
          applicationPortalAvailable: { type: ["boolean", "null"] },
          ministry: {
            type: "object",
            additionalProperties: false,
            required: ["officialName", "verifiedAliases", "supportedBy"],
            properties: {
              officialName: { type: ["string", "null"] },
              verifiedAliases: { type: "array", items: { type: "string" } },
              supportedBy: { type: "array", items: { type: "string" } }
            }
          },
          implementingAgency: {
            type: "object",
            additionalProperties: false,
            required: ["officialName", "verifiedAliases", "supportedBy"],
            properties: {
              officialName: { type: ["string", "null"] },
              verifiedAliases: { type: "array", items: { type: "string" } },
              supportedBy: { type: "array", items: { type: "string" } }
            }
          },
          officialWebsite: { type: ["string", "null"] },
          sourceIds: { type: "array", items: { type: "string" } }
        }
      },
      financialAssistance: {
        type: "object",
        additionalProperties: false,
        required: ["maxProjectCost", "subsidyStructure"],
        properties: {
          maxProjectCost: {
            type: "object",
            additionalProperties: false,
            required: ["manufacturing", "service"],
            properties: {
              manufacturing: {
                type: "object",
                additionalProperties: false,
                required: ["value", "supportedBy"],
                properties: {
                  value: { type: ["string", "null"] },
                  supportedBy: { type: "array", items: { type: "string" } }
                }
              },
              service: {
                type: "object",
                additionalProperties: false,
                required: ["value", "supportedBy"],
                properties: {
                  value: { type: ["string", "null"] },
                  supportedBy: { type: "array", items: { type: "string" } }
                }
              }
            }
          },
          subsidyStructure: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["beneficiaryCategory", "contribution", "urbanSubsidy", "ruralSubsidy", "supportedBy"],
              properties: {
                beneficiaryCategory: { type: ["string", "null"] },
                contribution: { type: ["string", "null"] },
                urbanSubsidy: { type: ["string", "null"] },
                ruralSubsidy: { type: ["string", "null"] },
                supportedBy: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      },
      eligibility: {
        type: "object",
        additionalProperties: false,
        required: ["ageLimit", "educationRequirement"],
        properties: {
          ageLimit: {
            type: "object",
            additionalProperties: false,
            required: ["value", "supportedBy"],
            properties: {
              value: { type: ["string", "null"] },
              supportedBy: { type: "array", items: { type: "string" } }
            }
          },
          educationRequirement: {
            type: "object",
            additionalProperties: false,
            required: ["value", "supportedBy"],
            properties: {
              value: { type: ["string", "null"] },
              supportedBy: { type: "array", items: { type: "string" } }
            }
          }
        }
      },
      documents: { type: "array", items: { type: "string" } },
      applicationProcess: {
        type: "object",
        additionalProperties: false,
        required: ["type", "steps", "sourceIds"],
        properties: {
          type: { type: ["string", "null"] },
          steps: { type: "array", items: { type: "string" } },
          sourceIds: { type: "array", items: { type: "string" } }
        }
      },
      importantDates: {
        type: "object",
        additionalProperties: false,
        required: ["applicationDeadline"],
        properties: {
          applicationDeadline: { type: ["string", "null"] }
        }
      },
      sources: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "url", "domain", "sourceType", "authorityLevel", "authorityScore", "retrievedAt"],
          properties: {
            id: { type: ["string", "null"] },
            title: { type: ["string", "null"] },
            url: { type: ["string", "null"] },
            domain: { type: ["string", "null"] },
            sourceType: { type: ["string", "null"] },
            authorityLevel: { type: ["string", "null"] },
            authorityScore: { type: ["number", "null"] },
            retrievedAt: { type: ["string", "null"] }
          }
        }
      }
    }
  }
};

module.exports = { researchSchema };
