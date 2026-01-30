import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Rate limit exceeded. Please wait a moment.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api', apiLimiter);

app.post('/api/chat', async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            return res.status(500).json({ error: 'API key not configured on server' });
        }

        const { contents, model } = req.body;
        const modelName = model || 'gemma-3-27b-it';

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/health', (req, res) => {
    const hasKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
    res.json({ status: 'ok', apiConfigured: hasKey });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landing.html'));
});

app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Kitab server running at http://localhost:${PORT}`);
    console.log(`Landing page: http://localhost:${PORT}/`);
    console.log(`App: http://localhost:${PORT}/app`);
});
