import CONFIG from './config.js';

class StorageService {
    static get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    }

    static remove(key) {
        localStorage.removeItem(key);
    }
}

class NotesStorage {
    static load() {
        return StorageService.get(CONFIG.STORAGE_KEYS.NOTES) || [];
    }

    static save(notes) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.NOTES, JSON.stringify(notes));
    }
}

class ChatsStorage {
    static load() {
        return StorageService.get(CONFIG.STORAGE_KEYS.CHATS) || {};
    }

    static save(chats) {
        StorageService.set(CONFIG.STORAGE_KEYS.CHATS, chats);
    }

    static getForNote(noteId) {
        const chats = this.load();
        return chats[noteId] || [];
    }

    static saveForNote(noteId, messages) {
        const chats = this.load();
        chats[noteId] = messages;
        this.save(chats);
    }

    static deleteForNote(noteId) {
        const chats = this.load();
        delete chats[noteId];
        this.save(chats);
    }
}

class RateLimiter {
    constructor() {
        this.load();
    }

    load() {
        const stored = StorageService.get(CONFIG.STORAGE_KEYS.API_USAGE);
        const now = Date.now();
        const today = new Date().toDateString();

        if (stored && stored.date === today) {
            this.dailyCount = stored.dailyCount || 0;
            this.minuteRequests = (stored.minuteRequests || []).filter(t => now - t < 60000);
        } else {
            this.dailyCount = 0;
            this.minuteRequests = [];
        }
        this.save();
    }

    save() {
        StorageService.set(CONFIG.STORAGE_KEYS.API_USAGE, {
            date: new Date().toDateString(),
            dailyCount: this.dailyCount,
            minuteRequests: this.minuteRequests
        });
    }

    canMakeRequest() {
        const now = Date.now();
        this.minuteRequests = this.minuteRequests.filter(t => now - t < 60000);

        if (this.minuteRequests.length >= CONFIG.RATE_LIMITS.PER_MINUTE) {
            return { allowed: false, reason: 'Rate limit: 30 requests per minute exceeded. Wait a moment.' };
        }
        if (this.dailyCount >= CONFIG.RATE_LIMITS.PER_DAY) {
            return { allowed: false, reason: 'Daily limit: 15,000 requests exceeded. Try again tomorrow.' };
        }
        return { allowed: true };
    }

    recordRequest() {
        this.minuteRequests.push(Date.now());
        this.dailyCount++;
        this.save();
    }

    get stats() {
        const now = Date.now();
        this.minuteRequests = this.minuteRequests.filter(t => now - t < 60000);
        return {
            minuteUsed: this.minuteRequests.length,
            minuteLimit: CONFIG.RATE_LIMITS.PER_MINUTE,
            dailyUsed: this.dailyCount,
            dailyLimit: CONFIG.RATE_LIMITS.PER_DAY,
            minutePercent: (this.minuteRequests.length / CONFIG.RATE_LIMITS.PER_MINUTE) * 100,
            dailyPercent: (this.dailyCount / CONFIG.RATE_LIMITS.PER_DAY) * 100
        };
    }
}

class ThemeManager {
    constructor() {
        this.apply();
    }

    get current() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'light';
    }

    apply() {
        document.documentElement.setAttribute('data-theme', this.current);
    }

    toggle() {
        const next = this.current === 'light' ? 'dark' : 'light';
        localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, next);
        this.apply();
        return next;
    }
}

class PanelSizeManager {
    static load() {
        return StorageService.get(CONFIG.STORAGE_KEYS.PANEL_SIZES) || {
            sidebar: 300,
            aiPanel: 400
        };
    }

    static save(sizes) {
        StorageService.set(CONFIG.STORAGE_KEYS.PANEL_SIZES, sizes);
    }
}

export { StorageService, NotesStorage, ChatsStorage, RateLimiter, ThemeManager, PanelSizeManager };
