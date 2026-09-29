const { generateDocx } = require('../services/docxService');
const { sanitizeFilename } = require('../utils/sanitizeFilename');
const { logError, logInfo } = require('../utils/logger');

exports.exportDocx = async (req, res) => {
  try {
    let content = req.body;
    if (content && content.finalArticle) content = content.finalArticle;
    if (content && content.data) content = content.data;
    if (content && content.content) content = content.content;

    if (!content || (!content.article && !content.seo)) {
      return res.status(400).json({ success: false, message: 'Invalid or incomplete final article data' });
    }

    const auditScore =
      content.audit?.score ??
      content.audit?.overallScore ??
      content.auditResult?.score ??
      0;

    const auditPassed =
      content.audit?.passed ??
      content.auditResult?.passed ??
      (auditScore >= 95);

    const factGuardFailures =
      content.factGuard?.failures ??
      content.factGuard?.failureCount ??
      content.factGuardResult?.failures ??
      content.audit?.failures?.filter(f => f.toLowerCase().includes('factguard'))?.length ??
      0;

    const factGuardPassed =
      content.factGuard?.passed ??
      content.factGuardResult?.passed ??
      (factGuardFailures === 0 && (content.factGuard || content.factGuardResult || content.audit));

    const coverage =
      content.criticalFactCoverage?.coveragePercent ??
      (typeof content.criticalFactCoverage === 'number' ? content.criticalFactCoverage : 0);

    const readiness = content.publishReadiness;

    const isReady = (
      factGuardPassed &&
      coverage >= 95 &&
      auditScore >= 95 &&
      readiness === 'ready'
    );
    if (!isReady) {
      return res.status(400).json({
        success: false,
        message: 'DOCX generation deferred: Content must pass FactGuard, CriticalFactCoverage, and Audit before generating DOCX.'
      });
    }

    const startDocx = Date.now();
    const buffer = await generateDocx(content);
    const docxMs = Date.now() - startDocx;
    logInfo(`DOCX generated in ${docxMs}ms`);

    const slug = (content.seo && content.seo.slug) || "scheme-guide";
    const filename = `${sanitizeFilename(slug)}-SEO-AEO-GEO-Guide.docx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    return res.send(buffer);
  } catch (error) {
    logError('DOCX Export error', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      stage: 'exportDocx'
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during DOCX export',
      errorName: error.name,
      errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

