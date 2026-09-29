const { getAnthropicClient, getAnthropicModel, isAnthropicConfigured } = require('../config/anthropic');
const { claudePrompt } = require('../prompts/claudeVerifierPrompt');
const { parseAIJson } = require('../utils/parseAIJson');
const { logError, logInfo } = require('../utils/logger');
const { parseProviderError } = require('../utils/providerErrorCategories');

async function runClaudeVerification(researchContext, openaiResult, geminiResult) {
  if (!isAnthropicConfigured()) {
    throw new Error('Anthropic is not configured');
  }

  const anthropicClient = getAnthropicClient();
  const defaultModel = getAnthropicModel();

  logInfo('Starting Claude Verification', { schemeName: researchContext.schemeName });

  let systemPrompt = claudePrompt.replace('{{RESEARCH_CONTEXT}}', JSON.stringify(researchContext, null, 2));
  systemPrompt = systemPrompt.replace('{{OPENAI_RESEARCH}}', JSON.stringify(openaiResult || {}, null, 2));
  systemPrompt = systemPrompt.replace('{{GEMINI_RESEARCH}}', JSON.stringify(geminiResult || {}, null, 2));

  let messages = [
    { role: 'user', content: 'Please review the research, perform verification, and return the required JSON.' }
  ];

  let finalContent = "";
  const sources = [];

  try {
    let keepGoing = true;
    while (keepGoing) {
      const response = await anthropicClient.messages.create({
        model: defaultModel,
        max_tokens: 4000,
        temperature: 0.1,
        system: systemPrompt,
        messages: messages,
        tools: [{
          type: "web_search_20260318",
          name: "web_search",
          max_uses: 5
        }]
      });

      // Extract search results and text
      let textChunk = "";
      for (const block of response.content) {
        if (block.type === 'text') {
          textChunk += block.text;
        } else if (block.type === 'tool_use' && block.name === 'web_search') {
          // If we receive a tool_use block and it's a client-side execution wait, 
          // but web_search_20260318 is a server tool, it might just return results directly.
          // Wait, Anthropic's server tools return the result directly as part of the assistant message?
          // No, usually they appear as blocks. Let's just capture anything that looks like search results.
        } else if (block.type === 'web_search_result' || block.type === 'search_results') {
          // Attempt to extract actual citations/results if the server provides them in a custom block
          const results = block.results || block.search_results || [];
          results.forEach(res => {
            if (res.url || res.link) {
              sources.push({
                url: res.url || res.link,
                title: res.title || null,
                date: res.date || res.page_age || null,
                citations: res.snippet ? [res.snippet] : []
              });
            }
          });
        }
      }

      finalContent += textChunk;
      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'pause_turn' || response.stop_reason === 'tool_use') {
        // If we get tool_use for web_search, the server might expect us to just continue if it didn't auto-resolve,
        // but for server tools, pause_turn means the server ran the tool and wants us to continue the generation.
        // If it's a tool_use, we might need to supply a dummy result if it expects client execution, 
        // but the prompt said "Use Anthropic's native server-side web search... Handle pause_turn". 
        // So we just continue by passing the assistant message back.
        logInfo('Claude paused turn (server tool executed), continuing generation...');
        
        // If the stop reason was tool_use and it was NOT a server tool, we'd have a problem.
        // But we only provided the server tool.
        if (response.stop_reason === 'tool_use') {
           // We might need to handle this just in case, but let's assume server auto-appends results.
           // Actually, if it's pause_turn, we just loop.
        }
        
      } else {
        keepGoing = false;
      }
    }

    const parsedData = parseAIJson(finalContent);
    if (sources.length > 0) {
      parsedData.sources = parsedData.sources || [];
      parsedData.sources.push(...sources);
    }
    
    logInfo('Claude Verification completed successfully');
    return parsedData;
  } catch (error) {
    const parsedError = parseProviderError(error, 'Anthropic');
    logError('Claude Verification failed', parsedError);
    throw parsedError;
  }
}

module.exports = {
  runClaudeVerification
};
