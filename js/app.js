import CONFIG from './config.js';
import { NotesStorage, ChatsStorage, RateLimiter, ThemeManager } from './storage.js';
import { AIService } from './services.js';
import { NotesManager } from './models.js';
import {
    UIComponents,
    FullscreenLoader,
    SidebarController,
    ModalController,
    ApiKeyModal,
    ChatController,
    MindMapController,
    QuizController,
    AIPanelController,
    EditorController,
    HelpModal,
    FileUploader
} from './ui.js';

class KitabApp {
    constructor() {
        this.notes = new NotesManager();
        this.rateLimiter = new RateLimiter();
        this.ai = new AIService(this.rateLimiter);
        this.theme = new ThemeManager();
        this.autoSaveTimeout = null;
        this.searchQuery = '';

        this.init();
    }

    init() {
        this.bindElements();
        this.setupControllers();
        this.bindEvents();

        const data = NotesStorage.load();
        this.notes.load(data);

        this.renderNotesList();
        this.updateRateLimitsUI();

        if (this.notes.current) {
            this.editor.load(this.notes.current);
            this.chat.setNoteContent(this.editor.content);
        }

        setInterval(() => this.updateRateLimitsUI(), 5000);
    }

    bindElements() {
        this.el = {
            notesList: document.getElementById('notes-list'),
            emptyState: document.getElementById('empty-state'),
            notesCount: document.getElementById('notes-count'),
            searchInput: document.getElementById('search-input'),
            toastContainer: document.getElementById('toast-container'),
            rateLimitsContainer: document.getElementById('rate-limits-container'),
            sidebar: document.getElementById('sidebar'),
            sidebarToggle: document.getElementById('sidebar-toggle'),
            editorSection: document.getElementById('editor-section'),
            fabChat: document.getElementById('fab-chat'),
            btnNewNote: document.getElementById('btn-new-note'),
            btnTheme: document.getElementById('btn-theme'),
            btnHelp: document.getElementById('btn-help'),
            btnSave: document.getElementById('btn-save'),
            btnDelete: document.getElementById('btn-delete'),
            btnAiEnhance: document.getElementById('btn-ai-enhance'),
            btnAiSummarize: document.getElementById('btn-ai-summarize'),
            btnAiExpand: document.getElementById('btn-ai-expand'),
            btnMindmap: document.getElementById('btn-mindmap'),
            btnQuiz: document.getElementById('btn-quiz'),
            fileInput: document.getElementById('file-input')
        };
    }

    setupControllers() {
        this.fullscreenLoader = new FullscreenLoader(document.getElementById('fullscreen-loader'));

        this.sidebarCtrl = new SidebarController(
            this.el.sidebar,
            this.el.sidebarToggle,
            this.el.editorSection
        );

        this.editor = new EditorController({
            title: document.getElementById('note-title'),
            content: document.getElementById('note-content'),
            write: document.getElementById('editor-write'),
            preview: document.getElementById('editor-preview'),
            markdownPreview: document.getElementById('markdown-preview'),
            metaDate: document.getElementById('meta-date'),
            metaWords: document.getElementById('meta-words'),
            btnEditView: document.getElementById('btn-edit-view'),
            btnPreviewView: document.getElementById('btn-preview-view'),
            btnSplitView: document.getElementById('btn-split-view'),
            btnBold: document.getElementById('btn-bold'),
            btnItalic: document.getElementById('btn-italic'),
            btnHeading: document.getElementById('btn-heading'),
            btnList: document.getElementById('btn-list'),
            btnCode: document.getElementById('btn-code')
        });

        this.modal = new ModalController(
            document.getElementById('modal-overlay'),
            {
                title: document.getElementById('modal-title'),
                body: document.getElementById('modal-body'),
                cancel: document.getElementById('modal-cancel'),
                confirm: document.getElementById('modal-confirm'),
                close: document.getElementById('modal-close')
            }
        );

        this.apiKeyModal = new ApiKeyModal(
            document.getElementById('api-key-modal'),
            {
                input: document.getElementById('gemini-key-input'),
                save: document.getElementById('btn-save-api-key'),
                cancel: document.getElementById('btn-cancel-api-key')
            }
        );

        this.aiPanel = new AIPanelController(
            document.getElementById('ai-panel'),
            {
                loading: document.getElementById('ai-loading'),
                result: document.getElementById('ai-result'),
                content: document.getElementById('ai-result-content'),
                close: document.getElementById('ai-panel-close'),
                apply: document.getElementById('btn-apply-ai'),
                discard: document.getElementById('btn-discard-ai')
            }
        );

        this.chat = new ChatController(
            document.getElementById('chat-panel'),
            this.el.fabChat,
            {
                messages: document.getElementById('chat-messages'),
                input: document.getElementById('chat-input'),
                send: document.getElementById('btn-chat-send'),
                clear: document.getElementById('btn-chat-clear'),
                close: document.getElementById('chat-panel-close'),
                typing: document.getElementById('chat-typing')
            }
        );

        this.mindMap = new MindMapController(
            document.getElementById('mindmap-modal'),
            {
                canvas: document.getElementById('mindmap-canvas'),
                close: document.getElementById('mindmap-close')
            }
        );

        this.quiz = new QuizController(
            document.getElementById('quiz-modal'),
            {
                content: document.getElementById('quiz-content'),
                close: document.getElementById('quiz-close'),
                prev: document.getElementById('quiz-prev'),
                next: document.getElementById('quiz-next'),
                restart: document.getElementById('quiz-restart')
            }
        );

        this.helpModal = new HelpModal(
            document.getElementById('help-modal'),
            {
                close: document.getElementById('help-close'),
                openBtn: this.el.btnHelp
            }
        );

        this.fileUploader = new FileUploader(this.el.fileInput);

        this.ai.onApiKeyNeeded = async () => {
            const key = await this.apiKeyModal.prompt();
            if (key) this.ai.setApiKey(key);
            return key;
        };

        this.aiPanel.onApply = (result) => {
            const contentEl = document.getElementById('note-content');
            if (contentEl) contentEl.value = result;
            this.editor.updatePreview();
            this.editor.updateWordCount();
            this.toast('Applied!', 'success');
        };

        this.editor.onContentChange = () => {
            this.editor.updateWordCount();
            this.chat.setNoteContent(this.editor.content);
            this.scheduleAutoSave();
        };

        this.editor.onViewModeChange = (mode) => {
            if (mode === 'preview') {
                this.chat.open(this.editor.content, this.loadChatHistory());
            }
        };

        this.chat.onSend = async (text, messages, noteContent) => {
            try {
                const response = await this.ai.chatWithContext(messages, noteContent);
                this.chat.showTyping(false);
                this.chat.addMessage('assistant', response);
                this.saveChatHistory();
                this.updateRateLimitsUI();
            } catch (error) {
                this.chat.showTyping(false);
                this.toast(error.message, 'error');
            }
        };

        this.chat.onClear = () => {
            this.saveChatHistory();
        };

        this.fileUploader.onTextExtracted = (text, error) => {
            if (error) {
                this.toast(error, 'error');
                return;
            }
            if (text) {
                const note = this.notes.create();
                note.title = 'Imported Document';
                note.content = text.substring(0, 50000);
                this.saveNotes();
                this.renderNotesList();
                this.editor.load(note);
                this.toast('Document imported!', 'success');
            }
        };
    }

    bindEvents() {
        this.el.btnNewNote?.addEventListener('click', () => this.createNote());
        this.el.btnTheme?.addEventListener('click', () => this.theme.toggle());
        this.el.btnSave?.addEventListener('click', () => this.saveNote());
        this.el.btnDelete?.addEventListener('click', () => this.confirmDelete());

        this.el.btnAiEnhance?.addEventListener('click', () => this.runAI('enhance'));
        this.el.btnAiSummarize?.addEventListener('click', () => this.runAI('summarize'));
        this.el.btnAiExpand?.addEventListener('click', () => this.runAI('expand'));

        this.el.btnMindmap?.addEventListener('click', () => this.generateMindMap());
        this.el.btnQuiz?.addEventListener('click', () => this.generateQuiz());

        this.el.searchInput?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderNotesList();
        });

        document.getElementById('note-title')?.addEventListener('input', () => this.scheduleAutoSave());

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveNote();
            }
        });
    }

    loadChatHistory() {
        if (!this.notes.currentId) return [];
        return ChatsStorage.getForNote(this.notes.currentId);
    }

    saveChatHistory() {
        if (!this.notes.currentId) return;
        ChatsStorage.saveForNote(this.notes.currentId, this.chat.getMessages());
    }

    createNote() {
        const note = this.notes.create();
        this.saveNotes();
        this.renderNotesList();
        this.editor.load(note);
        this.chat.clear();
        document.getElementById('note-title')?.focus();
        this.toast('Note created');
    }

    selectNote(id) {
        const note = this.notes.select(id);
        if (note) {
            this.editor.load(note);
            this.chat.setNoteContent(this.editor.content);
            this.renderNotesList();
        }
    }

    saveNote(silent = false) {
        this.notes.updateCurrent(this.editor.title, this.editor.content);
        this.saveNotes();
        this.renderNotesList();
        this.editor.updateDate(this.notes.current?.updatedAt);
        if (!silent) this.toast('Saved!', 'success');
    }

    confirmDelete() {
        const note = this.notes.current;
        if (!note) {
            this.toast('No note selected', 'error');
            return;
        }

        this.modal.show(
            'Delete Note',
            `Delete "${note.title || 'Untitled'}"?`,
            () => {
                ChatsStorage.deleteForNote(note.id);
                this.notes.deleteCurrent();
                this.saveNotes();
                this.renderNotesList();

                if (this.notes.current) {
                    this.editor.load(this.notes.current);
                } else {
                    this.editor.clear();
                }

                this.modal.close();
                this.toast('Deleted', 'success');
            }
        );
    }

    async runAI(action) {
        const content = this.editor.content.trim();

        if (!content) {
            this.toast('Write some content first', 'error');
            return;
        }

        this.aiPanel.open();

        try {
            const prompt = this.ai.getPrompt(action, content);
            const result = await this.ai.chat(prompt);
            this.updateRateLimitsUI();
            this.aiPanel.showResult(result);
        } catch (error) {
            this.toast(error.message || 'Request failed', 'error');
            this.aiPanel.close();
        }
    }

    async generateMindMap() {
        const content = this.editor.content.trim();
        if (!content) {
            this.toast('Write some content first', 'error');
            return;
        }

        this.fullscreenLoader.show('🧠 Generating Mind Map', 'Analyzing your note structure...');

        try {
            const data = await this.ai.generateMindMap(content);
            this.updateRateLimitsUI();
            this.fullscreenLoader.hide();
            this.mindMap.show(data);
        } catch (error) {
            this.fullscreenLoader.hide();
            this.toast(error.message || 'Failed', 'error');
        }
    }

    async generateQuiz() {
        const content = this.editor.content.trim();
        if (!content) {
            this.toast('Write some content first', 'error');
            return;
        }

        this.fullscreenLoader.show('❓ Generating Quiz', 'Creating questions from your note...');

        try {
            const quiz = await this.ai.generateQuiz(content, 5);
            this.updateRateLimitsUI();
            this.fullscreenLoader.hide();

            if (!quiz.questions || quiz.questions.length === 0) {
                this.toast('Could not generate quiz', 'error');
                return;
            }

            this.quiz.show(quiz);
        } catch (error) {
            this.fullscreenLoader.hide();
            this.toast(error.message || 'Failed', 'error');
        }
    }

    scheduleAutoSave() {
        if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => this.saveNote(true), CONFIG.AUTO_SAVE_DELAY);
    }

    saveNotes() {
        NotesStorage.save(this.notes.toJSON());
    }

    renderNotesList() {
        const filtered = this.notes.search(this.searchQuery);
        if (this.el.notesCount) this.el.notesCount.textContent = this.notes.count;

        if (filtered.length === 0) {
            if (this.el.emptyState) this.el.emptyState.style.display = 'flex';
            if (this.el.notesList) {
                this.el.notesList.innerHTML = '';
                this.el.notesList.appendChild(this.el.emptyState);
            }
            return;
        }

        if (this.el.emptyState) this.el.emptyState.style.display = 'none';
        const fragment = document.createDocumentFragment();

        filtered.forEach(note => {
            const card = UIComponents.noteCard(
                note,
                note.id === this.notes.currentId,
                () => this.selectNote(note.id)
            );
            fragment.appendChild(card);
        });

        if (this.el.notesList) {
            this.el.notesList.innerHTML = '';
            this.el.notesList.appendChild(fragment);
        }
    }

    updateRateLimitsUI() {
        UIComponents.updateRateLimits(this.el.rateLimitsContainer, this.rateLimiter.stats);
    }

    toast(message, type = 'default') {
        if (this.el.toastContainer) {
            UIComponents.toast(this.el.toastContainer, message, type);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.kitab = new KitabApp();
});
