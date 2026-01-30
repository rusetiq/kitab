import CONFIG from './config.js';
import { NotesStorage, ChatsStorage, RateLimiter, ThemeManager } from './storage.js';
import { AIService } from './services.js';
import { NotesManager } from './models.js';
import {
    UIComponents,
    FullscreenLoader,
    SidebarController,
    ModalController,
    ChatController,
    MindMapController,
    QuizController,
    AIPanelController,
    EditorController,
    HelpModal,
    FileUploader
} from './ui.js';
import { HandwritingCanvas, HandwritingToolbar } from './handwriting.js';

class KitabApp {
    constructor() {
        this.notes = new NotesManager();
        this.rateLimiter = new RateLimiter();
        this.ai = new AIService(this.rateLimiter);
        this.theme = new ThemeManager();
        this.autoSaveTimeout = null;
        this.searchQuery = '';
        this.editorMode = 'text';
        this.handwritingCanvas = null;
        this.handwritingToolbar = null;

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
            this.loadHandwritingData();
        }

        setInterval(() => this.updateRateLimitsUI(), 5000);
    }

    initHandwriting() {
        const canvasContainer = document.getElementById('handwriting-canvas-container');
        const toolbarContainer = document.getElementById('handwriting-toolbar-container');

        if (!canvasContainer || !toolbarContainer) return;

        if (this.handwritingCanvas) {
            this.handwritingCanvas.destroy();
        }
        if (this.handwritingToolbar) {
            this.handwritingToolbar.destroy();
        }

        this.handwritingCanvas = new HandwritingCanvas(canvasContainer);
        this.handwritingToolbar = new HandwritingToolbar(toolbarContainer, this.handwritingCanvas);

        this.handwritingCanvas.onStrokeEnd = () => {
            this.scheduleAutoSave();
        };

        this.handwritingToolbar.onSave = () => {
            this.saveNote();
        };

        this.handwritingToolbar.onAiAnalyze = async (imageDataUrl) => {
            await this.analyzeHandwriting(imageDataUrl);
        };
    }

    async analyzeHandwriting(imageDataUrl) {
        if (!imageDataUrl) {
            this.toast('No drawing to analyze', 'error');
            return;
        }

        this.fullscreenLoader.show('🔍 Analyzing Handwriting', 'Reading your notes with AI...');

        try {
            const response = await fetch('/api/vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageDataUrl,
                    prompt: 'Please analyze this handwritten note. Perform OCR to extract all the text you can read. Format the extracted text clearly with proper line breaks. If there are diagrams or drawings, describe them briefly.'
                })
            });

            const data = await response.json();
            this.fullscreenLoader.hide();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to analyze');
            }

            const result = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (result) {
                this.aiPanel.open();
                this.aiPanel.showResult(result);
            } else {
                this.toast('Could not extract text', 'error');
            }
        } catch (error) {
            this.fullscreenLoader.hide();
            this.toast(error.message || 'Failed to analyze handwriting', 'error');
        }
    }

    setEditorMode(mode) {
        this.editorMode = mode;
        const editorWrite = document.getElementById('editor-write');
        const editorPreview = document.getElementById('editor-preview');
        const handwritingContainer = document.getElementById('handwriting-container');
        const btnModeText = document.getElementById('btn-mode-text');
        const btnModeDraw = document.getElementById('btn-mode-draw');
        const textModeViews = document.getElementById('text-mode-views');
        const textModeSep = document.getElementById('text-mode-sep');
        const textModeSep2 = document.getElementById('text-mode-sep-2');
        const textToolbar = document.querySelectorAll('.editor-toolbar .toolbar-group:not(.editor-mode-toggle)');

        btnModeText?.classList.toggle('active', mode === 'text');
        btnModeDraw?.classList.toggle('active', mode === 'draw');

        if (mode === 'draw') {
            editorWrite?.classList.add('hidden-for-draw');
            editorPreview?.classList.add('hidden');
            handwritingContainer?.classList.add('active');
            textModeViews?.style.setProperty('display', 'none');
            textModeSep?.style.setProperty('display', 'none');
            textModeSep2?.style.setProperty('display', 'none');
            textToolbar.forEach(el => {
                if (!el.classList.contains('editor-mode-toggle')) {
                    el.style.display = 'none';
                }
            });

            if (!this.handwritingCanvas) {
                this.initHandwriting();
            }
            this.loadHandwritingData();
        } else {
            editorWrite?.classList.remove('hidden-for-draw');
            handwritingContainer?.classList.remove('active');
            textModeViews?.style.setProperty('display', 'flex');
            textModeSep?.style.setProperty('display', 'block');
            textModeSep2?.style.setProperty('display', 'block');
            textToolbar.forEach(el => {
                el.style.display = 'flex';
            });

            this.saveHandwritingData();
        }
    }

    loadHandwritingData() {
        if (!this.notes.current || !this.handwritingCanvas) return;
        const data = this.notes.current.handwritingData;
        if (data) {
            this.handwritingCanvas.loadData(data);
        }
    }

    saveHandwritingData() {
        if (!this.notes.current || !this.handwritingCanvas) return;
        const data = this.handwritingCanvas.getData();
        if (this.notes.current) {
            this.notes.current.handwritingData = data;
            this.saveNotes();
        }
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
            editorEmptyState: document.getElementById('editor-empty-state'), // New
            fabChat: document.getElementById('fab-chat'),

            btnNewNote: document.getElementById('btn-new-note'),
            btnEmptyCreate: document.getElementById('btn-empty-create'), // New
            btnTheme: document.getElementById('btn-theme'),
            btnHelp: document.getElementById('btn-help'),
            btnSave: document.getElementById('btn-save'),
            btnDelete: document.getElementById('btn-delete'),

            btnAiWrite: document.getElementById('btn-ai-write'), // New
            btnAiEnhance: document.getElementById('btn-ai-enhance'),
            btnAiSummarize: document.getElementById('btn-ai-summarize'),
            btnAiExpand: document.getElementById('btn-ai-expand'),

            btnMindmap: document.getElementById('btn-mindmap'),
            btnQuiz: document.getElementById('btn-quiz'),
            fileInput: document.getElementById('file-input'),

            // Context Menu
            contextMenu: document.getElementById('context-menu'),

            // AI Write Modal
            modalAiWrite: document.getElementById('ai-write-modal'),
            inputAiWrite: document.getElementById('ai-write-input'),
            btnAiWriteConfirm: document.getElementById('ai-write-confirm'),
            btnAiWriteCancel: document.getElementById('ai-write-cancel'),
            btnAiWriteClose: document.getElementById('ai-write-close'),

            btnModeText: document.getElementById('btn-mode-text'),
            btnModeDraw: document.getElementById('btn-mode-draw'),
            handwritingContainer: document.getElementById('handwriting-container')
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
                this.selectNote(note.id); // Also handles editor state
                this.toast('Document imported!', 'success');
            }
        };
    }

    bindEvents() {
        this.el.btnNewNote?.addEventListener('click', () => this.createNote());
        this.el.btnEmptyCreate?.addEventListener('click', () => this.createNote());
        this.el.btnTheme?.addEventListener('click', () => this.theme.toggle());
        this.el.btnSave?.addEventListener('click', () => this.saveNote());
        this.el.btnDelete?.addEventListener('click', () => this.confirmDelete());

        this.el.btnAiWrite?.addEventListener('click', () => this.openAiWriteModal());
        this.el.btnAiEnhance?.addEventListener('click', () => this.runAI('enhance'));
        this.el.btnAiSummarize?.addEventListener('click', () => this.runAI('summarize'));
        this.el.btnAiExpand?.addEventListener('click', () => this.runAI('expand'));

        this.el.btnMindmap?.addEventListener('click', () => this.generateMindMap());
        this.el.btnQuiz?.addEventListener('click', () => this.generateQuiz());

        this.el.searchInput?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderNotesList();
        });

        this.el.btnModeText?.addEventListener('click', () => this.setEditorMode('text'));
        this.el.btnModeDraw?.addEventListener('click', () => this.setEditorMode('draw'));

        document.getElementById('note-title')?.addEventListener('input', () => this.scheduleAutoSave());

        // Context Menu Events
        document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        document.addEventListener('click', () => this.hideContextMenu());

        // Context Menu Actions
        document.getElementById('ctx-cut')?.addEventListener('click', () => { document.execCommand('cut'); this.hideContextMenu(); });
        document.getElementById('ctx-copy')?.addEventListener('click', () => { document.execCommand('copy'); this.hideContextMenu(); });
        document.getElementById('ctx-paste')?.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                this.editor.insertMarkdown(text, ''); // Insert at cursor
            } catch {
                document.execCommand('paste');
            }
            this.hideContextMenu();
        });
        document.getElementById('ctx-undo')?.addEventListener('click', () => { document.execCommand('undo'); this.hideContextMenu(); });
        document.getElementById('ctx-redo')?.addEventListener('click', () => { document.execCommand('redo'); this.hideContextMenu(); });
        document.getElementById('ctx-ai-write-ctx')?.addEventListener('click', () => { this.hideContextMenu(); this.openAiWriteModal(); });

        // AI Write Modal Events
        this.el.btnAiWriteClose?.addEventListener('click', () => this.closeAiWriteModal());
        this.el.btnAiWriteCancel?.addEventListener('click', () => this.closeAiWriteModal());
        this.el.btnAiWriteConfirm?.addEventListener('click', () => this.runAiWrite());

        // Shortcuts
        document.addEventListener('keydown', (e) => {
            // Save: Ctrl+S
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveNote();
            }
            // New Note: Ctrl+Alt+N
            if (e.ctrlKey && e.altKey && e.key === 'n') {
                e.preventDefault();
                this.createNote();
            }
            // Undo: Ctrl+Z
            if (e.ctrlKey && e.key === 'z') {
                // Browser default usually handles this in textarea, but let's ensure
                // If we are NOT in a textarea, we might not want to act, but typical app behavior is global.
                // However, execCommand 'undo' only works on focused contenteditable/input.
                // So default behavior is fine for textarea.
            }
        });
    }

    handleContextMenu(e) {
        e.preventDefault();
        if (this.el.contextMenu) {
            this.el.contextMenu.style.left = `${e.clientX}px`;
            this.el.contextMenu.style.top = `${e.clientY}px`;
            this.el.contextMenu.classList.remove('hidden');
        }
    }

    hideContextMenu() {
        this.el.contextMenu?.classList.add('hidden');
    }

    openAiWriteModal() {
        if (!this.notes.currentId) {
            this.toast('Create or select a note first', 'error');
            return;
        }
        if (this.el.modalAiWrite) {
            this.el.modalAiWrite.classList.add('visible');
            setTimeout(() => this.el.inputAiWrite?.focus(), 100);
        }
    }

    closeAiWriteModal() {
        if (this.el.modalAiWrite) {
            this.el.modalAiWrite.classList.remove('visible');
            if (this.el.inputAiWrite) this.el.inputAiWrite.value = '';
        }
    }

    async runAiWrite() {
        const topic = this.el.inputAiWrite?.value.trim();
        if (!topic) {
            this.toast('Please enter a topic', 'error');
            return;
        }

        this.closeAiWriteModal();
        this.fullscreenLoader.show('✍️ Writing Note', 'Consulting the archives...');

        try {
            const content = await this.ai.write(topic);
            this.updateRateLimitsUI();
            this.fullscreenLoader.hide();

            // Append or replace? "Write a note" implies creating content. 
            // If empty, simple set. If exists, maybe append. 
            // Let's replace for now or append if not empty? 
            // User said: "just give it the topic and it'll write it for you".
            // Safest -> Set content. Or append with separator.

            const currentContent = this.editor.content;
            const separator = currentContent ? '\n\n---\n\n' : '';
            const newContent = currentContent + separator + content;

            this.editor.load({ ...this.notes.current, content: newContent });
            this.saveNote();
            this.toast('Note generated!', 'success');
        } catch (error) {
            this.fullscreenLoader.hide();
            this.toast(error.message || 'Failed to write note', 'error');
        }
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
        this.selectNote(note.id); // Use selectNote to handle UI state
        this.chat.clear();
        document.getElementById('note-title')?.focus();
        this.toast('Note created');
    }

    selectNote(id) {
        const note = this.notes.select(id);
        if (note) {
            this.editor.load(note);
            this.chat.setNoteContent(this.editor.content);
            if (this.handwritingCanvas) {
                this.loadHandwritingData();
            }
        }
        this.renderNotesList();
        this.updateEditorState();
    }

    updateEditorState() {
        const hasNote = !!this.notes.currentId;

        // Show/Hide Empty State Overlay
        if (this.el.editorEmptyState) {
            this.el.editorEmptyState.classList.toggle('hidden', hasNote);
        }

        // Disable/Enable toolbar? 
        // The overlay covers it, so clicking buttons shouldn't be possible if z-index is correct.
        // But the sidebar is outside.
    }

    saveNote(silent = false) {
        if (!this.notes.currentId) return;
        this.notes.updateCurrent(this.editor.title, this.editor.content);
        this.saveHandwritingData();
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

                // Reset editor state
                this.editor.clear();
                this.updateEditorState();

                this.modal.close();
                this.toast('Deleted', 'success');
            }
        );
    }

    // ... keeping existing methods runAI, generateMindMap, generateQuiz, scheduleAutoSave, saveNotes ...

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

        // Ensure editor state is correct on init
        this.updateEditorState();

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
