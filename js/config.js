const CONFIG = {
    GEMINI_MODEL: 'gemma-3-27b-it',
    STORAGE_KEYS: {
        NOTES: 'kitab_notes',
        CHATS: 'kitab_chats',
        API_USAGE: 'kitab_api_usage',
        THEME: 'kitab_theme',
        GEMINI_KEY: 'kitab_gemini_key',
        PANEL_SIZES: 'kitab_panel_sizes'
    },
    RATE_LIMITS: {
        PER_MINUTE: 30,
        PER_DAY: 15000
    },
    AUTO_SAVE_DELAY: 2000,
    TOAST_DURATION: 3500
};

Object.freeze(CONFIG);
Object.freeze(CONFIG.STORAGE_KEYS);
Object.freeze(CONFIG.RATE_LIMITS);

export default CONFIG;
