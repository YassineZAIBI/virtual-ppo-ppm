# Virtual PPO/PPM - Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun installed
- npm, yarn, or bun package manager

### Installation Steps

```bash
# 1. Navigate to the project directory
cd virtual-ppo-ppm-app

# 2. Install dependencies
bun install
# OR
npm install

# 3. Run the development server
bun run dev
# OR
npm run dev

# 4. Open in browser
# Go to http://localhost:3000
```

## 📁 Project Structure

```
virtual-ppo-ppm-app/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main application (all views)
│   │   ├── layout.tsx        # Root layout
│   │   ├── globals.css       # Global styles
│   │   └── api/
│   │       ├── chat/route.ts     # AI chat endpoint
│   │       └── meetings/route.ts # Meeting processing endpoint
│   ├── components/ui/        # UI components (shadcn)
│   ├── lib/
│   │   ├── store.ts          # Zustand state management
│   │   ├── types.ts          # TypeScript types
│   │   └── utils.ts          # Utilities
│   └── hooks/                # Custom hooks
├── public/                   # Static assets
├── package.json              # Dependencies
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Documentation
```

## 🔧 Configuration

### LLM Provider Setup

1. Open the app in your browser
2. Go to **Settings** → **LLM Provider**
3. Choose your provider:
   - **Z-AI**: Works out of the box (default)
   - **OpenAI**: Enter your OpenAI API key
   - **Anthropic**: Enter your Claude API key
   - **Azure OpenAI**: Enter endpoint and API key
   - **Ollama**: Set endpoint (e.g., http://localhost:11434)

### Integrations Setup

Go to **Settings** → **Integrations** to configure:

- **Jira**: URL, email, API token
- **Slack**: Bot token, channel ID
- **Confluence**: URL, email, API token
- **Email (SMTP)**: Host, port, credentials

## 🎯 Features

### Dashboard
- Overview of active initiatives, pending approvals, risks
- Quick action buttons for common tasks
- Recent activity feed

### AI Assistant (Chat)
- Natural language queries about your products
- Context-aware responses
- Actionable recommendations

### Meetings
- Upload meeting transcripts
- AI extracts summaries, action items, decisions
- Identify challenges and follow-ups

### Roadmap
- Visual timeline of initiatives
- Progress tracking
- Risk highlighting

### Initiatives Pipeline
- Kanban board: Ideas → Discovery → Validation → Definition → Approved
- Add and move initiatives through stages

### Settings
- LLM provider configuration
- Integration credentials
- Autonomy level preferences

## 🖥️ Desktop Access (Advanced)

To run as a desktop application with full system access:

### Option 1: Electron

```bash
# Install Electron
bun add electron electron-builder

# Create electron main file
# See: https://www.electronjs.org/docs/latest/tutorial/quick-start
```

### Option 2: Tauri

```bash
# Install Tauri CLI
bun add @tauri-apps/cli

# Initialize Tauri
bun tauri init
```

## 📝 Usage Tips

1. **First Run**: The app loads sample data automatically
2. **Chat**: Try asking "What are the current risks?" or "Summarize recent meetings"
3. **Meetings**: Paste any meeting transcript and click "Analyze with AI"
4. **Initiatives**: Add new ideas and move them through the pipeline

## 🔐 Security Notes

- Credentials are stored in browser localStorage
- For production, implement server-side encryption
- Never commit API keys to version control

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Use a different port
bun run dev -- -p 3001
```

### Dependencies Issues
```bash
# Clear cache and reinstall
rm -rf node_modules bun.lock
bun install
```

### Build Errors
```bash
# Check for TypeScript errors
bun run lint
```

## 📞 Support

For issues or questions, refer to the main README.md or create an issue in your repository.

---

Built with ❤️ for Product Managers
