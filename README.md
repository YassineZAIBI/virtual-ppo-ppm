# Virtual PPO/PPM - AI-Powered Product Management Assistant

An autonomous AI-powered Proxy Product Owner/Manager designed for Data & AI products.

## 🚀 Features

### Core Capabilities

1. **🤖 AI-Powered Chat Assistant**
   - Natural language interface for product knowledge queries
   - Context-aware responses about your products
   - Actionable recommendations

2. **📅 Meeting Management**
   - Upload and analyze meeting transcripts
   - Automatic extraction of action items, decisions, and challenges
   - AI-generated summaries

3. **🗺️ Roadmap Tracking**
   - Visual timeline of initiatives
   - Progress monitoring
   - Risk highlighting

4. **💡 Initiatives Pipeline**
   - Kanban-style management from idea to approval
   - Business value and effort assessment
   - Stakeholder tracking

5. **⚙️ Configurable LLM Provider**
   - Choose your preferred AI provider:
     - **Z-AI** (default, no configuration needed)
     - **OpenAI** (GPT-4, GPT-3.5)
     - **Anthropic** (Claude)
     - **Azure OpenAI**
     - **Ollama** (local LLM)

6. **🔗 Integrations**
   - Jira (story management)
   - Slack (notifications)
   - Confluence (documentation)
   - Email (SMTP)

## 🖥️ Desktop Access: Taking Full Control

### The Question: Can This Access My Desktop Directly?

**Yes, but it requires a desktop application wrapper.** Here are your options:

### Option 1: Electron Desktop App (Recommended)

Transform this web app into a full desktop application with complete system access:

```bash
# Install Electron
npm install electron electron-builder

# The app can then:
# ✓ Access local files and folders
# ✓ Control browser automation (Puppeteer/Playwright)
# ✓ Read internal documents (Word, PDF, etc.)
# ✓ Access clipboard, notifications
# ✓ Auto-start on boot
# ✓ Work offline (with local LLM)
```

**Benefits:**
- Full file system access
- Native OS integration
- Can automate browsers to navigate internal tools
- Secure credential storage
- Background operation

### Option 2: Tauri Desktop App (Lighter Alternative)

A lighter-weight option using Rust instead of Chromium:

```bash
# Install Tauri CLI
npm install @tauri-apps/cli

# Benefits:
# ✓ Smaller bundle size (~10MB vs ~150MB for Electron)
# ✓ Better performance
# ✓ Same system access capabilities
# ✓ Built-in security
```

### Option 3: Local Agent Service

Run a companion service on your machine that the web app communicates with:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Web Dashboard  │ ←→  │  Local Agent     │ ←→  │  Your Files │
│  (this app)     │     │  (Node service)  │     │  & Browser  │
└─────────────────┘     └──────────────────┘     └─────────────┘
```

**The local agent can:**
- Watch folders for new documents
- Automate browser sessions
- Access internal company resources
- Run scheduled tasks
- Sync with cloud services

### Option 4: Browser Extension

A Chrome/Edge extension can access:
- Web pages you visit
- Your downloads folder
- Clipboard content
- Selected text

## 📋 Getting Started

### Quick Start

1. **Configure Your LLM Provider** (Settings → LLM Provider)
   - Select your preferred AI provider
   - Enter your API key (if required)
   - Z-AI is pre-configured and works out of the box

2. **Set Up Integrations** (Settings → Integrations)
   - Enable Jira for story management
   - Enable Slack for notifications
   - Configure email for automated follow-ups

3. **Choose Your Autonomy Level** (Settings → Preferences)
   - **Full**: AI acts independently
   - **Oversight**: AI proposes, you review
   - **Advisory**: AI suggests, you decide
   - **Manual**: AI only assists on request

### Using the AI Assistant

The chat interface understands natural language queries:

- "What are the current risks?"
- "Summarize recent meetings"
- "Generate a PRD outline for the AI Dashboard initiative"
- "What should I prioritize this sprint?"
- "Break down the Customer Portal feature into stories"

### Processing Meetings

1. Go to the **Meetings** tab
2. Click **Add Meeting**
3. Paste your meeting transcript or notes
4. Click **Analyze with AI**
5. Review the generated summary, action items, and decisions

### Managing Initiatives

1. Go to the **Initiatives** tab
2. Click **New Idea** to add a new initiative
3. Move initiatives through the pipeline:
   - **Ideas** → Initial concepts
   - **Discovery** → Research phase
   - **Validation** → Proving value
   - **Definition** → Detailed planning
   - **Approved** → Ready for development

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │Dashboard │   Chat   │ Meetings │ Roadmap  │Initiatives│  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Routes                        │
│  ┌──────────────┬──────────────┬───────────────────────┐   │
│  │  /api/chat   │/api/meetings │   /api/settings       │   │
│  └──────────────┴──────────────┴───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Layer (Z-AI SDK)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  LLM Providers: Z-AI | OpenAI | Anthropic | Local    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Security

### Credential Storage

- **Current Implementation**: Credentials stored in browser's localStorage (encrypted with base64)
- **Recommended for Production**: Use server-side encryption with proper key management

### Best Practices

1. Use environment variables for sensitive data
2. Enable HTTPS in production
3. Implement proper authentication
4. Use API tokens with limited scopes
5. Rotate credentials regularly

## 🔮 Future Roadmap

### Phase 1 (Current) ✅
- [x] Core UI and navigation
- [x] Chat interface with AI
- [x] Meeting transcript analysis
- [x] Basic roadmap view
- [x] Initiative pipeline
- [x] LLM provider configuration

### Phase 2 (Next)
- [ ] Jira integration (create/update stories)
- [ ] Slack notifications
- [ ] Email automation
- [ ] Document upload and analysis
- [ ] User journey mapping

### Phase 3 (Future)
- [ ] Desktop application (Electron)
- [ ] Browser automation for web research
- [ ] Calendar integration
- [ ] Voice meeting transcription
- [ ] Advanced analytics dashboard

## 🛠️ Development

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: shadcn/ui, Tailwind CSS
- **State Management**: Zustand
- **AI**: z-ai-web-dev-sdk (OpenAI compatible)
- **Database**: Prisma (ready for persistence)

### Local Development

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Run linter
bun run lint
```

## 📝 License

MIT License - See LICENSE file for details.

---

Built with ❤️ for Product Managers who want to focus on what matters most.
