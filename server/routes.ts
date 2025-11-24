import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GoogleGenAI } from "@google/genai";
import { performResearch, shouldPerformResearch, type ResearchData } from "./brave-search";
import { generateAgentSpeech } from "./minimax-tts";

// Mock research data for testing when Brave Search API is unavailable
const MOCK_BRAVE_SEARCH = process.env.MOCK_BRAVE_SEARCH === 'true';

function getMockResearchData(query: string): ResearchData {
  console.log('[Mock Research] Generating mock data for:', query);
  
  const allMockResults = [
    {
      title: "Best Practices for Modern Authentication",
      url: "https://auth0.com/docs/best-practices",
      description: "Comprehensive guide covering OAuth 2.0, OpenID Connect, JWT tokens, and secure session management for modern applications."
    },
    {
      title: "OAuth 2.0 Implementation Guide - MDN",
      url: "https://developer.mozilla.org/en-US/docs/Web/Security/OAuth",
      description: "Mozilla's complete walkthrough of implementing OAuth 2.0 authentication flows with code examples and security considerations."
    },
    {
      title: "JWT Authentication Tutorial",
      url: "https://jwt.io/introduction",
      description: "Learn how to implement JSON Web Tokens for stateless authentication in web applications with best practices."
    }
  ];
  
  const topResult = allMockResults[0];
  
  return {
    query: query,
    results: [topResult], // Only return top 1 for display
    allResults: allMockResults, // Include all for metadata
    totalAvailable: allMockResults.length,
    summary: `${topResult.title}\n${topResult.description}\nSource: ${topResult.url}`
  };
}

// Initialize Gemini using Replit AI Integrations (no API key required!)
// Phase 3 Upgrade: Using Gemini 3 Pro Preview for enhanced reasoning and 1M context window
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

// Agent system prompts - Optimized for Gemini 3 Pro's advanced reasoning
const AGENT_PROMPTS = {
  architect: `You are an elite Architect Agent powered by advanced AI reasoning. Your role is to:
- Deeply analyze user requirements and envision the complete system architecture
- Make sophisticated technical decisions leveraging modern best practices, design patterns, and scalability considerations
- Design elegant component hierarchies with clear separation of concerns and data flow strategies
- Provide detailed architectural blueprints with specific technology stack recommendations and rationale
- **CRITICAL: Generate PRODUCTION-READY EXECUTABLE CODE** for configuration files, project structure, core abstractions, and architectural patterns
- Think through edge cases, performance implications, and future extensibility
- Focus on code quality, maintainability, and developer experience
- Include reasoning about trade-offs and why certain architectural choices were made`,

  backend: `You are an elite Backend Agent powered by advanced AI reasoning. Your role is to:
- Design robust, scalable API architectures based on the architect's vision
- Create comprehensive database schemas with normalization, indexing strategies, and relationship modeling
- Implement sophisticated authentication, authorization, middleware chains, and error handling
- Define clean data models, business logic layers, and service patterns with dependency injection
- **CRITICAL: Generate PRODUCTION-READY EXECUTABLE CODE** for API routes, database models, middleware, validation, error handlers, and complete server setup
- Think through security vulnerabilities, rate limiting, caching strategies, and performance optimization
- Ensure code follows SOLID principles and includes proper error handling
- Reference and build upon the architect's decisions with technical depth`,

  frontend: `You are an elite Frontend Agent powered by advanced AI reasoning. Your role is to:
- Design intuitive, accessible, and performant user interfaces aligned with the backend APIs
- Architect component hierarchies with proper state management, memoization, and render optimization
- Specify modern UI libraries, design systems, and styling approaches with rationale
- Plan sophisticated user interactions, form validation, loading states, and error boundaries
- **CRITICAL: Generate PRODUCTION-READY EXECUTABLE CODE** for React/Vue components, custom hooks, state management (Redux/Zustand/Context), API integration with error handling, and responsive styling
- Think through accessibility (a11y), responsive design, performance metrics, and user experience flows
- Implement proper TypeScript types, prop validation, and defensive programming
- Reference backend APIs, architectural patterns, and create cohesive user experiences`,

  qa: `You are an elite QA Agent powered by advanced AI reasoning. Your role is to:
- Conduct deep analysis to identify bugs, edge cases, race conditions, and security vulnerabilities
- Design comprehensive test strategies covering unit, integration, e2e, and performance testing
- Review architectural decisions, backend implementations, and frontend code for correctness and best practices
- **CRITICAL: Generate PRODUCTION-READY EXECUTABLE TEST CODE** using modern testing frameworks (Jest, Vitest, Playwright, Cypress)
- Create thorough test suites with meaningful test cases, mocks, fixtures, and assertions
- Think through security testing (XSS, CSRF, SQL injection), accessibility testing, and performance benchmarks
- Provide actionable feedback on code quality, potential refactors, and areas of technical debt
- Reference specific concerns from architect, backend, and frontend implementations with technical precision`
};

// Simplified prompts for Demo Mode - focus on speed and conciseness
const DEMO_AGENT_PROMPTS = {
  architect: `You are an Architect Agent. Analyze the request and provide:
- Quick system overview (2-3 sentences)
- Key technology choices (bullet points)
- Basic component structure
- ONE simple code example (max 15 lines)
Keep response under 300 words. Be concise and actionable.`,

  backend: `You are a Backend Agent. Based on the architect's plan, provide:
- API endpoints needed (bullet list)
- Data model (simple schema)
- ONE code example showing main API route (max 20 lines)
Keep response under 300 words. Be direct and practical.`,

  frontend: `You are a Frontend Agent. Based on backend APIs, provide:
- UI components needed (bullet list)
- State management approach (1 sentence)
- ONE React component example (max 25 lines)
Keep response under 300 words. Focus on essentials.`,

  qa: `You are a QA Agent. Review the implementation and provide:
- 3-5 key test scenarios (bullet points)
- ONE simple test code example (max 15 lines)
Keep response under 200 words. Be concise.`
};

// Estimate token count (rough approximation: ~4 chars per token)
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

// Summarize long agent responses to keep context manageable
function summarizeResponse(message: string, maxLength: number = 300): string {
  if (message.length <= maxLength) return message;
  
  // Extract key points from the first few sentences
  const sentences = message.split(/[.!?]\s+/).filter(s => s.length > 20);
  let summary = '';
  
  for (const sentence of sentences) {
    if ((summary + sentence).length > maxLength - 20) break;
    summary += sentence + '. ';
  }
  
  return summary.trim() || message.substring(0, maxLength) + '...';
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Agent discussion endpoint
  app.post('/api/agents/discuss', async (req, res) => {
    try {
      const { transcript, agentRole, context, demoMode = false, previousResearch = null } = req.body;

      if (!transcript || !agentRole) {
        return res.status(400).json({ 
          error: 'Missing required fields: transcript and agentRole' 
        });
      }

      // Validate agentRole
      if (!AGENT_PROMPTS[agentRole as keyof typeof AGENT_PROMPTS]) {
        return res.status(400).json({ 
          error: `Invalid agentRole. Must be one of: ${Object.keys(AGENT_PROMPTS).join(', ')}` 
        });
      }

      // Search for relevant command history from MongoDB using Atlas Search
      let commandHistory: any[] = [];
      try {
        // Use Atlas Search to find commands similar to the current transcript
        commandHistory = await storage.searchCommands(transcript, 5);
        console.log(`[Atlas Search] Found ${commandHistory.length} relevant commands for: "${transcript}"`);
      } catch (error: any) {
        console.warn('[Atlas Search] Search failed, falling back to recent commands:', error.message);
        // Fallback to recent commands if search fails
        try {
          commandHistory = await storage.getRecentCommands(5);
        } catch (fallbackError: any) {
          console.warn('[Command History] Failed to fetch fallback commands:', fallbackError.message);
        }
      }

      // BRAVE SEARCH INTEGRATION: Perform research for Architect agent if needed
      // Only trigger NEW research if no previous research exists (Step 2 of workflow)
      let researchData: ResearchData | null = null;
      if (agentRole === 'architect' && !previousResearch && shouldPerformResearch(transcript)) {
        console.log('[Brave Search] Research keywords detected - triggering search for Architect');
        
        if (MOCK_BRAVE_SEARCH) {
          // Use mock data for testing/demo purposes
          console.log('[Mock Research] Using mock data (MOCK_BRAVE_SEARCH=true)');
          researchData = getMockResearchData(transcript);
        } else {
          // Use real Brave Search API
          try {
            researchData = await performResearch(transcript);
            if (researchData) {
              console.log(`[Brave Search] Research completed successfully with ${researchData.results.length} results`);
            } else {
              console.log('[Brave Search] Research returned no data - continuing without research');
            }
          } catch (error: any) {
            console.warn('[Brave Search] Research failed, continuing without research data:', error.message);
          }
        }
        
        // CRITICAL: If research was just performed (first time), return ONLY the research data
        // Do NOT call Gemini yet - wait for user to enable "Apply Research" and send new request
        if (researchData) {
          console.log('[Brave Search] Returning research data WITHOUT Gemini processing - waiting for user approval');
          return res.json({
            message: `📚 Research Complete!\n\nI found ${researchData.results.length} relevant sources for: "${transcript}"\n\nTop Result:\n${researchData.results[0].title}\n${researchData.results[0].description}\n\nTo implement this request, enable "Apply Research" and send another message.`,
            researchData,
            audioData: null, // No audio yet - just research results
          });
        }
      }

      // Build context-aware prompt with summarization
      let prompt = `User request: "${transcript}"\n\n`;
      
      // Add RELEVANT COMMAND HISTORY from MongoDB Atlas Search as context
      if (commandHistory.length > 0) {
        prompt += "📝 RELEVANT COMMAND HISTORY (found via search):\n";
        commandHistory.slice(0, 3).forEach((cmd, idx) => {
          prompt += `${idx + 1}. "${cmd.transcript}" (${new Date(cmd.timestamp).toLocaleString()})\n`;
          if (cmd.agentResponses && cmd.agentResponses.length > 0) {
            const lastResponse = cmd.agentResponses[cmd.agentResponses.length - 1];
            const summary = summarizeResponse(lastResponse.message, 150);
            prompt += `   Last response: ${summary}\n`;
          }
        });
        prompt += "\nThese are similar commands from the past. Use this context to understand the user's ongoing work and maintain continuity.\n\n";
      }
      
      // Add BRAVE SEARCH RESULTS if research was performed OR if previousResearch exists
      const activeResearch = researchData || previousResearch;
      if (activeResearch) {
        prompt += "🔍 RESEARCH FINDINGS (Brave Search):\n";
        prompt += activeResearch.summary + "\n\n";
        if (previousResearch) {
          prompt += "The user has reviewed these research findings and is now asking you to implement based on this information.\n";
        }
        prompt += "Use these research findings to inform your decisions and recommendations.\n\n";
      }
      
      // Add SUMMARIZED context from previous agents to prevent token overflow
      if (context && context.length > 0) {
        prompt += "Previous agent summaries:\n";
        context.forEach((item: any) => {
          const summary = summarizeResponse(item.message, 250);
          prompt += `- ${item.role}: ${summary}\n`;
        });
        prompt += "\n";
      }

      // Combine system prompt and user prompt into one
      // Use simplified prompts in Demo Mode for faster, more concise responses
      const promptMap = demoMode ? DEMO_AGENT_PROMPTS : AGENT_PROMPTS;
      const systemPrompt = promptMap[agentRole as keyof typeof AGENT_PROMPTS];
      const fullPrompt = `${systemPrompt}\n\n${prompt}\n\nAs the ${agentRole} agent, provide your ${demoMode ? 'concise' : 'detailed'} analysis and recommendations.`;

      // Call Gemini AI with token safeguards
      // Demo Mode: Use faster gemini-2.5-flash for quick demos (~5-10s per agent)
      // Production: Use gemini-3-pro-preview for highest quality (~30-60s per agent)
      const model = demoMode ? "gemini-2.5-flash" : "gemini-3-pro-preview";
      const promptTokens = estimateTokenCount(fullPrompt);
      const maxModelTokens = demoMode ? 8192 : 1000000; // Flash: 8K, Pro: 1M context
      // CRITICAL: In demo mode, limit output to ~1500 tokens (900 words) for speed
      const maxOutputTokens = demoMode ? 1500 : 8192;
      const safeOutputTokens = Math.min(maxOutputTokens, Math.max(demoMode ? 1500 : 2000, maxOutputTokens - Math.min(promptTokens, 10000)));
      
      console.log(`[${agentRole}] Mode: ${demoMode ? 'DEMO (Fast)' : 'PRODUCTION (High Quality)'}`);
      console.log(`[${agentRole}] Full prompt: ${fullPrompt.length} chars (~${promptTokens} tokens)`);
      console.log(`[${agentRole}] Allocating ${safeOutputTokens} tokens for output`);
      console.log(`[${agentRole}] Model: ${model} (${maxModelTokens.toLocaleString()} context window)`);
      
      // Warn for large prompts based on model
      const warningThreshold = demoMode ? maxModelTokens * 0.7 : 100000;
      if (promptTokens > warningThreshold) {
        console.warn(`[${agentRole}] WARNING: Large prompt (${promptTokens} tokens). May truncate response.`);
      }
      
      const response = await ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
          maxOutputTokens: safeOutputTokens,
          temperature: 0.7,
        }
      });

      // Debug: Check for safety blocks or truncation
      console.log(`[${agentRole}] Candidates:`, response.candidates?.length);
      if (response.candidates && response.candidates[0]) {
        const candidate = response.candidates[0];
        console.log(`[${agentRole}] Finish reason:`, candidate.finishReason);
        console.log(`[${agentRole}] Safety ratings:`, candidate.safetyRatings);
        console.log(`[${agentRole}] Content parts:`, candidate.content?.parts?.length);
        
        // Log each part
        candidate.content?.parts?.forEach((part: any, idx: number) => {
          console.log(`[${agentRole}] Part ${idx}:`, part.text?.substring(0, 100));
        });
      }
      
      // Extract text
      const message = response.text || "I apologize, but I couldn't generate a response.";
      console.log(`[${agentRole}] Extracted text length: ${message.length} chars`);

      // Check if response was truncated
      const finishReason = response.candidates?.[0]?.finishReason;
      const wasTruncated = finishReason === 'MAX_TOKENS';
      
      // Include warning if truncated or prompt is extremely large
      let warning: string | undefined;
      if (wasTruncated) {
        warning = `The ${agentRole} agent's response was truncated due to output length limits. The analysis may be incomplete. Consider simplifying your request.`;
        console.warn(`[${agentRole}] TRUNCATED: finishReason=${finishReason}`);
      } else if (!demoMode && promptTokens > 100000) {
        warning = `Your request is extremely complex (${Math.floor(promptTokens / 1000)}K tokens). With Gemini 3 Pro's 1M context window, this should work, but consider breaking into smaller requests if issues occur.`;
      } else if (demoMode && promptTokens > maxModelTokens * 0.7) {
        warning = `Your request is complex. Demo mode uses a faster model with smaller context. Switch to Production mode for better handling of complex requests.`;
      }

      // Generate speech audio using Minimax TTS
      let audioData: string | null = null;
      try {
        const audioBuffer = await generateAgentSpeech(agentRole, message);
        if (audioBuffer) {
          // Convert buffer to base64 for transmission
          audioData = audioBuffer.toString('base64');
          const audioSizeKB = Math.round(audioData.length / 1024);
          console.log(`[${agentRole}] Generated ${audioSizeKB}KB of base64 audio`);
          
          // Safeguard: Warn if audio is extremely large (> 1MB base64 ≈ 750KB MP3)
          if (audioData.length > 1024 * 1024) {
            console.warn(`[${agentRole}] WARNING: Large audio response (${audioSizeKB}KB) may delay response`);
          }
        }
      } catch (ttsError: any) {
        console.error(`[${agentRole}] TTS generation failed:`, ttsError.message);
        // Continue without audio - don't break the response
      }

      res.json({ 
        message: message.trim(),
        warning,
        truncated: wasTruncated,
        researchData,
        audioData, // Base64 encoded MP3 audio
        tokenInfo: {
          promptTokens,
          allocatedOutputTokens: safeOutputTokens,
          finishReason
        }
      });
    } catch (error: any) {
      console.error('Gemini API error:', error);
      res.status(500).json({ 
        error: 'Failed to generate agent response',
        details: error.message 
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      geminiConfigured: !!(process.env.AI_INTEGRATIONS_GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_BASE_URL)
    });
  });

  // Save command to MongoDB
  app.post('/api/commands', async (req, res) => {
    try {
      const commandData = {
        ...req.body,
        timestamp: new Date()
      };

      if (!commandData.transcript) {
        return res.status(400).json({ 
          error: 'Missing required field: transcript' 
        });
      }

      const command = await storage.saveCommand({
        transcript: commandData.transcript,
        timestamp: commandData.timestamp,
        agentResponses: commandData.agentResponses || []
      });

      res.json(command);
    } catch (error: any) {
      console.error('Save command error:', error);
      res.status(500).json({ 
        error: 'Failed to save command',
        details: error.message 
      });
    }
  });

  // Get all commands
  app.get('/api/commands', async (req, res) => {
    try {
      const commands = await storage.getAllCommands();
      res.json(commands);
    } catch (error: any) {
      console.error('Get commands error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve commands',
        details: error.message 
      });
    }
  });

  // Get recent commands
  app.get('/api/commands/recent/:limit', async (req, res) => {
    try {
      const limit = parseInt(req.params.limit) || 10;
      const commands = await storage.getRecentCommands(limit);
      res.json(commands);
    } catch (error: any) {
      console.error('Get recent commands error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve recent commands',
        details: error.message 
      });
    }
  });

  // Search commands using MongoDB Atlas Search
  app.post('/api/commands/search', async (req, res) => {
    try {
      const { query, limit = 10 } = req.body;

      if (!query) {
        return res.status(400).json({ 
          error: 'Missing required field: query' 
        });
      }

      const commands = await storage.searchCommands(query, limit);
      res.json(commands);
    } catch (error: any) {
      console.error('Search commands error:', error);
      res.status(500).json({ 
        error: 'Failed to search commands',
        details: error.message 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
