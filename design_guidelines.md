# Cerebral-Voice Squad - Design Guidelines

## Design Approach

**Selected Approach**: Hybrid Reference-Based (Linear + Developer Tools)
- **Primary Inspiration**: Linear (clean developer aesthetics, subtle animations, professional typography)
- **Secondary References**: VS Code (code display), Notion (content organization), Voice interfaces (Discord, Spotify)
- **Rationale**: Developer-focused tool requiring clarity and efficiency, but with engaging voice interaction requiring personality and delight

## Core Design Principles

1. **Agent Personality Through Design**: Each agent has visual identity via avatar styling, subtle color accents, and animation timing
2. **Progressive Disclosure**: Complex features revealed as needed, clean initial state
3. **Real-time Feedback**: Every action has immediate visual response
4. **Code-First Clarity**: Generated code is the hero content, displayed prominently with maximum readability

---

## Typography System

**Font Families**:
- **Primary (UI)**: Inter (via Google Fonts) - clean, readable, professional
- **Code**: JetBrains Mono (via Google Fonts) - optimal for code display
- **Headings**: Inter with tighter tracking (-0.02em)

**Scale**:
- **Hero/Page Title**: text-4xl font-bold (36px)
- **Section Headers**: text-2xl font-semibold (24px)
- **Agent Names**: text-lg font-medium (18px)
- **Body Text**: text-base (16px)
- **Agent Messages**: text-sm leading-relaxed (14px, 1.625 line-height)
- **Code**: text-sm font-mono (14px)
- **Metadata/Timestamps**: text-xs text-gray-500 (12px)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** (e.g., p-4, gap-8, mt-12)

**Grid Structure**:
```
┌─────────────────────────────────────────────────┐
│ Header (h-16, sticky top-0)                     │
├──────────┬──────────────────────────┬───────────┤
│ History  │  Main Conversation Area  │  Code     │
│ Sidebar  │  (Voice + Agent Cards)   │  Preview  │
│ (w-64)   │  (flex-1)                │  (w-96)   │
│          │                          │           │
│ Optional │  Primary Focus           │  Optional │
│ Collapse │                          │  Collapse │
└──────────┴──────────────────────────┴───────────┘
```

**Responsive Breakpoints**:
- **Mobile** (default): Single column, collapsible panels
- **Tablet** (md:): 2-column (main + one sidebar)
- **Desktop** (lg:): 3-column layout as shown

**Container Max-widths**:
- Main conversation area: max-w-4xl mx-auto
- Full-width sections: w-full with px-6 lg:px-8
- Code blocks: w-full (no max-width restriction)

---

## Component Library

### 1. Voice Input Control
**Design**: Large circular button, center-positioned
- **States**:
  - Idle: Soft shadow, subtle gradient border, microphone icon
  - Listening: Pulsing animation (scale 1.0 to 1.05), glowing effect, waveform visualization
  - Processing: Spinner overlay, dimmed state
- **Size**: 80px diameter (w-20 h-20)
- **Positioning**: Fixed bottom-center or inline at conversation start
- **Typography**: "Click to speak" caption below (text-sm)

### 2. Agent Cards
**Layout**: 4 cards in responsive grid (grid-cols-1 md:grid-cols-2 gap-4)
- **Card Structure**:
  - Avatar/Icon (w-12 h-12) with agent-specific styling
  - Agent name (text-lg font-semibold)
  - Role description (text-xs text-gray-600)
  - Message bubble (rounded-lg p-4 bg-gray-50)
  - Audio controls (play/pause, progress bar)
  - Status indicator (thinking/speaking/complete)

**Agent Visual Identities**:
- **Architect**: Geometric icon (blueprint/compass), structured layout
- **Backend**: Database/server icon, technical precision feel
- **Frontend**: Paintbrush/components icon, slightly more colorful
- **QA**: Checkmark/shield icon, systematic appearance

**Animation**: Fade in sequentially (stagger 100ms), slide up (y: 20 to 0)

### 3. Code Display Panel
**Design**: Full-bleed syntax-highlighted blocks
- **Container**: Rounded corners (rounded-lg), shadow-sm
- **Header Bar**: Language tag (text-xs px-2 py-1 bg-gray-100 rounded), copy button (top-right)
- **Code Area**: p-4, line numbers (optional toggle), syntax highlighting via Prism
- **Theme**: Dark mode (bg-gray-900, text colors per syntax)
- **Scroll**: Vertical scroll if needed, horizontal auto-width

### 4. Conversation Timeline
**Layout**: Vertical timeline on left side of history panel
- **Design**: Vertical line with dots for each conversation
- **Item**: Timestamp, user command preview (truncated), status badge
- **Interaction**: Click to load conversation in main area
- **Active State**: Highlighted background, bold text

### 5. Navigation Header
**Structure**: 
- Left: App logo + "Cerebral-Voice Squad" title
- Center: Empty (focus on conversation)
- Right: New conversation button, settings icon
**Height**: h-16 with border-b

### 6. Research/Review Panels
**Design**: Collapsible accordion sections below agent cards
- **Research Results**: Links with favicons, snippet preview, "Source: Brave Search" badge
- **Code Review**: Issue severity badges (critical/warning/info), line-by-line annotations
- **Styling**: bg-blue-50 for research, bg-amber-50 for warnings

---

## Animations & Motion

**Guiding Principle**: Subtle, purposeful, never distracting

**Key Animations**:
1. **Agent Card Entry**: Fade in + slide up (duration-300, ease-out)
2. **Voice Button Pulse**: Continuous scale animation while listening (duration-1000, infinite)
3. **Text Streaming**: Typewriter effect for agent messages (optional, 50ms per character)
4. **Code Block Appearance**: Fade in (duration-200)
5. **Waveform Visualization**: Real-time bars during audio playback (canvas animation)

**Transitions**: All interactive elements use transition-all duration-200

---

## Interaction Patterns

### Voice Flow
1. User clicks mic → Button pulses → Caption changes to "Listening..."
2. User speaks → Waveform visualizes audio
3. User releases/command detected → "Processing..." state
4. Agents begin responding → Cards appear sequentially

### Agent Discussion
- Messages appear one at a time (never all at once)
- Active agent card has subtle highlight/border
- Completed agents show checkmark icon
- Audio auto-plays or manual play buttons

### Code Generation
- Code appears incrementally as generated (line by line or complete blocks)
- Syntax highlighting updates in real-time
- Copy button shows "Copied!" tooltip on click

---

## State Management (Visual)

**Loading States**: Skeleton loaders for agent cards (shimmer animation)
**Error States**: Red-tinted message bubbles with retry button
**Empty States**: Centered illustration + "Start by speaking a command" prompt
**Success States**: Green checkmarks, success toasts (top-right)

---

## Accessibility

- High contrast text (minimum 4.5:1 ratio)
- Focus rings on all interactive elements (ring-2 ring-blue-500)
- ARIA labels for icon-only buttons
- Keyboard shortcuts: Space to toggle mic, Esc to cancel
- Screen reader announcements for agent responses

---

## Images

**No large hero image** - This is a tool-focused interface prioritizing functionality
- **Agent Avatars**: Use icon library (Lucide React) - blueprint, database, palette, shield icons
- **Empty State**: Optional minimal illustration of microphone/agents (inline SVG, not external image)
- **Logo**: Simple text-based or minimal icon mark in header