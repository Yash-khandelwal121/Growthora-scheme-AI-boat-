const { 
  isSanityConfigured, 
  isSanityWriteEnabled, 
  isSanityDocumentTypeConfigured, 
  getSanityStudioUrl,
  getSanityDocumentType
} = require('../config/sanity');

exports.getStatus = (req, res) => {
  return res.json({
    success: true,
    configured: isSanityConfigured(),
    writeEnabled: isSanityWriteEnabled(),
    documentTypeConfigured: isSanityDocumentTypeConfigured(),
    studioUrl: getSanityStudioUrl()
  });
};

exports.preview = async (req, res) => {
  try {
    const { previewDraft } = require('../services/sanityService');
    const { content, categoryId } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Missing content' });
    
    const result = await previewDraft(content, categoryId);
    return res.json({
      success: true,
      mode: 'dry-run',
      documentType: getSanityDocumentType(),
      draftId: result.payload._id,
      document: result.payload,
      mappingSummary: result.mappingSummary,
      omittedInternalFields: result.omittedInternalFields
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.draft = async (req, res) => {
  try {
    const { pushDraftToSanity } = require('../services/sanityService');
    const { content, categoryId } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Missing content' });

    const result = await pushDraftToSanity(content, categoryId);
    
    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const { getCategories } = require('../services/sanityService');
    const categories = await getCategories();
    return res.json({
      success: true,
      categories
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
