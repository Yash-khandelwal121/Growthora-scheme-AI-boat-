const researchSchema = {
  name: "MASTER_SCHEME_RESEARCH_JSON",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["scheme", "financialAssistance", "eligibility", "documents", "applicationProcess", "importantDates", "sources", "conflictLog"],
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
        required: ["assistanceType", "grantAmount", "fundingLimit", "prototypeSupport", "equitySupport", "beneficiaryContribution", "otherSupport", "maxProjectCost", "subsidyStructure", "loanCategories"],
        properties: {
          assistanceType: { type: ["string", "null"] },
          grantAmount: {
            type: ["object", "null"],
            additionalProperties: false,
            required: ["value", "supportedBy"],
            properties: {
              value: { type: ["string", "null"] },
              breakdown: {
                type: ["array", "null"],
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["category", "limit"],
                  properties: {
                    category: { type: ["string", "null"] },
                    limit: { type: ["string", "null"] }
                  }
                }
              },
              supportedBy: { type: "array", items: { type: "string" } }
            }
          },
          fundingLimit: {
            type: ["object", "null"],
            additionalProperties: false,
            required: ["value", "supportedBy"],
            properties: {
              value: { type: ["string", "null"] },
              supportedBy: { type: "array", items: { type: "string" } }
            }
          },
          prototypeSupport: {
            type: ["object", "null"],
            additionalProperties: false,
            required: ["value", "supportedBy"],
            properties: {
              value: { type: ["string", "null"] },
              supportedBy: { type: "array", items: { type: "string" } }
            }
          },
          equitySupport: {
            type: ["object", "null"],
            additionalProperties: false,
            required: ["value", "supportedBy"],
            properties: {
              value: { type: ["string", "null"] },
              supportedBy: { type: "array", items: { type: "string" } }
            }
          },
          beneficiaryContribution: {
            type: ["object", "null"],
            additionalProperties: false,
            required: ["value", "supportedBy"],
            properties: {
              value: { type: ["string", "null"] },
              supportedBy: { type: "array", items: { type: "string" } }
            }
          },
          otherSupport: {
            type: ["object", "null"],
            additionalProperties: false,
            required: ["value", "supportedBy"],
            properties: {
              value: { type: ["string", "null"] },
              supportedBy: { type: "array", items: { type: "string" } }
            }
          },
          maxProjectCost: {
            type: ["object", "null"],
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
            type: ["array", "null"],
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
          },
          loanCategories: {
            type: ["array", "null"],
            items: {
              type: "object",
              additionalProperties: false,
              required: ["category", "limit", "supportedBy"],
              properties: {
                category: { type: ["string", "null"] },
                limit: { type: ["string", "null"] },
                supportedBy: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      },
      eligibility: {
        type: "object",
        additionalProperties: false,
        required: ["targetBeneficiary", "ageLimit", "educationRequirement", "incomeLimit", "otherCriteria"],
        properties: {
          targetBeneficiary: {
            type: ["object", "null"],
            additionalProperties: false,
            required: ["value", "supportedBy"],
            properties: {
              value: { type: ["string", "null"] },
              supportedBy: { type: "array", items: { type: "string" } }
            }
          },
          ageLimit: {
            type: ["object", "null"],
            additionalProperties: false,
            required: ["value", "supportedBy"],
            properties: {
              value: { type: ["string", "null"] },
              supportedBy: { type: "array", items: { type: "string" } }
            }
          },
          educationRequirement: {
            type: ["object", "null"],
            additionalProperties: false,
            required: ["value", "supportedBy"],
            properties: {
              value: { type: ["string", "null"] },
              supportedBy: { type: "array", items: { type: "string" } }
            }
          },
          incomeLimit: {
            type: ["object", "null"],
            additionalProperties: false,
            required: ["value", "supportedBy"],
            properties: {
              value: { type: ["string", "null"] },
              supportedBy: { type: "array", items: { type: "string" } }
            }
          },
          otherCriteria: {
            type: ["array", "null"],
            items: {
              type: "object",
              additionalProperties: false,
              required: ["criteria", "supportedBy"],
              properties: {
                criteria: { type: ["string", "null"] },
                supportedBy: { type: "array", items: { type: "string" } }
              }
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
      },
      conflictLog: {
        type: ["array", "null"],
        items: {
          type: "object",
          additionalProperties: false,
          required: ["field", "values", "sourceIds", "resolution", "status"],
          properties: {
            field: { type: ["string", "null"] },
            values: { type: "array", items: { type: "string" } },
            sourceIds: { type: "array", items: { type: "string" } },
            resolution: { type: ["string", "null"] },
            status: { type: ["string", "null"] }
          }
        }
      }
    }
  }
};

module.exports = { researchSchema };
