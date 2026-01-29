import CONFIG from './config.js';

class AIService {
    constructor(rateLimiter) {
        this.geminiApiKey = localStorage.getItem(CONFIG.STORAGE_KEYS.GEMINI_KEY);
        this.rateLimiter = rateLimiter;
        this.onApiKeyNeeded = null;
    }

    async chat(prompt) {
        const check = this.rateLimiter.canMakeRequest();
        if (!check.allowed) {
            throw new Error(check.reason);
        }

        if (!this.geminiApiKey) {
            if (this.onApiKeyNeeded) {
                this.geminiApiKey = await this.onApiKeyNeeded();
            }
            if (!this.geminiApiKey) {
                throw new Error('API key required');
            }
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${this.geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        this.rateLimiter.recordRequest();

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error('Invalid API response');
        return text;
    }

    async chatWithContext(messages, noteContent) {
        const check = this.rateLimiter.canMakeRequest();
        if (!check.allowed) {
            throw new Error(check.reason);
        }

        if (!this.geminiApiKey) {
            if (this.onApiKeyNeeded) {
                this.geminiApiKey = await this.onApiKeyNeeded();
            }
            if (!this.geminiApiKey) {
                throw new Error('API key required');
            }
        }

        const contents = [
            {
                role: 'user',
                parts: [{ text: `You are an AI assistant helping with notes. Here is the current note content for context:\n\n---\n${noteContent}\n---\n\nPlease help the user with questions about this note. Be concise and helpful.` }]
            },
            {
                role: 'model',
                parts: [{ text: 'I understand. I\'ve read through your note and I\'m ready to help you with any questions or tasks related to it. What would you like to know?' }]
            },
            ...messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }))
        ];

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${this.geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        this.rateLimiter.recordRequest();

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    }

    async generateMindMap(noteContent) {
        const prompt = `Analyze this note and create a mind map structure. Return ONLY valid JSON in this exact format:
{
  "central": "Main Topic",
  "branches": [
    {
      "label": "Branch 1",
      "children": ["Sub-item 1", "Sub-item 2"]
    }
  ]
}

Note content:
${noteContent}`;

        const response = await this.chat(prompt);
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch { }
        return { central: 'Note', branches: [{ label: 'Content', children: ['No structure found'] }] };
    }

    async generateQuiz(noteContent, questionCount = 5) {
        const prompt = `Create a quiz based on this note. Return ONLY valid JSON in this exact format:
{
  "title": "Quiz Title",
  "questions": [
    {
      "question": "Question text?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct": 0,
      "explanation": "Why this is correct"
    }
  ]
}

Create ${questionCount} multiple choice questions.

Note content:
${noteContent}`;

        const response = await this.chat(prompt);
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch { }
        return { title: 'Quiz', questions: [] };
    }

    setApiKey(key) {
        this.geminiApiKey = key;
        localStorage.setItem(CONFIG.STORAGE_KEYS.GEMINI_KEY, key);
    }

    getPrompt(action, content) {
        const prompts = {
            enhance: `Improve the following text. Fix grammar, enhance clarity, and make it more engaging while preserving the original meaning. Keep markdown formatting. Return only the enhanced text:\n\n${content}`,
            summarize: `Summarize the following text concisely. Capture key points using markdown bullet points. Return only the summary:\n\n${content}`,
            expand: `Expand the following text with more detail and examples. Maintain the original style and use markdown formatting. Return only the expanded text:\n\n${content}`
        };
        return prompts[action] || content;
    }
}

export { AIService };
