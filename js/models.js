class Note {
    constructor(data = {}) {
        this.id = data.id || Note.generateId();
        this.title = data.title || '';
        this.content = data.content || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.handwritingData = data.handwritingData || null;
    }

    static generateId() {
        return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    update(title, content) {
        this.title = title;
        this.content = content;
        this.updatedAt = new Date().toISOString();
    }

    get preview() {
        if (!this.content) return 'Empty note...';
        return this.stripMarkdown(this.content).substring(0, 60) + '...';
    }

    get wordCount() {
        const text = this.content.trim();
        return text ? text.split(/\s+/).length : 0;
    }

    stripMarkdown(text) {
        return text
            .replace(/#{1,6}\s?/g, '')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/`(.+?)`/g, '$1')
            .replace(/\[(.+?)\]\(.+?\)/g, '$1')
            .replace(/^[-*]\s/gm, '')
            .replace(/^>\s?/gm, '')
            .replace(/\n+/g, ' ')
            .trim();
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            content: this.content,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            handwritingData: this.handwritingData
        };
    }
}

class NotesManager {
    constructor() {
        this.notes = [];
        this.currentId = null;
        this.onChange = null;
    }

    load(data) {
        this.notes = data.map(n => new Note(n));
        if (this.notes.length > 0 && !this.currentId) {
            this.currentId = this.notes[0].id;
        }
    }

    get current() {
        return this.notes.find(n => n.id === this.currentId) || null;
    }

    get count() {
        return this.notes.length;
    }

    create() {
        const note = new Note();
        this.notes.unshift(note);
        this.currentId = note.id;
        this.triggerChange();
        return note;
    }

    select(id) {
        const note = this.notes.find(n => n.id === id);
        if (note) {
            this.currentId = id;
            return note;
        }
        return null;
    }

    updateCurrent(title, content) {
        const note = this.current;
        if (note) {
            note.update(title, content);
            this.triggerChange();
        }
        return note;
    }

    deleteCurrent() {
        const index = this.notes.findIndex(n => n.id === this.currentId);
        if (index === -1) return false;

        this.notes.splice(index, 1);
        this.currentId = this.notes.length > 0 ? this.notes[0].id : null;
        this.triggerChange();
        return true;
    }

    search(query) {
        if (!query) return this.notes;
        const q = query.toLowerCase();
        return this.notes.filter(n =>
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q)
        );
    }

    toJSON() {
        return this.notes.map(n => n.toJSON());
    }

    triggerChange() {
        if (this.onChange) this.onChange();
    }
}

export { Note, NotesManager };
