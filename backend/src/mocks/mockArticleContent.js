/**
 * Dynamic Mock Article Content Builder from Master Research
 * Generates scheme-specific article JSON from masterResearch offline without external API calls.
 */

function buildDynamicMockArticle(masterResearch = {}) {
  const isPmegp = (masterResearch.schemeSlug || masterResearch.slug || "").includes("pmegp") ||
                  (masterResearch.scheme?.name || "").toLowerCase().includes("employment generation");
  const isPmmy = (masterResearch.schemeSlug || masterResearch.slug || "").includes("mudra") ||
                 (masterResearch.scheme?.name || "").toLowerCase().includes("mudra");
  const isCgtmse = (masterResearch.schemeSlug || masterResearch.slug || "").includes("cgtmse") ||
                   (masterResearch.scheme?.name || "").toLowerCase().includes("cgtmse");
  const isVishwakarma = (masterResearch.schemeSlug || masterResearch.slug || "").includes("vishwakarma") ||
                        (masterResearch.scheme?.name || "").toLowerCase().includes("vishwakarma");

  const schemeName = masterResearch.scheme?.name || masterResearch.schemeName || "Government Scheme 2026";
  const slug = masterResearch.schemeSlug || masterResearch.slug || "govt-scheme-2026";
  const canonical = `https://growthora.co.in/govtschemes/${slug}`;

  // 1. Ministry & Agency
  const ministry = masterResearch.scheme?.ministry?.officialName ||
                   (isPmegp ? "Ministry of Micro, Small & Medium Enterprises" :
                    (isPmmy ? "Ministry of Finance, Government of India" :
                     "Government of India"));

  const agency = masterResearch.scheme?.implementingAgency?.officialName ||
                 (isPmegp ? "Ministry of Micro, Small & Medium Enterprises (PMEGP Section)" :
                  (isPmmy ? "Member Lending Institutions (Commercial Banks, RRBs, SFBs, MFIs, NBFCs) / MUDRA SIDBI" :
                   "Implementing Agency / Banks"));

  const officialUrl = masterResearch.scheme?.officialWebsite || masterResearch.sources?.[0]?.url || "https://www.india.gov.in";

  // 2. SEO Title & Description
  let metaTitle, metaDescription;
  if (isPmegp) {
    metaTitle = `PMEGP Scheme 2026: Subsidy & Eligibility Guide`;
    metaDescription = `Complete guide to Prime Minister's Employment Generation Programme (PMEGP). Check eligibility, 15%-35% subsidy, project costs, and application.`;
  } else if (isPmmy) {
    metaTitle = `Pradhan Mantri Mudra Yojana (PMMY) Loan Scheme Guide 2026`;
    metaDescription = `Complete guide to Pradhan Mantri Mudra Yojana (PMMY). Check eligibility, Kishore, Tarun, Tarun Plus categories, required documents, and bank application.`;
  } else if (isCgtmse) {
    metaTitle = `CGTMSE Scheme 2026: Credit Guarantee & Limit Guide`;
    metaDescription = `Complete guide to Credit Guarantee Fund Trust for Micro and Small Enterprises (CGTMSE). Check coverage limits, eligibility, and bank coverage.`;
  } else if (isVishwakarma) {
    metaTitle = `PM Vishwakarma Scheme 2026: Artisan Benefit & Credit Guide`;
    metaDescription = `Complete guide to PM Vishwakarma Scheme. Check 18 traditional trades, toolkit incentive, collateral-free credit, and application process.`;
  } else {
    metaTitle = `${schemeName} Guide 2026: Eligibility & Benefits`.substring(0, 60);
    metaDescription = `Complete guide to ${schemeName}. Check eligibility criteria, key benefits, documents required, and application process.`.substring(0, 155);
  }

  // 3. Short Description / Snippet Answer
  let shortDesc = masterResearch.scheme?.shortDescription || masterResearch.scheme?.objective;
  if (!shortDesc) {
    if (isPmegp) {
      shortDesc = `PMEGP Scheme 2026 is a major credit-linked subsidy program administered by the Ministry of Micro, Small & Medium Enterprises. It provides 15% to 35% margin money subsidy on project costs up to ₹50 lakh for manufacturing and ₹20 lakh for service micro-enterprises.`;
    } else if (isPmmy) {
      shortDesc = `Pradhan Mantri Mudra Yojana (PMMY) provides collateral-free credit facilities up to ₹20 lakh to non-farm micro and small enterprises across India. The scheme empowers eligible entrepreneurs, shopkeepers, and traditional artisans across Shishu, Kishore, Tarun, and Tarun Plus categories for business expansion, self-employment, and sustainable growth.`;
    } else if (isCgtmse) {
      shortDesc = `The Credit Guarantee Scheme (CGS) under CGTMSE provides credit guarantee coverage to collateral-free credit facilities extended by eligible lending institutions to Micro and Small Enterprises (MSEs). The initiative strengthens institutional credit access, supports enterprise scaling, and enables first-generation entrepreneurs to secure essential business funding across India.`;
    } else if (isVishwakarma) {
      shortDesc = `PM Vishwakarma Scheme is a comprehensive central sector program designed to provide end-to-end support to traditional artisans and craftspeople across India. The scheme offers skill training, collateral-free credit assistance, modern digital incentive support, and brand identity recognition to empower traditional micro-enterprises and preserve indigenous craftsmanship.`;
    } else {
      shortDesc = `${schemeName} provides comprehensive financial backing, institutional credit access, and strategic development support for eligible micro and small business enterprises across India. The program empowers beneficiaries with formal banking integration, business scaling capabilities, and sustainable self-employment opportunities to foster long-term economic growth.`;
    }
  }

  // 4. Benefits (5 items)
  let rawBenefits = [];
  if (isPmegp) {
    rawBenefits = [
      { title: "Substantial Margin Money Subsidy", description: "Offers 15% to 35% government subsidy on admissible project outlay." },
      { title: "High Project Cost Coverage", description: "Supports maximum project outlay up to ₹50 lakh for manufacturing and ₹20 lakh for service units." },
      { title: "Targeted Category Upliftment", description: "Higher subsidy rates of 25% to 35% reserved for rural, SC, ST, OBC, women, and special category applicants." },
      { title: "Bank Credit Integration", description: "Integrates bank loan funding with government subsidy routed directly via DBT." },
      { title: "Self-Employment & Job Creation", description: "Generates continuous sustainable employment for unemployed youth and traditional artisans across India." }
    ];
  } else if (isPmmy) {
    const nonOverlappingLoanSummary = "Shishu (up to ₹50,000), Kishore (Above ₹50,000 and up to ₹5 lakh), Tarun (Above ₹5 lakh and up to ₹10 lakh), and Tarun Plus (Above ₹10 lakh and up to ₹20 lakh conditional on successful repayment of a previous Tarun loan)";
    rawBenefits = [
      { title: "Collateral-Free Credit Support", description: "Provides direct loan coverage up to ₹20 lakh without third-party collateral guarantee." },
      { title: "Four Tiered Loan Categories", description: `Covers ${nonOverlappingLoanSummary}.` },
      { title: "Institutional Banking Network", description: "Accessible through commercial banks, RRBs, SFBs, MFIs, and eligible non-banking financial institutions." },
      { title: "Coverage for Allied-to-Agriculture Activities", description: "Supports non-farm activities including dairy, poultry, beekeeping, fishery, and agri-processing." },
      { title: "Self-Employment & Business Scaling", description: "Fosters sustainable job creation and formal credit access for traditional artisans and micro units." }
    ];
  } else if (isCgtmse) {
    rawBenefits = [
      { title: "Collateral-Free Credit Guarantee", description: "Provides credit guarantee cover to lending institutions for collateral-free loans extended to MSEs." },
      { title: "Enhanced Institutional Access", description: "Facilitates seamless access to credit from commercial banks and financial institutions." },
      { title: "Support for First-Generation Entrepreneurs", description: "Helps new business owners secure capital without pledging personal assets or third-party collateral." },
      { title: "Comprehensive Coverage Limits", description: "Substantially covers credit risk for micro and small units across manufacturing and service sectors." },
      { title: "Business Scaling & Enterprise Support", description: "Encourages expansion, technological upgrade, and competitive scaling of micro-enterprises." }
    ];
  } else if (isVishwakarma) {
    rawBenefits = [
      { title: "End-to-End Artisan Recognition", description: "Provides PM Vishwakarma Certificate and ID Card to recognize traditional craftspeople." },
      { title: "Skill Upgradation & Verification", description: "Offers basic and advanced skill training programs with daily stipend support during training." },
      { title: "Toolkit Incentive Support", description: "Delivers financial toolkit incentive to modernise traditional tools and equipment." },
      { title: "Concessional Credit Support", description: "Provides collateral-free enterprise development credit facilities at concessional interest rates." },
      { title: "Digital & Marketing Integration", description: "Promotes digital transactions and links artisan products with national market platforms." }
    ];
  } else {
    rawBenefits = [
      { title: "Financial Assistance & Support", description: "Provides structured financial backing and credit facilities for business growth." },
      { title: "Institutional Access", description: "Accessible through participating financial institutions and bank branches." },
      { title: "Business Unit Scaling", description: "Encourages expansion and capability upgrade for micro and small enterprises." },
      { title: "Formal Economy Integration", description: "Integrates informal micro units into the formal banking and regulatory ecosystem." },
      { title: "Employment Generation", description: "Supports self-employment opportunities and sustainable local job creation." }
    ];
  }

  // 5. Eligibility (5 items)
  let defaultElig = [];
  if (isPmegp) {
    defaultElig = [
      { category: "Age Criterion", criteria: "Any individual applicant must be above 18 years of age." },
      { category: "Education Qualification", criteria: "Passed 8th standard for manufacturing projects above ₹10 lakh and service projects above ₹5 lakh." },
      { category: "New Enterprise Creation", criteria: "Assistance is available strictly for setting up new micro-enterprises." },
      { category: "Target Beneficiaries", criteria: "Individuals, Self-Help Groups, Institutions, Co-operative Societies, and Charitable Trusts." },
      { category: "Eligible Sectors", criteria: "New micro-enterprises in viable manufacturing and service activities across rural and urban locations." }
    ];
  } else if (isPmmy) {
    defaultElig = [
      { category: "Target Applicants", criteria: masterResearch.eligibility?.targetBeneficiaries?.value || "Any Indian citizen with a viable business plan for a non-farm income generating micro-enterprise." },
      { category: "Eligible Sectors", criteria: masterResearch.eligibility?.sectorCoverage?.value || "Manufacturing, trading, service sector units, artisans, shopkeepers, and allied-to-agriculture activities." },
      { category: "Enterprise Types", criteria: masterResearch.eligibility?.enterpriseTypes?.value || "Sole proprietorships, partnerships, small manufacturing units, service sector units, shopkeepers, and micro businesses." },
      { category: "Credit History", criteria: masterResearch.eligibility?.creditHistory?.value || "Applicant must not be a defaulter to any bank or financial institution and must have a satisfactory credit record." },
      { category: "Special Condition for Tarun Plus", criteria: "Tarun Plus category (Above ₹10 lakh and up to ₹20 lakh) requires successful earlier repayment of a Tarun loan." }
    ];
  } else if (isCgtmse) {
    defaultElig = [
      { category: "Target Beneficiaries", criteria: "New and existing Micro and Small Enterprises (MSEs) engaged in manufacturing or service activities." },
      { category: "Eligible Sector", criteria: "Micro and small business units across viable commercial sectors except retail trade." },
      { category: "Lending Institutions", criteria: "Loans must be sanctioned by eligible MLIs including commercial banks, RRBs, and SIDBI-approved institutions." },
      { category: "Enterprise Registration", criteria: "Enterprise must be legally registered as a micro or small unit under statutory regulations." },
      { category: "Credit Standing", criteria: "Borrower enterprise must possess a satisfactory track record and zero default history with lending institutions." }
    ];
  } else if (isVishwakarma) {
    defaultElig = [
      { category: "Target Artisans", criteria: "Traditional artisans and craftspeople working with hands and tools in one of the designated family-based traditional trades." },
      { category: "Age Limit", criteria: "Minimum age of eighteen years on the date of application." },
      { category: "Family Limitation", criteria: "Restricted to one member per family to ensure widespread coverage among traditional artisan households." },
      { category: "Occupation Status", criteria: "Applicant must be actively engaged in the relevant trade in the unorganized sector." },
      { category: "No Credit Default", criteria: "Must not have availed similar credit benefits under related central government schemes in recent years." }
    ];
  } else {
    defaultElig = [
      { category: "Target Applicants", criteria: "Micro and small enterprises, individual entrepreneurs, and traditional artisans." },
      { category: "Eligible Sectors", criteria: "Viable business units in manufacturing, trading, service, and allied activities." },
      { category: "Business Status", criteria: "Supports eligible new business creation as well as expansion of existing units." },
      { category: "Credit Record", criteria: "Applicants must possess a clean track record without defaults at financial institutions." },
      { category: "Institutional Norms", criteria: "Subject to verified scheme guidelines and lending institution credit policies." }
    ];
  }

  // 6. Documents (5 items)
  let defaultDocs = [];
  if (isPmegp) {
    defaultDocs = [
      { document: "Proof of Identity (Self-attested Aadhaar Card / Voter ID / PAN Card)", purpose: "Verification" },
      { document: "Proof of Residence (Aadhaar Card, Utility Bill, or Bank Statement)", purpose: "Verification (where applicable / subject to lender requirements)" },
      { document: "8th Class Pass Marksheet / Certificate", purpose: "Educational Qualification Verification (where applicable / subject to lender requirements)" },
      { document: "Detailed Project Report (DPR)", purpose: "Business Plan Assessment" },
      { document: "EDP Training / Caste / Special Category Certificate", purpose: "Category Eligibility Verification (where applicable / subject to lender requirements)" }
    ];
  } else if (isPmmy) {
    defaultDocs = [
      { document: "Proof of Identity (Self-attested Aadhaar Card, Voter ID, PAN Card, Passport, or Driving License)", purpose: "Verification" },
      { document: "Proof of Residence (Recent utility bill, Aadhaar Card, Voter ID, or Bank Statement)", purpose: "Verification (where applicable / subject to lender requirements)" },
      { document: "2 recent passport-size photographs of the applicant / partners / directors", purpose: "Verification" },
      { document: "Proof of Business Identity and Address (Business registration certificate, Udyam registration, or trade license)", purpose: "Verification" },
      { document: "Financial & Bank Documents (Bank statement for last 6 months, equipment quotations, and business proposal for Kishore, Tarun & Tarun Plus)", purpose: "Verification (where applicable / subject to lender requirements)" }
    ];
  } else if (isCgtmse) {
    defaultDocs = [
      { document: "Proof of Identity (Self-attested Aadhaar Card / PAN Card)", purpose: "Verification" },
      { document: "Proof of Business Address and Registration (Udyam Registration / GST / Trade License)", purpose: "Verification" },
      { document: "Detailed Business Proposal and Financial Statements", purpose: "Credit Assessment" },
      { document: "Bank Account Statement of the enterprise for the last six months", purpose: "Financial Assessment" },
      { document: "MLI Loan Application Form and CGTMSE Guarantee Coverage Request", purpose: "Guarantee Processing" }
    ];
  } else if (isVishwakarma) {
    defaultDocs = [
      { document: "Proof of Identity (Aadhaar Card and Mobile Number linked with Aadhaar)", purpose: "Verification" },
      { document: "Bank Account Details (Passbook or cancelled cheque)", purpose: "Verification and Incentive Disbursement" },
      { document: "Ration Card or Family Proof Document", purpose: "Family One-Member Eligibility Verification" },
      { document: "Trade Details and Skill Certificate", purpose: "Artisan Verification" },
      { document: "Passport Size Photograph of the applicant", purpose: "Identification" }
    ];
  } else {
    defaultDocs = [
      { document: "Proof of Identity (Aadhaar Card / Voter ID / PAN Card)", purpose: "Verification" },
      { document: "Proof of Residence (Utility Bill / Bank Statement)", purpose: "Verification (where applicable / subject to lender requirements)" },
      { document: "Passport Size Photographs", purpose: "Verification" },
      { document: "Business Registration / License Proof", purpose: "Verification" },
      { document: "Financial Documents (Bank statements for last 6 months)", purpose: "Verification (where applicable / subject to lender requirements)" }
    ];
  }

  // 7. FAQs (15 items)
  let faqs = [];
  if (isPmegp) {
    faqs = [
      { question: `What is ${schemeName}?`, answer: `${schemeName} is a credit-linked subsidy programme by the Ministry of Micro, Small & Medium Enterprises to generate self-employment in rural and urban areas.` },
      { question: `Who is eligible for PMEGP?`, answer: `Any individual above 18 years of age setting up a new micro-enterprise in manufacturing or service sector.` },
      { question: `What is the maximum project cost allowed under PMEGP?`, answer: `Maximum admissible project cost is ₹50 lakh for manufacturing sector and ₹20 lakh for service sector units.` },
      { question: `How much subsidy is provided under PMEGP?`, answer: `Subsidy ranges from 15% to 35% of project cost based on applicant category (General/Special) and location (Urban/Rural).` },
      { question: `Is there an educational requirement for PMEGP?`, answer: `Applicants must have passed 8th standard for manufacturing projects above ₹10 lakh and service projects above ₹5 lakh.` },
      { question: `Can existing business units apply for PMEGP?`, answer: `No, initial PMEGP assistance is strictly for setting up new micro-enterprises.` },
      { question: `What is the beneficiary contribution under PMEGP?`, answer: `Beneficiaries contribute 10% of project cost for General Category and 5% for Special Categories.` },
      { question: `Which agency implements PMEGP at the national level?`, answer: `Ministry of Micro, Small & Medium Enterprises (PMEGP Section) is the nodal implementing authority.` },
      { question: `How is the PMEGP subsidy disbursed?`, answer: `Subsidy is routed via Direct Benefit Transfer (DBT) into a lock-in bank account held with the lending bank.` },
      { question: `What documents are required to apply for PMEGP?`, answer: `Key documents include Aadhaar, 8th pass certificate (if applicable), Detailed Project Report (DPR), and caste/category certificate.` },
      { question: `Is EDP training mandatory for PMEGP beneficiaries?`, answer: `Yes, Entrepreneurship Development Programme (EDP) training is mandatory prior to loan disbursement.` },
      { question: `Can Self Help Groups (SHGs) apply for PMEGP?`, answer: `Yes, SHGs including those who have not availed any other subsidy are eligible to apply.` },
      { question: `What is the official website to apply for PMEGP?`, answer: `Applicants can apply online through the official PMEGP portal.` },
      { question: `Are there any income ceiling limits for PMEGP applicants?`, answer: `No, there is no income ceiling for individuals applying under the PMEGP scheme.` },
      { question: `Where can I get guidance for PMEGP project reports?`, answer: `Guidance is available at DIC centres, participating banks, or Growthora scheme guides.` }
    ];
  } else if (isPmmy) {
    faqs = [
      { question: `What is ${schemeName}?`, answer: `${schemeName} is a Government of India scheme providing collateral-free credit up to ₹20 lakh to non-farm micro and small enterprises.` },
      { question: `What are the loan categories under Mudra Loan?`, answer: `Mudra loans are classified into four non-overlapping categories: Shishu (up to ₹50,000), Kishore (Above ₹50,000 and up to ₹5 lakh), Tarun (Above ₹5 lakh and up to ₹10 lakh), and Tarun Plus (Above ₹10 lakh and up to ₹20 lakh).` },
      { question: `What is the limit and condition for Tarun Plus category?`, answer: `Tarun Plus offers loans Above ₹10 lakh and up to ₹20 lakh, available specifically to entrepreneurs who have successfully repaid a previous Tarun loan.` },
      { question: `Who is eligible to apply for a Mudra Loan?`, answer: `Any Indian citizen with a viable business plan for a non-farm income-generating activity in manufacturing, trading, services, or allied-to-agriculture sectors.` },
      { question: `Is third-party collateral required for PMMY loans?`, answer: `No, Mudra loans are collateral-free and do not require third-party guarantees as per RBI guidelines.` },
      { question: `What documents are required for a Mudra loan application?`, answer: `Applicants must submit identity proof, address proof, passport photos, business registration certificate, and 6 months bank statements.` },
      { question: `How can eligible applicants apply for a Mudra loan?`, answer: `Applications can be submitted online via member lending institution portals or offline at commercial bank branches, RRBs, SFBs, and MFIs.` },
      { question: `Are allied-to-agriculture activities covered under PMMY?`, answer: `Yes, non-farm activities allied to agriculture such as dairy, poultry, beekeeping, fishery, and agri-processing are fully covered.` },
      { question: `What types of business entities can apply for Mudra loans?`, answer: `Sole proprietorships, partnership firms, micro manufacturing units, service providers, shopkeepers, and traditional artisans are eligible.` },
      { question: `What is the credit history requirement for PMMY?`, answer: `Applicants must not be defaulters to any bank or financial institution and must possess a clean credit record.` },
      { question: `Who implements and oversees the Mudra loan scheme?`, answer: `PMMY is administered by the Ministry of Finance and implemented through MUDRA SIDBI and Member Lending Institutions.` },
      { question: `Are women entrepreneurs eligible for Mudra loans?`, answer: `Yes, women entrepreneurs and micro-enterprise owners are eligible and encouraged to apply across all categories.` },
      { question: `What is the repayment tenure for Mudra loans?`, answer: `Loan repayment tenure typically ranges from 3 to 5 years, subject to the credit terms of the lending bank.` },
      { question: `Can existing business units apply for loan enhancement?`, answer: `Yes, existing units with a clean repayment record can apply for higher loan categories such as Kishore, Tarun, or Tarun Plus.` },
      { question: `Where can borrowers verify official Mudra loan guidelines?`, answer: `Borrowers can access verified information on official bank portals, Ministry of Finance releases, or Growthora scheme guides.` }
    ];
  } else if (isCgtmse) {
    faqs = [
      { question: `What is Credit Guarantee Scheme under CGTMSE?`, answer: `CGTMSE provides credit guarantee coverage to banks and financial institutions for collateral-free credit extended to Micro and Small Enterprises.` },
      { question: `Who administers the CGTMSE scheme?`, answer: `CGTMSE is administered jointly by the Ministry of Micro, Small & Medium Enterprises and SIDBI.` },
      { question: `Which enterprises are eligible for CGTMSE coverage?`, answer: `New and existing Micro and Small Enterprises engaged in manufacturing and service activities.` },
      { question: `Is third-party collateral required under CGTMSE?`, answer: `No, CGTMSE enables eligible enterprises to secure loans without providing third-party collateral or collateral security.` },
      { question: `Which financial institutions offer CGTMSE backed loans?`, answer: `Eligible Member Lending Institutions including public sector banks, private commercial banks, RRBs, and SIDBI.` },
      { question: `How does CGTMSE benefit micro and small enterprises?`, answer: `It enables MSEs without collateral to access formal institutional credit for business establishment and expansion.` },
      { question: `What documents are required for CGTMSE credit cover?`, answer: `Proof of identity, business registration, Detailed Project Report, financial statements, and bank account details.` },
      { question: `Can new micro units apply for CGTMSE credit guarantee?`, answer: `Yes, both new micro units and existing viable small enterprises are eligible for credit guarantee cover.` },
      { question: `Are service sector enterprises covered under CGTMSE?`, answer: `Yes, eligible service sector enterprises are fully eligible for CGTMSE guarantee coverage.` },
      { question: `How is a CGTMSE guarantee claim processed by banks?`, answer: `Member lending institutions file claims directly with CGTMSE in case of default as per trust guidelines.` },
      { question: `Is credit evaluation required for CGTMSE loans?`, answer: `Yes, lending banks evaluate creditworthiness and business viability before sanctioning loans.` },
      { question: `Does CGTMSE support existing business expansion?`, answer: `Yes, existing units seeking credit for expansion or modernizing facilities can receive coverage.` },
      { question: `Where can borrowers verify CGTMSE bank guidelines?`, answer: `Guidelines are available on the official CGTMSE portal, SIDBI branches, and participating bank websites.` },
      { question: `What is the role of SIDBI in CGTMSE?`, answer: `SIDBI acts as a co-promoter alongside the MSME Ministry to manage and operate the credit guarantee trust.` },
      { question: `How to apply for a loan under CGTMSE?`, answer: `Entrepreneurs apply directly through participating Member Lending Institutions which then register guarantee coverage.` }
    ];
  } else if (isVishwakarma) {
    faqs = [
      { question: `What is PM Vishwakarma Scheme?`, answer: `PM Vishwakarma Scheme provides holistic end-to-end support to traditional artisans and craftspeople across India.` },
      { question: `Who is eligible to apply for PM Vishwakarma?`, answer: `Traditional artisans and craftspeople working with hands and tools in designated trades in the unorganized sector.` },
      { question: `Which trades are covered under PM Vishwakarma?`, answer: `Eighteen traditional trades including carpenters, blacksmiths, armorers, goldsmiths, potters, cobblers, and weavers.` },
      { question: `Which ministry administers PM Vishwakarma Scheme?`, answer: `The scheme is administered by the Ministry of Micro, Small and Medium Enterprises.` },
      { question: `What benefits are provided to artisans under PM Vishwakarma?`, answer: `Benefits include artisan identity recognition, skill training, toolkit incentive, collateral-free credit, and marketing support.` },
      { question: `Is collateral required for PM Vishwakarma credit support?`, answer: `No, enterprise development credit provided under PM Vishwakarma is collateral-free with concessional interest rates.` },
      { question: `What documents are needed for PM Vishwakarma registration?`, answer: `Aadhaar card, Aadhaar-linked mobile number, bank account details, and family ration card.` },
      { question: `How can artisans register for PM Vishwakarma online?`, answer: `Artisans can register at Common Services Centres (CSC) or through the official PM Vishwakarma portal.` },
      { question: `What skill verification is required for PM Vishwakarma?`, answer: `Skill verification involves three-step verification starting at the Gram Panchayat or Urban Local Body level.` },
      { question: `Are women artisans eligible for PM Vishwakarma?`, answer: `Yes, eligible women artisans engaged in traditional trades are fully encouraged to register.` },
      { question: `What toolkit assistance is available under PM Vishwakarma?`, answer: `Financial toolkit incentive support is provided to purchase modern tools and enhance productivity.` },
      { question: `How does PM Vishwakarma support traditional craftspeople?`, answer: `By integrating traditional skills into formal value chains, offering training stipends, and connecting artisans to markets.` },
      { question: `Which banks disburse loans under PM Vishwakarma?`, answer: `Commercial banks, Regional Rural Banks, and participating financial institutions disburse the credit facilities.` },
      { question: `Where can artisans access official PM Vishwakarma portals?`, answer: `Official details and registration portals are accessible at pmvishwakarma.gov.in.` },
      { question: `How does PM Vishwakarma preserve Indian heritage crafts?`, answer: `By empowering traditional craft families with skill upgrades, credit, and brand identity recognition.` }
    ];
  } else {
    const defaultFaqTopics = [
      "Overview", "Eligibility", "Benefits", "Ministry Administering", "Enterprise Coverage",
      "Documentation Requirements", "Application Portal", "Collateral Requirement", "Target Beneficiaries", "Financial Support",
      "Credit Evaluation", "Business Expansion", "Official Websites", "Implementing Agencies", "Self Employment Impact"
    ];
    faqs = defaultFaqTopics.map((topic) => ({
      question: `What are the ${topic.toLowerCase()} details for ${schemeName}?`,
      answer: `${schemeName} offers verified ${topic.toLowerCase()} support as specified by governing guidelines for micro and small business entities in India.`
    }));
  }

  const primaryKw = (masterResearch.schemeSlug || masterResearch.slug || "").replace(/-/g, ' ');
  const secKws = Array.from({ length: 19 }, (_, i) => `${schemeName.toLowerCase()} detail ${i + 1}`);

  return {
    searchIntent: `Informational & Transactional - ${schemeName} Eligibility and Benefits Guide`,
    primaryUserQuestion: `How to apply for ${schemeName} in 2026?`,
    secondaryUserQuestions: [
      `What is the eligibility for ${schemeName}?`,
      `What documents are needed for ${schemeName}?`
    ],
    seo: {
      primaryKeyword: primaryKw || `${schemeName} 2026`,
      secondaryKeywords: secKws,
      metaTitle,
      metaDescription,
      slug,
      canonicalPath: canonical
    },
    article: {
      h1: `${schemeName}: Eligibility, Benefits & Application Guide`,
      snippetAnswer: shortDesc,
      shortDescription: shortDesc,
      schemeAtAGlance: {
        "Official Scheme Name": schemeName,
        "Administering Ministry": ministry,
        "Implementing Agency": agency,
        "Official Source Authority": officialUrl,
        "Target Beneficiaries": masterResearch.eligibility?.targetBeneficiaries?.value || masterResearch.eligibility?.targetBeneficiary?.value || "Eligible Entrepreneurs & Micro Units",
        "Last Verified Date": "September 2026"
      },
      introduction: `${schemeName} is a flagship government initiative designed to empower micro-enterprises and entrepreneurs across India.`,
      whatIsScheme: `${schemeName} provides formal credit and financial assistance to help enterprises grow sustainably.`,
      detailedDescription: {
        introduction: `${schemeName} offers structured support for setting up and expanding micro and small business enterprises.`,
        financialAssistance: masterResearch.financialAssistance?.loanCategories || masterResearch.financialAssistance?.subsidyStructure || "Financial support as per scheme guidelines"
      },
      keyBenefits: rawBenefits.slice(0, 5),
      financialAssistance: masterResearch.financialAssistance?.loanCategories || masterResearch.financialAssistance?.subsidyStructure || "Financial support as per scheme guidelines",
      eligibility: defaultElig.slice(0, 5),
      documentsRequired: defaultDocs.slice(0, 5),
      applicationProcess: masterResearch.applicationProcess?.steps || [
        "Select applicable scheme category based on project requirements.",
        "Fill out application form with identity, residence, and project details.",
        "Submit required documents at designated implementing agency or bank branch."
      ],
      importantDates: [
        { event: "Scheme Status", date: "Active / Ongoing" }
      ],
      mistakesToAvoid: [
        "Submitting incomplete document proofs or unverified business details.",
        "Applying through unauthorized third-party agencies or middlemen."
      ],
      faqs: faqs.slice(0, 15),
      conclusion: `${schemeName} provides vital financial backing for business growth and self-employment. For eligibility evaluation, documentation, or application planning, consult Growthora.`
    }
  };
}

module.exports = {
  buildDynamicMockArticle,
  seo: {
    primaryKeyword: "PMEGP Scheme 2026",
    secondaryKeywords: ["PMEGP eligibility", "PMEGP subsidy"],
    metaTitle: "PMEGP Scheme 2026: Subsidy & Eligibility Guide",
    metaDescription: "Learn about the Prime Minister's Employment Generation Programme. Discover PMEGP Scheme 2026 eligibility, subsidy details, and application process.",
    slug: "pmegp-scheme-2026",
    canonicalPath: "/govtschemes/pmegp-scheme-2026"
  }
};
