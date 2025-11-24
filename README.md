# Cerebral-Voice Squad 🎤🤖

An AI-powered voice-driven coding assistant where 4 specialized agents collaborate to design, build, and test your software projects through natural conversation.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🌟 Overview

Cerebral-Voice Squad transforms your spoken ideas into detailed technical plans through collaborative AI discussion. Simply speak your project requirements, and watch as four specialized AI agents analyze, discuss, and generate comprehensive implementation strategies.

### The Squad

- **🧭 Architect Agent** - Designs system architecture and makes high-level technical decisions
- **💾 Backend Agent** - Specifies API endpoints, database schemas, and server-side logic
- **🎨 Frontend Agent** - Plans UI/UX components and client-side implementation
- **🛡️ QA Agent** - Identifies bugs, edge cases, and comprehensive test scenarios

## ✨ Features

- **Voice-First Interface** - Natural speech input using Web Speech API
- **Real-time Agent Discussion** - Watch AI agents collaborate in real-time
- **🔍 Brave Search Integration** - Architect agent automatically researches best practices and solutions (NEW!)
- **Intelligent Context Management** - Smart summarization prevents token overflow
- **Code Generation** - Automatically extracts and displays generated code snippets
- **Conversation History** - Track all your project discussions with timestamps and research data
- **Responsive Design** - Beautiful 3-column layout inspired by Linear
- **Token Safeguards** - User warnings when requests approach AI model limits
- **🎬 Demo Mode** - Faster responses using Gemini 2.5 Flash for hackathon demos (NEW!)

## 🚀 Tech Stack

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Wouter** - Lightweight routing
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library
- **Framer Motion** - Animations

### Backend
- **Express** - Server framework
- **Google Gemini AI** - Powered by Gemini 2.5 Flash (Demo Mode) or Gemini 3 Pro (Production) via Replit AI Integrations
- **Brave Search API** - Real-time research capabilities for the Architect agent
- **Vite** - Build tool and dev server

### Infrastructure
- **Replit AI Integrations** - Gemini API access (no API key required, charges billed to Replit credits)
- **Brave Search API** - Automated research for best practices and implementation guidance
- **Web Speech API** - Voice recognition with auto-restart capability

## 📦 Installation

### Prerequisites
- Node.js 18 or higher
- A modern web browser with microphone access
- Replit account (for AI Integrations)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cerebral-voice-squad.git
cd cerebral-voice-squad
```

2. Install dependencies:
```bash
npm install
```

3. Environment Variables:

**Required (Gemini AI):**
If using Replit, these are automatically configured:
- `AI_INTEGRATIONS_GEMINI_BASE_URL` (auto-set by Replit)
- `AI_INTEGRATIONS_GEMINI_API_KEY` (auto-set by Replit)

**Optional (Brave Search):**
- `BRAVE_SEARCH_API_KEY` - For research capabilities (get yours at https://brave.com/search/api/)

If running locally, you'll need to set up your own Gemini API credentials and optionally a Brave Search API key.

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:5000`

## 🎯 Usage

1. **Grant Microphone Access** - Allow your browser to access your microphone when prompted
2. **Click the Microphone Button** - Start voice recording
3. **Speak Your Request** - Describe your project (e.g., "Build a todo list application")
4. **Click "Done Speaking"** - Stop recording and submit your request
5. **Watch the Squad Work** - All 4 agents will analyze and discuss your project sequentially
6. **Review the Results** - See detailed recommendations and generated code

### Example Requests

**Simple:**
- "Build a todo list application"
- "Create a weather dashboard"
- "Design a user login system"

**Complex:**
- "Build a full-stack e-commerce platform with user authentication, product catalog, shopping cart, payment processing, order management, and admin dashboard"

## 🏗️ Architecture

### Agent Coordination Flow

```
User Voice Input
    ↓
🧭 Architect Agent 
    ├─→ Detects research keywords ("best practice", "how to", etc.)
    ├─→ Performs Brave Search (if applicable)
    └─→ Designs architecture with research findings
    ↓
💾 Backend Agent (specifies APIs & database) - Parallel with Frontend
    ↓
🎨 Frontend Agent (plans UI/UX) - Parallel with Backend
    ↓
🛡️ QA Agent (identifies tests & issues)
    ↓
Generated Code & Recommendations
```

### Research Integration

The Architect agent automatically performs research when it detects keywords like:
- "best practice" / "best way"
- "how to" / "tutorial" / "guide"
- "implement" / "integration" / "setup"
- "recommend" / "compare" / "vs"

When triggered:
1. Brave Search API retrieves top 5 relevant sources
2. Research results are summarized and provided to the Architect agent
3. UI displays clickable research sources with descriptions
4. Research data persists in conversation history

### Context Management

To prevent token overflow:
- Each agent receives **summarized** context (~250 chars) from previous agents
- Dynamic token allocation adjusts `maxOutputTokens` based on prompt size
- User warnings appear when requests approach model limits

### Key Technical Details

- **Sequential Execution**: Agents run one at a time, each building on previous responses
- **Auto-restart**: Voice recognition automatically restarts up to 3 times on "no-speech" errors
- **Real-time UI**: Agent states update live (idle → thinking → speaking → complete)
- **Code Extraction**: Regex-based parsing finds code blocks in agent responses

## 📁 Project Structure

```
cerebral-voice-squad/
├── client/src/
│   ├── components/       # React components
│   │   ├── AgentCard.tsx       # Individual agent display
│   │   ├── VoiceInput.tsx      # Voice recognition UI
│   │   ├── CodeDisplay.tsx     # Code block renderer
│   │   └── ConversationHistory.tsx
│   ├── pages/
│   │   └── home.tsx            # Main application page
│   └── lib/
│       └── queryClient.ts      # TanStack Query config
├── server/
│   ├── routes.ts         # API endpoints
│   ├── index.ts          # Express server
│   └── storage.ts        # In-memory storage
├── shared/
│   └── schema.ts         # Shared type definitions
└── design_guidelines.md  # UI/UX design system
```

## 🎨 Design System

The project uses a **Linear-inspired** design with:
- Subtle gradients and modern aesthetics
- Agent-specific color schemes (blue/Architect, purple/Backend, pink/Frontend, green/QA)
- Responsive 3-column layout
- Smooth animations and transitions
- Dark mode support

## 🔧 Configuration

### Agent Prompts
Agent system prompts can be customized in `server/routes.ts`:

```typescript
const AGENT_PROMPTS = {
  architect: `You are an Architect Agent...`,
  backend: `You are a Backend Agent...`,
  frontend: `You are a Frontend Agent...`,
  qa: `You are a QA Agent...`
};
```

### Token Limits
Adjust token allocation in `server/routes.ts`:

```typescript
const maxModelTokens = 8192; // Gemini 2.5 Flash limit
const safeOutputTokens = Math.min(8192, Math.max(1000, maxModelTokens - promptTokens));
```

## 🐛 Troubleshooting

### Microphone Issues
- Ensure browser has microphone permissions
- Check that your browser supports Web Speech API (Chrome, Edge recommended)
- Verify microphone is not in use by other applications

### Token Overflow Warnings
- Break complex requests into smaller, focused tasks
- Warnings appear when prompts exceed 70% of token budget
- Agents will still respond but may truncate on very large contexts

### No Agent Responses
- Check browser console for errors
- Verify Replit AI Integrations are configured
- Ensure network connectivity

### Brave Search Issues
- The app gracefully degrades if Brave Search API is unavailable
- Research features are optional - agents will still respond without it
- If getting 422 errors: verify your Brave Search API key is valid
- Check server logs for `[Brave Search]` messages to debug

## 📝 Development Guidelines

- **Build incrementally** - Small, focused changes
- **Test voice flow** - Always test with real microphone input
- **Monitor logs** - Check server logs for token usage and warnings
- **Follow design system** - Use existing components and styles from `design_guidelines.md`

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Replit** - Hackathon sponsor providing the development platform
- **Google Gemini AI** - Hackathon sponsor powering the AI agents
- **Brave Search** - Hackathon sponsor providing real-time research capabilities
- **Replit AI Integrations** - For seamless Gemini API access
- **Shadcn UI** - Beautiful component primitives
- **Web Speech API** - Making voice input possible

## 📮 Contact

Project Link: [https://github.com/yourusername/cerebral-voice-squad](https://github.com/yourusername/cerebral-voice-squad)

---

Built with ❤️ using Replit Agent
