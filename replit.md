# Cerebral-Voice Squad

An AI-powered voice-driven coding assistant where 4 specialized agents (Architect, Backend, Frontend, QA) discuss and collaborate to generate code based on voice commands.

## Project Status

**Current Phase:** Phase 1 - Core Foundation ✅
**Last Updated:** November 23, 2025

### Completed Milestones

- ✅ **Phase 1, Step 1:** Project Setup & Basic UI Shell
  - Responsive 3-column layout (History | Agents | Code Preview)
  - All core UI components (VoiceInput, AgentCard, CodeDisplay, ConversationHistory, Header)
  - Design guidelines with Linear-inspired aesthetics
  - Agent visual identities (Architect-blue, Backend-purple, Frontend-pink, QA-green)

- ✅ **Phase 1, Step 2:** Voice Input Interface
  - Web Speech API integration with speech-to-text transcription
  - Microphone permissions and error handling
  - Audio level monitoring with visual feedback
  - Auto-restart on "no-speech" errors (up to 3 attempts)
  - Manual "Done Speaking" button for user control
  - Microphone test utility with troubleshooting tips

- ✅ **Phase 1, Step 3:** Gemini AI Integration
  - Backend API route `/api/agents/discuss` using Google Gemini AI
  - Integrated with Replit AI Integrations (no API key required, billed to Replit credits)
  - 4 specialized agent system prompts (Architect, Backend, Frontend, QA)
  - Sequential agent discussion with context passing
  - Agent coordination (each agent receives previous agents' responses)
  - Proper error handling and validation
  - Health check endpoint `/api/health`

### Current Features

**Voice Input:**
- Click microphone to start recording
- Real-time transcript display as you speak
- Auto-stops after 2 seconds of silence or click "Done Speaking"
- Audio level meter to verify microphone is working
- Microphone test mode with troubleshooting guidance

**AI Agent System:**
- **Architect Agent:** Analyzes requirements, designs system architecture
- **Backend Agent:** Designs API endpoints, database schema, server-side logic (references Architect's decisions)
- **Frontend Agent:** Plans UI/UX components, state management (references Backend APIs)
- **QA Agent:** Identifies bugs, edge cases, security issues, test scenarios (reviews all agents)

**Agent Flow:**
1. User speaks a coding request via voice input
2. Transcript is sent to backend
3. Architect agent analyzes with Gemini AI
4. Backend agent receives Architect's response as context
5. Frontend agent receives both previous responses
6. QA agent reviews all previous responses
7. All responses displayed in real-time with status indicators (thinking → speaking → complete)

## Tech Stack

### Frontend
- **Framework:** React with TypeScript
- **Routing:** Wouter
- **UI Components:** Shadcn UI + Radix UI
- **Styling:** Tailwind CSS
- **State Management:** React Hooks
- **Data Fetching:** TanStack Query (not yet implemented for agent calls)
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js with TypeScript
- **Framework:** Express
- **Database:** MongoDB (for command persistence)
- **AI Integration:** Google Gemini via Replit AI Integrations
  - Model: `gemini-2.5-flash` (fast, cost-efficient)
  - Configuration: 150 max tokens, temperature 0.7
  - Base URL: `AI_INTEGRATIONS_GEMINI_BASE_URL`
  - API Key: `AI_INTEGRATIONS_GEMINI_API_KEY`

### Development
- **Build Tool:** Vite
- **Package Manager:** npm
- **Workflow:** Single `npm run dev` command (runs both frontend + backend)

## Architecture

### File Structure
```
client/
  src/
    components/
      VoiceInput.tsx       # Voice input with Web Speech API
      AgentCard.tsx        # Individual agent display
      CodeDisplay.tsx      # Code preview panel
      ConversationHistory.tsx  # Past conversations sidebar
      Header.tsx           # Top navigation
    pages/
      home.tsx             # Main app page
    index.css              # Global styles + design system

server/
  routes.ts                # Express routes + Gemini integration
  storage.ts               # Storage interface (in-memory)
  index-dev.ts             # Dev server entry point

shared/
  schema.ts                # Shared types (future)
```

### API Endpoints

**POST /api/agents/discuss**
- Request: `{ transcript: string, agentRole: string, context: Array<{role: string, message: string}> }`
- Response: `{ message: string }`
- Validates `agentRole` against allowed agents
- **Uses MongoDB Atlas Search to find relevant past commands based on transcript**
- Builds context-aware prompts for Gemini with search results
- Falls back to recent commands if search fails
- Returns AI-generated agent response

**POST /api/commands**
- Request: `{ transcript: string, agentResponses: Array<{role: string, message: string}> }`
- Response: `Command` object with _id, transcript, timestamp, agentResponses
- Saves command to MongoDB with auto-populated timestamp
- Returns saved command

**GET /api/commands**
- Response: Array of all commands from MongoDB
- Sorted by timestamp (most recent first)

**GET /api/commands/recent/:limit**
- Response: Array of recent commands (limited to :limit parameter)
- Used by UI to display command history (showing last 10 commands)

**POST /api/commands/search**
- Request: `{ query: string, limit?: number }`
- Response: Array of commands matching the search query
- Uses MongoDB Atlas Search with wildcard path matching
- Searches across all text fields (transcript, agent responses)
- Returns relevance-ranked results

**GET /api/health**
- Response: `{ status: 'ok', geminiConfigured: boolean }`
- Checks if Gemini environment variables are set

### Design System

**Color Palette:**
- **Architect:** Blue (Compass icon) - System design & architecture
- **Backend:** Purple (Database icon) - APIs & data layer
- **Frontend:** Pink (Palette icon) - UI/UX components
- **QA:** Green (Shield icon) - Testing & quality assurance

**Interaction States:**
- Idle → Thinking (loading spinner) → Speaking (active) → Complete (checkmark)
- Visual feedback with ring highlights and status badges

## Environment Variables

**Managed by Replit AI Integrations:**
- `AI_INTEGRATIONS_GEMINI_BASE_URL` - Gemini API base URL
- `AI_INTEGRATIONS_GEMINI_API_KEY` - Gemini API key (auto-managed)

**Application:**
- `SESSION_SECRET` - Express session secret
- `MONGODB_URI` - MongoDB connection string (defaults to mongodb://localhost:27017 if not set)

**MongoDB Atlas Search Setup:**
To enable search functionality, create a search index named "default" in MongoDB Atlas:
1. Go to MongoDB Atlas → Database → Search
2. Click "Create Search Index"
3. Choose "JSON Editor"
4. Index Name: `default`
5. Database: `cerebral_voice`
6. Collection: `commands`
7. Index Definition:
```json
{
  "mappings": {
    "dynamic": true
  }
}
```
8. Click "Create Search Index"
9. Wait 2-3 minutes for index to build

**Note:** If the search index is not configured, the system automatically falls back to recent commands.

## Recent Updates (November 23, 2025)

**MongoDB Atlas Search Integration - NEW ✅**
- Implemented MongoDB Atlas Search with wildcard path matching
- Agent context now uses **relevance-ranked search results** instead of just recent commands
- Created `/api/commands/search` endpoint for searching past commands
- Automatic fallback to recent commands if search index is not available
- Command history UI now displays up to 10 commands (increased from 5)
- Search uses the new command transcript as query to find similar past commands

**MongoDB Integration - COMPLETE ✅**
- Integrated MongoDB for persistent command storage
- Commands saved with transcript, timestamp, and agent responses
- Recent commands displayed at top of UI for quick reference
- Command history automatically included as context in Gemini API calls
- Auto-populated timestamp on server to ensure data consistency
- Error handling with user-friendly toast notifications

**Gemini AI Integration - FULLY FUNCTIONAL ✅**
- Successfully integrated Google Gemini 2.5 Flash via Replit AI Integrations
- All 4 agents (Architect, Backend, Frontend, QA) now respond with real AI
- Command history from MongoDB automatically included in agent context
- Increased maxOutputTokens to 300 for complete, substantive responses
- Implemented robust text extraction from Gemini response structure
- Added comprehensive error handling and validation
- Automated tests verify agent coordination and context passing

**Test Results:**
- ✅ Voice input captures speech correctly
- ✅ All 4 agents respond sequentially with AI-generated content
- ✅ Agent coordination working (each agent receives previous responses as context)
- ✅ Command history stored in MongoDB and displayed in UI
- ✅ Recent commands included as context in Gemini prompts
- ✅ API endpoints validated (400 for bad requests, 200 for success)
- ✅ Health check confirms Gemini is configured
- ✅ Response messages are substantive (30+ characters)

## Known Issues & Future Improvements

### Current Limitations
- No actual code generation yet (agents discuss the approach, but don't write code files)
- Requires MongoDB connection string to be configured (MONGODB_URI environment variable)
- No TTS (Text-to-Speech) for agent voices
- No streaming responses (could improve perceived speed)

### Planned Features (Phase 2+)
- Real code generation based on agent discussions
- Enhanced conversation persistence with search and filtering
- MiniMax TTS for distinct agent voices
- Brave Search integration for research capabilities
- CodeRabbit integration for code review
- WebSocket support for real-time updates
- Streaming AI responses for faster feedback
- Code execution and testing

## User Preferences

- **Build Approach:** Incremental with pause/review/test cycles
- **Never:** Build entire project in one shot
- **Always:** Test after implementation before proceeding

## Development Notes

**Voice Recognition:**
- Chrome's Speech API is impatient - speaks within 1 second or auto-restart
- Auto-restart up to 3 times to handle initial silence
- 30-second maximum recording time (safety timeout)
- Manual stop button for user control

**Gemini AI:**
- Uses Replit AI Integrations (no personal API key needed)
- Charges billed to Replit credits at public API prices
- Agent prompts designed for concise, actionable responses
- Context passed between agents for coherent collaboration

**Error Handling:**
- Validates all API inputs (400 for bad requests)
- Catches Gemini API failures (500 with error details)
- Frontend checks `response.ok` before parsing JSON
- Global try/catch in agent discussion flow

## Testing

**Manual Testing Checklist:**
1. Voice input captures speech correctly
2. Transcript displays in quotes
3. "Done Speaking" button appears and works
4. All 4 agents respond sequentially
5. Agent status transitions: idle → thinking → speaking → complete
6. Agent messages appear with AI-generated content
7. Error handling works for failed API calls

**Next:** Implement automated Playwright tests for end-to-end flow

## Credits

Built with Replit Agent following fullstack JavaScript best practices.
