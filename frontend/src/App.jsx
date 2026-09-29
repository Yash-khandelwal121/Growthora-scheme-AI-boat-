import React, { useState, useEffect } from 'react';
import { Play, FileText, Download, Upload, CheckCircle2, Circle, Loader2, X, AlertCircle, ExternalLink } from 'lucide-react';
import { schemeAPI } from './services/api';
import './index.css';

const getWorkflowStages = (isGroq, isLiveWeb = true) => {
  return [
    { id: 'searching_official',     name: 'Searching Official Sources'     },
    { id: 'extracting_evidence',    name: 'Extracting Evidence'            },
    { id: 'normalizing_research',   name: 'Normalizing Research'           },
    { id: 'checking_critical_facts',name: 'Checking Critical Facts'        },
    { id: 'generating_content',     name: 'Generating Content'             },
    { id: 'quality_audit',          name: 'Quality Audit'                  },
    { id: 'word_document',          name: 'Preparing Word Document'        },
    { id: 'sanity_preview',         name: 'Preparing Sanity Preview'       },
  ];
};

/**
 * Normalizes the research API response into a safe, flat view-model.
 * Handles all four response shapes:
 *   - mock research
 *   - Groq free-live
 *   - Tavily + Groq live-web
 *   - production OpenAI / Gemini / Claude
 */
function normalizeResearchResponse(data) {
  if (!data) return null;

  // Tavily + Groq live-web stores source metrics in data.stats, not data.verification
  const stats = data.stats || {};
  const ver   = data.verification || {};

  const verification = {
    officialSourcesFound: stats.officialSourcesFound ?? ver.officialSourcesFound ?? 0,
    secondarySourcesFound: stats.secondarySourcesFound ?? ver.secondarySourcesFound ?? 0,
    sourcesRejected: stats.sourcesRejected ?? ver.sourcesRejected ?? 0,
    tavilyCalls: stats.tavilyCalls ?? 0,
    conflictsFound:   Array.isArray(ver.conflictsFound)   ? ver.conflictsFound   : [],
    conflictsResolved:Array.isArray(ver.conflictsResolved)? ver.conflictsResolved: [],
    needsHumanReview: Array.isArray(ver.needsHumanReview) ? ver.needsHumanReview : [],
    overallConfidence: ver.overallConfidence ?? null,
  };

  // scheme — Tavily puts fields one level deeper
  const rawScheme = data.scheme || {};
  const scheme = {
    name:           rawScheme.name ?? null,
    currentStatus:  rawScheme.status?.value ?? rawScheme.currentStatus ?? null,
    ministry:       rawScheme.ministry?.officialName ?? rawScheme.ministry ?? null,
    officialWebsite:rawScheme.officialWebsite ?? null,
  };

  return {
    ...data,
    _normalized: true,
    verification,
    scheme,
    sources:              Array.isArray(data.sources)             ? data.sources             : [],
    conflictLog:          Array.isArray(data.conflictLog)         ? data.conflictLog         : [],
    financialAssistance:  data.financialAssistance  || {},
    eligibility:          data.eligibility          || {},
    criticalFactCoverage: data.criticalFactCoverage ?? null,
    publishReadiness:     data.publishReadiness     ?? null,
  };
}

/** Lightweight error boundary — shows a readable panel instead of a blank page */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', backgroundColor: '#1e1e1e', color: '#f44336', minHeight: '100vh' }}>
          <h2 style={{ color: '#ff5252' }}>⚠ Rendering Error</h2>
          <p style={{ color: '#fff' }}>The application encountered an unexpected error.</p>
          <pre style={{ backgroundColor: '#000', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error?.message}
          </pre>
          <button
            style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [formData, setFormData] = useState({
    schemeName: '',
    primaryKeyword: '',
    location: 'India',
    outcome: 'Complete Scheme Guide',
    language: 'English',
  });
  
  const [secondaryKeywords, setSecondaryKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  
  const [providers, setProviders] = useState({
    openai: { configured: false },
    gemini: { configured: false },
    anthropic: { configured: false }
  });

  const [canonicalResearchData, setCanonicalResearchData] = useState(null);
  const [researchData, setResearchData] = useState(null);
  const [articleData, setArticleData] = useState(null);
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [workflowStatus, setWorkflowStatus] = useState(
    getWorkflowStages(false).reduce((acc, stage) => ({ ...acc, [stage.id]: 'pending' }), {})
  );

  const [sanityStatus, setSanityStatus] = useState({ configured: false, writeEnabled: false, documentTypeConfigured: false });
  const [sanityCategories, setSanityCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sanityPreview, setSanityPreview] = useState(null);
  const [isPushingSanity, setIsPushingSanity] = useState(false);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await schemeAPI.getProviderStatus();
        if (response.success) {
          setProviders(response.providers);
        }
      } catch (err) {
        console.error('Failed to fetch provider status');
      }
    };
    
    const fetchSanity = async () => {
      try {
        const response = await schemeAPI.getSanityStatus();
        if (response.success) {
          setSanityStatus(response);
        }
      } catch (err) {
        console.error('Failed to fetch sanity status');
      }
    };
    
    const fetchCategories = async () => {
      try {
        const response = await schemeAPI.getSanityCategories();
        if (response.success) {
          setSanityCategories(response.categories);
        }
      } catch (err) {
        console.error('Failed to fetch sanity categories');
      }
    };
    
    fetchProviders();
    fetchSanity();
    fetchCategories();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleKeywordAdd = (inputString) => {
    if (!inputString) return;
    const vals = inputString.split(/[\n,\r]+/).map(s => s.trim()).filter(Boolean);
    if (vals.length > 0) {
      setSecondaryKeywords(prev => {
        const next = [...prev];
        vals.forEach(v => {
          if (!next.includes(v)) next.push(v);
        });
        return next;
      });
    }
  };

  const handleKeywordKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleKeywordAdd(keywordInput);
      setKeywordInput('');
    }
  };

  const handleKeywordBlur = () => {
    if (keywordInput.trim()) {
      handleKeywordAdd(keywordInput);
      setKeywordInput('');
    }
  };

  const handleKeywordPaste = (e) => {
    e.preventDefault();
    const pasteText = e.clipboardData.getData('text');
    handleKeywordAdd(pasteText);
  };

  const removeKeyword = (kwToRemove) => {
    setSecondaryKeywords(secondaryKeywords.filter((kw) => kw !== kwToRemove));
  };

  const validateForm = () => {
    if (!formData.schemeName || !formData.primaryKeyword || !formData.location || !formData.outcome || !formData.language) {
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // 1. CLEAR ALL PREVIOUS STATE
    setFeedback({ type: '', message: '' });
    setCanonicalResearchData(null);
    setResearchData(null);
    setArticleData(null);
    setSanityPreview(null);
    
    if (!validateForm()) {
      setFeedback({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    setIsGenerating(true);
    
    // Check if live web mode might be active. We can't know for sure until response, 
    // but we can assume normal pipeline first and update on response, or start with a generic one.
    // Let's just use the default ones and update upon response.
    const isGroq = providers.groq?.freeLiveTestEnabled;
    const stages = getWorkflowStages(isGroq, true);
    setWorkflowStatus(stages.reduce((acc, stage) => ({ ...acc, [stage.id]: 'pending' }), {}));
    
    setWorkflowStatus(prev => ({
      ...prev,
      searching_official: 'running',
      extracting_evidence: 'running'
    }));

    // If there is any leftover input text, add it
    if (keywordInput.trim()) {
      handleKeywordAdd(keywordInput);
      setKeywordInput('');
    }

    try {
      // Need to pass the updated secondary keywords, so we build it locally in case we just added one
      const currentSecondaryKeywords = [...secondaryKeywords];
      const pendingKw = keywordInput.trim();
      if (pendingKw) {
         pendingKw.split(',').map(s => s.trim()).filter(Boolean).forEach(k => {
           if (!currentSecondaryKeywords.includes(k)) currentSecondaryKeywords.push(k);
         });
      }

      const response = await schemeAPI.research({
        ...formData,
        secondaryKeywords: currentSecondaryKeywords
      });
      
      if (response.success) {
        setFeedback({ type: 'success', message: response.message });
        // Normalize before storing — handles all response shapes safely
        setCanonicalResearchData(response.data);
        const normalized = normalizeResearchResponse(response.data);
        setResearchData(normalized);
        
        setWorkflowStatus(prev => ({
          ...prev,
          searching_official: 'completed',
          extracting_evidence: 'completed',
          normalizing_research: 'completed',
          checking_critical_facts: 'completed'
        }));
      } else {
        const errData = response;
        let errMsg = errData.message || 'Research failed';
        if (errData.errorCategory === 'RATE_LIMITED') {
          const mins = errData.retryAfterSeconds ? Math.ceil(errData.retryAfterSeconds / 60) : 15;
          errMsg = `${errData.message} Retry available in approximately ${mins} minutes.`;
        }
        setFeedback({ type: 'error', message: errMsg });
        setWorkflowStatus(prev => ({ ...prev, searching_official: 'failed', extracting_evidence: 'failed' }));
      }
    } catch (err) {
      const errData = err.response?.data;
      let errMsg = errData?.message || err.message || 'An error occurred during research';
      if (errData?.errorCategory === 'RATE_LIMITED') {
        const mins = errData.retryAfterSeconds ? Math.ceil(errData.retryAfterSeconds / 60) : 15;
        errMsg = `${errData.message} Retry available in approximately ${mins} minutes.`;
      }
      setFeedback({ 
        type: 'error', 
        message: errMsg 
      });
      setWorkflowStatus(prev => ({ ...prev, searching_official: 'failed', extracting_evidence: 'failed' }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!canonicalResearchData) return;
    setIsGeneratingArticle(true);
    setFeedback({ type: 'info', message: 'Generating article content...' });
    try {
      setWorkflowStatus(prev => ({ ...prev, generating_content: 'running' }));
      const response = await schemeAPI.generateContent({ research: canonicalResearchData });
      
      if (response && (response.success || response.data?.success !== false)) {
        let payload = response.data || response;
        if (payload.data) payload = payload.data;
        if (payload.finalArticle) payload = payload.finalArticle;
        
        if (payload.seo && payload.article) {
          setArticleData(payload);
          setFeedback({ type: 'success', message: 'Article content generated successfully!' });
          setWorkflowStatus(prev => ({ ...prev, generating_content: 'completed', quality_audit: 'completed' }));
        } else {
          throw new Error('Received unexpected content shape from backend.');
        }
      } else {
        throw new Error(response.message || 'Content generation blocked by backend constraints.');
      }
    } catch (err) {
      setArticleData(null);
      const errData = err.response?.data || {};
      let errMsg = errData.message || err.message || 'Failed to connect to backend';
      
      if (errData.errorCategory === 'INSUFFICIENT_CRITICAL_FACT_COVERAGE') {
        errMsg = `Generation blocked: Critical fact coverage is ${errData.criticalFactCoverage}%. Missing: ${(errData.missingCriticalFields || []).join(', ')}`;
      } else if (errData.errorCategory === 'RATE_LIMITED') {
        const mins = errData.retryAfterSeconds ? Math.ceil(errData.retryAfterSeconds / 60) : 15;
        errMsg = `${errData.message} Retry available in approximately ${mins} minutes.`;
      }
      
      setFeedback({ type: 'error', message: errMsg });
      setWorkflowStatus(prev => ({ ...prev, generating_content: 'failed', quality_audit: 'failed' }));
    } finally {
      setIsGeneratingArticle(false);
    }
  };

  const handleExportDocx = async () => {
    console.log("[DOCX_CLICK]");
    console.log("[DOCX_ARTICLE_KEYS]", Object.keys(articleData || {}));

    if (!articleData) {
      setFeedback({ type: 'error', message: 'No article data available.' });
      return;
    }
    
    if (!articleData.article || !articleData.seo || !articleData.audit) {
      setFeedback({ type: 'error', message: 'Article data is missing required sections (article, seo, audit).' });
      return;
    }
    
    console.log("[DOCX_GATE_VALUES]", {
      publishReadiness: articleData?.publishReadiness,
      audit: articleData?.audit,
      auditPassed: articleData?.audit?.passed,
      auditScore: articleData?.audit?.score,
      factGuard: articleData?.factGuard,
      factGuardPassed: articleData?.factGuard?.passed,
      factGuardFailures: articleData?.factGuard?.failures,
      criticalFactCoverage: articleData?.criticalFactCoverage
    });

    const auditScore =
      articleData.audit?.score ??
      articleData.audit?.overallScore ??
      articleData.auditResult?.score ??
      0;

    const auditPassed =
      articleData.audit?.passed ??
      articleData.auditResult?.passed ??
      (auditScore >= 95);

    const factGuardFailures =
      articleData.factGuard?.failures ??
      articleData.factGuard?.failureCount ??
      articleData.factGuardResult?.failures ??
      articleData.audit?.failures?.filter(f => f.toLowerCase().includes('factguard'))?.length ??
      0;

    const factGuardPassed =
      articleData.factGuard?.passed ??
      articleData.factGuardResult?.passed ??
      (factGuardFailures === 0 && (articleData.factGuard || articleData.factGuardResult || articleData.audit));

    const coverage =
      articleData.criticalFactCoverage?.coveragePercent ??
      (typeof articleData.criticalFactCoverage === 'number' ? articleData.criticalFactCoverage : 0);

    const readiness = articleData.publishReadiness;

    const isReady = (
      factGuardPassed &&
      coverage >= 95 &&
      auditScore >= 95 &&
      readiness === 'ready'
    );

    if (!isReady) {
      setFeedback({ type: 'error', message: 'Content must pass FactGuard and Audit before generating DOCX.' });
      return;
    }

    setIsExporting(true);
    setFeedback({ type: 'info', message: 'Generating Word Document...' });
    try {
      setWorkflowStatus(prev => ({ ...prev, word_document: 'running' }));
      const response = await schemeAPI.exportDocx({ finalArticle: articleData });
      
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        
      if (blob.size === 0) {
        throw new Error('Received empty file from server.');
      }
        
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers && response.headers['content-disposition'];
      let filename = 'scheme-guide.docx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch.length >= 2) {
          filename = filenameMatch[1];
        }
      }
      if (!filename.toLowerCase().endsWith('.docx')) {
        filename += '.docx';
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      
      setFeedback({ type: 'success', message: 'Word document downloaded successfully.' });
      setWorkflowStatus(prev => ({ ...prev, word_document: 'completed' }));
    } catch (err) {
      let errMsg = 'Could not generate Word document.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errMsg = json.message || json.error || errMsg;
        } catch (e) {
          errMsg = text || errMsg;
        }
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      } else if (err.message) {
        errMsg = err.message;
      }
      setFeedback({ type: 'error', message: errMsg });
      setWorkflowStatus(prev => ({ ...prev, word_document: 'failed' }));
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreviewSanity = async () => {
    if (!articleData) return;
    setFeedback({ type: 'info', message: 'Generating Sanity Preview...' });
    try {
      const response = await schemeAPI.previewSanity(articleData, selectedCategory);
      if (response.success) {
        setSanityPreview(response);
        setFeedback({ type: 'success', message: 'Sanity Preview generated.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Could not generate Sanity Preview.' });
    }
  };

  const handlePushSanity = async () => {
    if (!articleData) return;
    if (!selectedCategory) {
      setFeedback({ type: 'error', message: 'Please select a Category before pushing to Sanity.' });
      return;
    }
    setIsPushingSanity(true);
    setFeedback({ type: 'info', message: 'Creating Sanity Draft...' });
    try {
      setWorkflowStatus(prev => ({ ...prev, sanity_draft: 'running' }));
      const response = await schemeAPI.pushSanity(articleData, selectedCategory);
      if (response.success) {
        setFeedback({ type: 'success', message: `Draft ${response.operation} successfully (ID: ${response.draftId})` });
        setWorkflowStatus(prev => ({ ...prev, sanity_draft: 'completed' }));
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Could not push to Sanity.' });
      setWorkflowStatus(prev => ({ ...prev, sanity_draft: 'failed' }));
    } finally {
      setIsPushingSanity(false);
    }
  };

  const StatusIcon = ({ status }) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="text-success" size={20} />;
      case 'simulated':
        return <CheckCircle2 className="text-info" size={20} />;
      case 'running':
        return <Loader2 className="animate-spin text-info" size={20} />;
      case 'failed':
      case 'warning':
        return <AlertCircle className="text-error" size={20} />;
      default:
        return <Circle className="text-muted" size={20} />;
    }
  };

  const getConfidenceColor = (level) => {
    switch (level) {
      case 'high': return '#2e7d32'; // success
      case 'medium': return '#ed6c02'; // warning
      case 'low': return '#d32f2f'; // error
      default: return '#666666'; // muted
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <img 
          src="/logo.png" 
          alt="Growthora Logo" 
          className="header-logo"
        />
        <h1>Growthora Scheme AI</h1>
        <p>Research • Verify • Optimize • Publish</p>
      </header>

      {providers.tavily?.liveSearchEnabled ? (
        <div style={{
          backgroundColor: '#0288d1',
          color: '#fff',
          textAlign: 'center',
          padding: '0.75rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          borderRadius: '4px'
        }}>
          LIVE WEB RESEARCH — TAVILY + GROQ<br/>
          <span style={{ fontWeight: 'normal' }}>Tavily is retrieving live web evidence.<br/>Groq is verifying, structuring and generating content.</span>
        </div>
      ) : providers.groq?.freeLiveTestEnabled && (
        providers.groq?.liveWebResearchEnabled ? (
          <div style={{
            backgroundColor: '#2e7d32',
            color: '#fff',
            textAlign: 'center',
            padding: '0.75rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            borderRadius: '4px'
          }}>
            LIVE WEB RESEARCH — GROQ<br/>
            <span style={{ fontWeight: 'normal' }}>Real Groq AI and live web research are active. Government sources are being checked before content generation.</span>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#0288d1',
            color: '#fff',
            textAlign: 'center',
            padding: '0.75rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            borderRadius: '4px'
          }}>
            FREE LIVE TEST MODE — GROQ<br/>
            <span style={{ fontWeight: 'normal' }}>Real Groq AI API calls are active. OpenAI, Gemini and Claude APIs are not being called. Live official-source web verification is OFF.</span>
          </div>
        )
      )}

      {researchData?.mode === 'mock' && (
        <div style={{
          backgroundColor: '#ff9800',
          color: '#fff',
          textAlign: 'center',
          padding: '0.75rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          borderRadius: '4px'
        }}>
          TEST MODE — MOCK RESEARCH: Development Test Mode — AI providers were not called.
        </div>
      )}

      <main className="main-content">
        {/* Left Column: Form */}
        <section className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title" style={{ borderBottom: 'none', margin: 0, padding: 0 }}>Content Generation Config</h2>
              <div style={{ fontSize: '0.8rem', display: 'flex', gap: '1rem', color: 'var(--color-text-muted)' }}>
                <div><strong>OpenAI:</strong> {providers.openai.configured ? '✅' : '❌'}</div>
                <div><strong>Gemini:</strong> {providers.gemini.configured ? '✅' : '❌'}</div>
                <div><strong>Claude:</strong> {providers.anthropic.configured ? '✅' : '❌'}</div>
                {providers.groq?.configured && (
                  <div><strong>Groq:</strong> ✅</div>
                )}
              </div>
            </div>
            
            <div style={{ fontSize: '0.8rem', display: 'flex', gap: '1rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-alt)', padding: '0.5rem', borderRadius: '4px' }}>
              <div><strong>Sanity:</strong> {sanityStatus.configured ? 'Configured' : 'Not Configured'}</div>
              <div><strong>Write Mode:</strong> {sanityStatus.writeEnabled ? 'Enabled' : 'Disabled'}</div>
              <div><strong>Doc Type:</strong> {sanityStatus.documentTypeConfigured ? 'Configured' : 'Missing'}</div>
            </div>
          </div>
          
          {feedback.message && (
            <div style={{
              padding: '1rem',
              marginBottom: '1.5rem',
              borderRadius: '8px',
              backgroundColor: feedback.type === 'error' ? 'rgba(211,47,47,0.1)' : 'rgba(46,125,50,0.1)',
              color: feedback.type === 'error' ? '#d32f2f' : '#2e7d32',
              fontWeight: 500
            }}>
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="schemeName">Scheme / Topic *</label>
              <input
                type="text"
                id="schemeName"
                name="schemeName"
                className="form-input"
                placeholder="PMEGP Scheme 2026"
                value={formData.schemeName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="primaryKeyword">Primary Keyword *</label>
              <input
                type="text"
                id="primaryKeyword"
                name="primaryKeyword"
                className="form-input"
                placeholder="PMEGP Scheme 2026"
                value={formData.primaryKeyword}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Secondary Keywords</label>
              <div className="tags-input-container">
                {secondaryKeywords.map((kw, index) => (
                  <span key={index} className="tag">
                    {kw}
                    <X className="tag-close" size={14} onClick={() => removeKeyword(kw)} />
                  </span>
                ))}
                <input
                  type="text"
                  className="tag-input"
                  placeholder={secondaryKeywords.length === 0 ? "Press Enter or comma to add..." : ""}
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                  onBlur={handleKeywordBlur}
                  onPaste={handleKeywordPaste}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="location">Target Location *</label>
              <select
                id="location"
                name="location"
                className="form-select"
                value={formData.location}
                onChange={handleInputChange}
                required
              >
                <option value="India">India</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="outcome">Desired Outcome *</label>
              <select
                id="outcome"
                name="outcome"
                className="form-select"
                value={formData.outcome}
                onChange={handleInputChange}
                required
              >
                <option value="Complete Scheme Guide">Complete Scheme Guide</option>
                <option value="Eligibility Guide">Eligibility Guide</option>
                <option value="Benefits Guide">Benefits Guide</option>
                <option value="Application Guide">Application Guide</option>
                <option value="Scheme Comparison">Scheme Comparison</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="language">Language *</label>
              <select
                id="language"
                name="language"
                className="form-select"
                value={formData.language}
                onChange={handleInputChange}
                required
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={isGenerating}>
              {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
              {isGenerating ? 'Research in progress...' : 'Research & Generate'}
            </button>
          </form>
        </section>

        {/* Right Column: Progress & Results */}
        <div className="card-stack" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <section className="card">
            <h2 className="card-title">Generation Pipeline</h2>
            <ul className="workflow-list">
              {getWorkflowStages(providers.groq?.freeLiveTestEnabled && researchData?.mode !== 'mock', providers.tavily?.liveSearchEnabled).map((stage) => {
                return (
                  <li key={stage.id} className="workflow-item">
                    <div className="workflow-icon">
                      <StatusIcon status={status} />
                    </div>
                    <span className="workflow-name">{stage.name}</span>
                    <span className={`workflow-status status-${status}`}>
                      {status}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {researchData && (
            <section className="card">
              <h2 className="card-title">Research Results</h2>
              
              {researchData?.mode === 'mock' && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fff3e0', border: '1px solid #ffcc80', borderRadius: '4px', color: '#ed6c02', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  TEST MODE — MOCK RESEARCH<br/>
                  <span style={{ fontWeight: 'normal' }}>Development Test Mode — AI providers were not called.</span>
                </div>
              )}
              
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Verification Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                  <div><strong>Official Sources Found:</strong> {researchData.verification?.officialSourcesFound ?? 0}</div>
                  <div><strong>Overall Confidence:</strong> <span style={{ color: getConfidenceColor(researchData.verification?.overallConfidence?.level), fontWeight: 'bold', textTransform: 'capitalize' }}>{researchData.verification?.overallConfidence?.level || 'N/A'}</span></div>
                  <div><strong>Conflicts Resolved:</strong> {researchData.verification?.conflictsResolved?.length ?? 0}</div>
                  <div><strong>Needs Human Review:</strong> {researchData.verification?.needsHumanReview?.length ?? 0}</div>
                  {researchData.verification?.tavilyCalls > 0 && (
                    <div><strong>Tavily Searches:</strong> {researchData.verification.tavilyCalls}</div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Scheme Overview</h3>
                <div style={{ fontSize: '0.9rem' }}>
                  <div><strong>Name:</strong> {researchData.scheme?.name || 'N/A'}</div>
                  <div><strong>Status:</strong> {researchData.scheme?.currentStatus || 'N/A'}</div>
                  <div><strong>Ministry:</strong> {researchData.scheme?.ministry || 'N/A'}</div>
                  {researchData.scheme?.officialWebsite && (
                    <div><strong>Website:</strong> <a href={researchData.scheme.officialWebsite} target="_blank" rel="noopener noreferrer">Visit Portal <ExternalLink size={12}/></a></div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Sources ({researchData.sources?.length || 0})</h3>
                <ul style={{ fontSize: '0.85rem', paddingLeft: '1.2rem', color: 'var(--color-text-muted)' }}>
                  {researchData.sources?.map((s, idx) => (
                    <li key={idx} style={{ marginBottom: '0.5rem', backgroundColor: 'var(--color-bg-alt)', padding: '0.5rem', borderRadius: '4px' }}>
                      <div style={{ fontWeight: 'bold' }}>{s.title || s.domain}</div>
                      <div>
                        <span style={{ fontWeight: '500', color: s.authorityScore >= 90 ? 'green' : (s.authorityScore >= 60 ? 'orange' : 'gray') }}>
                          [{s.authorityLevel || 'unknown'}]
                        </span>
                        {' | '}Domain: {s.domain}
                        {' | '}Supports Facts: {s.id ? 'Yes (traceable)' : 'Unverified'}
                      </div>
                      <div style={{ marginTop: '0.25rem' }}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-info)', textDecoration: 'none' }}>
                          View URL <ExternalLink size={10} style={{ display: 'inline' }} />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="actions-grid">
                {!articleData ? (
                  <button className="btn-primary" onClick={handleGenerateContent} disabled={isGeneratingArticle}>
                    {isGeneratingArticle ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                    {isGeneratingArticle ? 'Generating...' : 'Generate Content'}
                  </button>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Sanity Category (Required for Draft)</label>
                      <select 
                        className="input-field" 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}
                      >
                        <option value="">-- Select Category --</option>
                        {sanityCategories.map(cat => (
                          <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <button className="btn-secondary" onClick={handleExportDocx} disabled={isExporting}>
                      {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                      {isExporting ? 'Generating Word Document...' : 'Download Word'}
                    </button>
                    <button className="btn-secondary" onClick={handlePreviewSanity}>
                      <FileText size={18} />
                      Preview Sanity
                    </button>
                    <button 
                      className="btn-secondary" 
                      onClick={handlePushSanity} 
                      disabled={!selectedCategory || !sanityStatus.configured || !sanityStatus.writeEnabled || articleData.mode === 'mock' || !articleData.audit?.passed || (articleData.humanReview?.length > 0) || isPushingSanity}
                    >
                      {isPushingSanity ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                      {isPushingSanity ? 'Creating Sanity Draft...' : 'Create Sanity Draft'}
                    </button>
                    {sanityStatus.studioUrl && (
                      <button className="btn-secondary" onClick={() => window.open(sanityStatus.studioUrl, '_blank')}>
                        <ExternalLink size={18} />
                        Open in Sanity
                      </button>
                    )}
                  </>
                )}
              </div>
              
              {articleData?.mode === 'mock' && (
                <div style={{ marginTop: '1rem', color: '#ed6c02', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  TEST MODE — MOCK CONTENT: No paid AI content API was called.
                </div>
              )}
            </section>
          )}

          {articleData && (
            <section className="card">
              <h2 className="card-title">Article Preview & SEO</h2>
              
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--color-bg-alt)', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--color-text)' }}>SEO Meta</h3>
                <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <strong>Meta Title ({articleData.seo?.metaTitle?.length || 0}/50):</strong> {articleData.seo?.metaTitle}
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <strong>Meta Description ({articleData.seo?.metaDescription?.length || 0}/150):</strong> {articleData.seo?.metaDescription}
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <strong>Slug:</strong> {articleData.seo?.slug}
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <strong>Audit Score:</strong> <span style={{ color: articleData.audit?.passed ? 'green' : 'red', fontWeight: 'bold' }}>{articleData.audit?.score || 0}/100</span>
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <strong>Schema Generated:</strong> {(articleData.schema || articleData.schemaMarkup) ? 'Yes' : 'No'}
                </div>
                {articleData.humanReview?.length > 0 && (
                  <div style={{ fontSize: '0.85rem', color: '#d32f2f', marginTop: '0.5rem' }}>
                    <strong>Human Review Warnings:</strong>
                    <ul style={{ paddingLeft: '1rem', marginTop: '0.25rem' }}>
                      {articleData.humanReview.map((warn, i) => <li key={i}>{warn}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: '#fff', color: '#000' }}>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{articleData.article?.h1 || articleData.seo?.metaTitle}</h1>
                
                <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderLeft: '4px solid #1976d2', marginBottom: '1.5rem' }}>
                  <strong>Snippet Answer:</strong> {articleData.article?.snippetAnswer || articleData.article?.shortDescription}
                </div>
                
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Scheme At A Glance</h3>
                <pre style={{ fontSize: '0.8rem', padding: '1rem', backgroundColor: '#f5f5f5', overflowX: 'auto', marginBottom: '1.5rem' }}>
                  {JSON.stringify(articleData.article?.schemeAtAGlance, null, 2)}
                </pre>
                
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Detailed Explanation</h3>
                <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {Array.isArray(articleData.article?.detailedExplanation)
                    ? articleData.article.detailedExplanation.map(d => d.text || JSON.stringify(d)).join(' ')
                    : (typeof articleData.article?.detailedDescription === 'string'
                      ? articleData.article?.detailedDescription
                      : (articleData.article?.detailedDescription?.introduction
                        ? `${articleData.article.detailedDescription.introduction} ${articleData.article.detailedDescription.financialAssistance || ''}`
                        : JSON.stringify(articleData.article?.detailedDescription || '', null, 2)))}
                </p>
                
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Benefits ({articleData.article?.keyBenefits?.length || articleData.article?.benefits?.length || 0})</h3>
                <ul style={{ fontSize: '0.9rem', marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                  {(articleData.article?.keyBenefits || articleData.article?.benefits || [])?.map((b, i) => (
                    <li key={i}>
                      {typeof b === 'string' ? b : (b.title ? <span><strong>{b.title}:</strong> {b.description}</span> : (b.description || JSON.stringify(b)))}
                    </li>
                  ))}
                </ul>
                
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Financial Assistance</h3>
                <pre style={{ fontSize: '0.8rem', padding: '1rem', backgroundColor: '#f5f5f5', overflowX: 'auto', marginBottom: '1.5rem' }}>
                  {typeof articleData.article?.financialAssistance === 'string'
                    ? articleData.article?.financialAssistance
                    : JSON.stringify(articleData.article?.financialAssistance, null, 2)}
                </pre>
                
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Eligibility ({articleData.article?.eligibility?.length || 0})</h3>
                <ul style={{ fontSize: '0.9rem', marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                  {articleData.article?.eligibility?.map((e, i) => (
                    <li key={i}>
                      {typeof e === 'string' ? e : (e.category ? <span><strong>{e.category}:</strong> {e.criteria}</span> : (e.criteria || JSON.stringify(e)))}
                    </li>
                  ))}
                </ul>
                
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Documents ({articleData.article?.documentsRequired?.length || articleData.article?.documents?.length || 0})</h3>
                <ul style={{ fontSize: '0.9rem', marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                  {(articleData.article?.documentsRequired || articleData.article?.documents || [])?.map((d, i) => (
                    <li key={i}>
                      {typeof d === 'string' ? d : `${d.document || d.name || 'Document'}${d.purpose ? ` (${d.purpose})` : ''}`}
                    </li>
                  ))}
                </ul>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Application Process</h3>
                <ol style={{ fontSize: '0.9rem', marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                  {Array.isArray(articleData.article?.applicationProcess)
                    ? articleData.article?.applicationProcess?.map((a, i) => <li key={i}>{typeof a === 'string' ? a : JSON.stringify(a)}</li>)
                    : (articleData.article?.applicationProcess?.steps
                      ? articleData.article.applicationProcess.steps.map((a, i) => <li key={i}>{typeof a === 'string' ? a : JSON.stringify(a)}</li>)
                      : null)}
                </ol>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Mistakes to Avoid</h3>
                <ul style={{ fontSize: '0.9rem', marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                  {articleData.article?.mistakesToAvoid?.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
                
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>FAQs ({articleData.article?.faqs?.length || 0})</h3>
                <div style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {articleData.article?.faqs?.map((faq, i) => (
                    <div key={i} style={{ marginBottom: '1rem' }}>
                      <strong>Q: {faq.question}</strong><br/>
                      A: {faq.answer}
                    </div>
                  ))}
                </div>
                
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Conclusion</h3>
                <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>{articleData.article?.conclusion}</p>
              </div>
            </section>
          )}

          {sanityPreview && sanityPreview.document && (
            <section className="card">
              <h2 className="card-title">Sanity CMS Preview (Dry-Run)</h2>
              <div style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', overflowX: 'auto', maxHeight: '500px' }}>
                <div style={{ marginBottom: '0.5rem', color: '#569cd6' }}><strong>Document Type:</strong> {sanityPreview.documentType}</div>
                <div style={{ marginBottom: '0.5rem', color: '#ce9178' }}><strong>Draft ID:</strong> {sanityPreview.draftId}</div>
                <div style={{ marginBottom: '0.5rem', color: '#dcdcaa' }}><strong>Name:</strong> {sanityPreview.document.name || 'N/A'}</div>
                <div style={{ marginBottom: '0.5rem', color: '#ce9178' }}><strong>Slug:</strong> {sanityPreview.document.slug?.current || 'N/A'}</div>
                <div style={{ marginBottom: '0.5rem', color: '#9cdcfe' }}><strong>Short Description:</strong> {sanityPreview.document.shortDescription || 'N/A'}</div>
                <div style={{ marginBottom: '0.5rem', color: '#dcdcaa' }}><strong>SEO Title:</strong> {sanityPreview.document.seoTitle || 'N/A'}</div>
                <div style={{ marginBottom: '0.5rem', color: '#dcdcaa' }}><strong>SEO Description:</strong> {sanityPreview.document.seoDescription || 'N/A'}</div>
                <div style={{ marginBottom: '0.5rem', color: '#ce9178' }}><strong>SEO Keywords:</strong> {sanityPreview.document.seoKeywords || 'N/A'}</div>
                <div style={{ marginBottom: '0.5rem', color: '#4ec9b0' }}><strong>Selected Category:</strong> {sanityPreview.document.category?._ref || 'N/A'}</div>
                
                <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Detailed Description Block Count: {sanityPreview.mappingSummary?.detailedDescriptionBlocks || 0}</div>
                <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Benefits Block Count: {sanityPreview.mappingSummary?.benefitsBlocks || 0}</div>
                <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Eligibility Block Count: {sanityPreview.mappingSummary?.eligibilityBlocks || 0}</div>
                <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Documents Block Count: {sanityPreview.mappingSummary?.documentsRequiredBlocks || 0}</div>
                <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>FAQ Count: {sanityPreview.mappingSummary?.faqCount || 0}</div>
                
                <div style={{ marginTop: '1rem', marginBottom: '0.5rem', color: '#d16969' }}>
                  <strong>Omitted Internal Fields:</strong><br/>
                  <pre style={{ margin: 0, padding: '0.5rem', backgroundColor: '#000', borderRadius: '4px' }}>
                    {JSON.stringify(sanityPreview.omittedInternalFields, null, 2)}
                  </pre>
                </div>
                
                <details style={{ marginTop: '1rem', cursor: 'pointer' }}>
                  <summary style={{ color: '#569cd6', marginBottom: '0.5rem' }}>View Full Payload JSON</summary>
                  <pre style={{ margin: 0, padding: '1rem', backgroundColor: '#000', borderRadius: '4px' }}>
                    {JSON.stringify(sanityPreview.document, null, 2)}
                  </pre>
                </details>
              </div>
            </section>
          )}

          {!researchData && (
             <section className="card">
               <h2 className="card-title">Results & Export</h2>
               <div className="empty-state">
                 Awaiting research completion...
               </div>
               <div className="actions-grid">
                 <button className="btn-secondary" disabled>
                   <FileText size={18} />
                   Preview Article
                 </button>
                 <button className="btn-secondary" disabled>
                   <Download size={18} />
                   Download Word
                 </button>
                 <button className="btn-secondary" disabled>
                   <Upload size={18} />
                   Push to Sanity
                 </button>
               </div>
             </section>
          )}
          
        </div>
      </main>
    </div>
  );
}

export default function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
