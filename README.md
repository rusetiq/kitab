# Kitab (كتاب)

**AI-Powered Note Taker** — Your personal book of knowledge.

Kitab is a beautiful, minimal note-taking app with AI superpowers. Write in Markdown, chat with your notes, generate mind maps, and test your knowledge with auto-generated quizzes.

---

## Features

| Feature | Description |
|---------|-------------|
| **Markdown Editor** | Write with full Markdown support including LaTeX math |
| **AI Enhance** | Improve grammar, clarity, and style |
| **AI Summarize** | Extract key points from long notes |
| **AI Expand** | Elaborate on brief ideas |
| **Chat with Notes** | Ask questions about your note content |
| **Mind Maps** | Visualize note structure as a mind map |
| **Quizzes** | Auto-generate quizzes to test your knowledge |
| **PDF Upload** | Import PDFs and text documents |
| **Dark/Light Mode** | Beautiful themes for any environment |
| **Local Storage** | Your notes stay private in your browser |

---

## Quick Start

### 1. Get a Free API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key

### 2. Run Kitab

**Option A: Open directly**
```
Just open index.html in your browser
```

**Option B: Local server (recommended)**
```bash
npx serve .
```

### 3. Start Writing

1. Click "New" to create a note
2. Write in Markdown
3. Use AI features from the toolbar
4. Click the chat button to ask questions about your note

---

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (ES6 Modules)
- **AI**: Google Gemini API (Gemma 3 27B)
- **Markdown**: marked.js
- **Math**: KaTeX
- **PDF**: PDF.js
- **Storage**: localStorage (no backend required)

---

## Rate Limits

Using the free Gemini API tier:

| Limit | Value |
|-------|-------|
| Per Minute | 30 requests |
| Per Day | 15,000 requests |

Rate usage is displayed in the header.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save note |
| `Ctrl + B` | Bold text |
| `Ctrl + I` | Italic text |

---

## Project Structure

```
kitab/
├── index.html          # Main HTML
├── styles.css          # All styles (glassmorphism design)
├── js/
│   ├── app.js          # Main application
│   ├── config.js       # Configuration
│   ├── models.js       # Note data models
│   ├── services.js     # AI service layer
│   ├── storage.js      # localStorage handlers
│   └── ui.js           # UI components
└── README.md
```

---

## Design

Kitab features a **warm, manuscript-inspired aesthetic**:

- **Typography**: Cormorant Garamond, Crimson Pro, DM Sans
- **Colors**: Amber, copper, and warm neutrals
- **Effects**: Glassmorphism, animated glows, subtle grain
- **Themes**: Light and dark modes

---

## Privacy

- All notes are stored locally in your browser
- Your API key is stored locally and only sent to Google's API
- No data is sent to any third-party servers
- No analytics or tracking

---

## License

MIT License — feel free to use, modify, and share.

---

## Name

**Kitab** (كتاب) means "book" in Arabic. Write your personal book of knowledge.
