// Direct Brave Search API test
import { BraveSearch } from 'brave-search';

const API_KEY = process.env.BRAVE_SEARCH_API_KEY;

async function testBraveSearch() {
  console.log('🔍 Testing Brave Search API...\n');
  
  if (!API_KEY) {
    console.error('❌ BRAVE_SEARCH_API_KEY not found in environment');
    process.exit(1);
  }
  
  console.log(`✅ API Key found: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}`);
  console.log(`   Length: ${API_KEY.length} characters\n`);
  
  try {
    const client = new BraveSearch(API_KEY);
    
    console.log('📡 Making search request for: "react best practices"\n');
    
    const results = await client.webSearch('react best practices', {
      count: 3,
      safesearch: 'moderate',
      search_lang: 'en',
      country: 'US'
    });
    
    console.log('✅ SUCCESS! Search completed\n');
    console.log('Results:', JSON.stringify(results, null, 2));
    
    if (results?.web?.results) {
      console.log(`\n📊 Found ${results.web.results.length} results:`);
      results.web.results.slice(0, 3).forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.title}`);
        console.log(`   URL: ${r.url}`);
        console.log(`   Description: ${r.description?.substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    
    if (error.response) {
      console.error('\nAPI Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    console.log('\n💡 Possible issues:');
    console.log('   1. Invalid API key format');
    console.log('   2. API key lacks required permissions');
    console.log('   3. Brave Search API endpoint changed');
    console.log('   4. Rate limiting or quota exceeded');
    console.log('\n🔗 Get a valid API key at: https://brave.com/search/api/');
    
    process.exit(1);
  }
}

testBraveSearch();
