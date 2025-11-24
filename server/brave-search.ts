import { BraveSearch } from 'brave-search';

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY;

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export interface ResearchData {
  query: string;
  results: SearchResult[]; // Top result for display
  allResults?: SearchResult[]; // All 5 results (metadata)
  totalAvailable?: number; // Number of total results available
  summary: string;
}

let braveClient: BraveSearch | null = null;

function getBraveClient(): BraveSearch {
  if (!BRAVE_API_KEY) {
    throw new Error('BRAVE_SEARCH_API_KEY not configured');
  }
  if (!braveClient) {
    braveClient = new BraveSearch(BRAVE_API_KEY);
  }
  return braveClient;
}

export async function performResearch(query: string): Promise<ResearchData | null> {
  try {
    if (!BRAVE_API_KEY) {
      console.warn('[Brave Search] API key not configured - skipping research');
      return null;
    }

    const client = getBraveClient();
    
    console.log(`[Brave Search] Researching: "${query}"`);
    
    const searchResults = await client.webSearch(query, {
      count: 5, // Fetch 5 but only show top 1 to user
      safesearch: 'moderate' as any,
      search_lang: 'en',
      country: 'US'
    });

    if (!searchResults || !searchResults.web?.results) {
      console.log('[Brave Search] No results found');
      return null;
    }

    // Get top 5 results but metadata will indicate we're showing only 1
    const allResults: SearchResult[] = searchResults.web.results
      .slice(0, 5)
      .map((result: any) => ({
        title: result.title || 'Untitled',
        url: result.url || '',
        description: result.description || ''
      }));

    // For display: only use top 1 result
    const topResult = allResults[0];
    const summary = `${topResult.title}\n${topResult.description}\nSource: ${topResult.url}`;

    console.log(`[Brave Search] Successfully found ${allResults.length} results (showing top 1)`);

    return {
      query,
      results: [topResult], // Only return top 1 for display
      allResults, // Include all 5 for metadata
      totalAvailable: allResults.length,
      summary
    };
  } catch (error: any) {
    console.warn('[Brave Search] Failed to perform research:', error.message || error);
    console.warn('[Brave Search] Continuing without research data');
    return null;
  }
}

export function shouldPerformResearch(userPrompt: string): boolean {
  // Only trigger research on QUESTION patterns - not implementation requests
  // This allows for a three-step workflow:
  // 1. "implement X" → no research, just build
  // 2. "what's the best way to X?" → trigger research
  // 3. "implement using research" → use research context
  
  const researchQuestionPatterns = [
    'what is the best',
    'what\'s the best',
    'what are the best',
    'what are best practices',
    'what is best practice',
    'how should i',
    'how should we',
    'what is recommended',
    'what\'s recommended',
    'which is better',
    'which approach',
    'what approach',
    'compare',
    'research',
    'show me best',
    'find best',
    'lookup',
    'search for'
  ];

  const lowerPrompt = userPrompt.toLowerCase();
  return researchQuestionPatterns.some(pattern => lowerPrompt.includes(pattern));
}
