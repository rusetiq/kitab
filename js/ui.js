import CONFIG from './config.js';

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function safeMarkdownParse(text) {
    if (typeof marked === 'undefined') return escapeHtml(String(text || '')).replace(/\n/g, '<br>');
    try {
        return marked.parse(String(text || ''));
    } catch {
        return escapeHtml(String(text || '')).replace(/\n/g, '<br>');
    }
}

function safeRenderMath(element) {
    if (typeof renderMathInElement === 'undefined' || !element) return;
    try {
        renderMathInElement(element, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ],
            throwOnError: false,
            errorColor: 'inherit'
        });
    } catch { }
}

class UIComponents {
    static toast(container, message, type = 'default') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span class="toast-message">${escapeHtml(message)}</span>`;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.TOAST_DURATION);
    }

    static noteCard(note, isActive, onClick) {
        const card = document.createElement('div');
        card.className = `note-card${isActive ? ' active' : ''}`;
        card.innerHTML = `
            <div class="note-card-header">
                <div class="note-card-title">${escapeHtml(note.title || 'Untitled')}</div>
                <div class="note-card-indicator"></div>
            </div>
            <div class="note-card-preview">${escapeHtml(note.preview)}</div>
            <div class="note-card-footer">
                <span class="note-card-meta">${formatDate(note.updatedAt)}</span>
                <span class="note-card-words">${note.wordCount}w</span>
            </div>
        `;
        card.addEventListener('click', onClick);
        return card;
    }

    static updateRateLimits(container, stats) {
        if (!container) return;
        container.innerHTML = `
            <div class="rate-limit-row">
                <span class="rate-label">Minute</span>
                <div class="rate-bar"><div class="rate-fill ${stats.minutePercent > 80 ? 'warning' : ''}" style="width: ${stats.minutePercent}%"></div></div>
                <span class="rate-value">${stats.minuteUsed}/${stats.minuteLimit}</span>
            </div>
            <div class="rate-limit-row">
                <span class="rate-label">Daily</span>
                <div class="rate-bar"><div class="rate-fill ${stats.dailyPercent > 80 ? 'warning' : ''}" style="width: ${Math.min(stats.dailyPercent, 100)}%"></div></div>
                <span class="rate-value">${(stats.dailyUsed / 1000).toFixed(1)}k</span>
            </div>
        `;
    }
}

class FullscreenLoader {
    constructor(container) {
        this.container = container;
        this.titleEl = document.getElementById('loader-title');
        this.subtitleEl = document.getElementById('loader-subtitle');
    }

    show(title = 'Generating...', subtitle = 'This may take a moment') {
        if (this.titleEl) this.titleEl.textContent = title;
        if (this.subtitleEl) this.subtitleEl.textContent = subtitle;
        this.container?.classList.add('visible');
    }

    hide() {
        this.container?.classList.remove('visible');
    }
}

class SidebarController {
    constructor(sidebar, toggle, editorSection) {
        this.sidebar = sidebar;
        this.toggle = toggle;
        this.editorSection = editorSection;
        this.isCollapsed = false;

        this.toggle?.addEventListener('click', () => this.toggleCollapse());
    }

    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        this.sidebar?.classList.toggle('collapsed', this.isCollapsed);
    }

    collapse() {
        this.isCollapsed = true;
        this.sidebar?.classList.add('collapsed');
    }

    expand() {
        this.isCollapsed = false;
        this.sidebar?.classList.remove('collapsed');
    }
}

class ModalController {
    constructor(overlay, elements) {
        this.overlay = overlay;
        this.elements = elements;
        this.onConfirm = null;

        elements.cancel?.addEventListener('click', () => this.close());
        elements.close?.addEventListener('click', () => this.close());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });
    }

    show(title, body, onConfirm) {
        if (this.elements.title) this.elements.title.textContent = title;
        if (this.elements.body) this.elements.body.textContent = body;
        this.onConfirm = onConfirm;
        if (this.elements.confirm) {
            this.elements.confirm.onclick = () => { if (this.onConfirm) this.onConfirm(); };
        }
        this.overlay.classList.add('visible');
    }

    close() {
        this.overlay.classList.remove('visible');
        this.onConfirm = null;
    }
}

class ApiKeyModal {
    constructor(modal, elements) {
        this.modal = modal;
        this.elements = elements;
        this.resolve = null;

        elements.save?.addEventListener('click', () => this.save());
        elements.cancel?.addEventListener('click', () => this.cancel());
        elements.input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.save();
            if (e.key === 'Escape') this.cancel();
        });
    }

    prompt() {
        return new Promise(resolve => {
            this.resolve = resolve;
            this.modal.classList.add('visible');
            setTimeout(() => this.elements.input?.focus(), 100);
        });
    }

    save() {
        const key = this.elements.input?.value.trim();
        if (key) {
            this.modal.classList.remove('visible');
            this.elements.input.value = '';
            if (this.resolve) this.resolve(key);
        }
    }

    cancel() {
        this.modal.classList.remove('visible');
        if (this.elements.input) this.elements.input.value = '';
        if (this.resolve) this.resolve(null);
    }
}

class ChatController {
    constructor(panel, fabBtn, elements) {
        this.panel = panel;
        this.fabBtn = fabBtn;
        this.elements = elements;
        this.messages = [];
        this.noteContent = '';
        this.onSend = null;
        this.onClear = null;
        this.isVisible = false;

        elements.send?.addEventListener('click', () => this.send());
        elements.clear?.addEventListener('click', () => this.clear());
        elements.close?.addEventListener('click', () => this.close());
        elements.input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.send();
            }
        });

        fabBtn?.addEventListener('click', () => this.toggle());
    }

    toggle() {
        if (this.isVisible) {
            this.close();
        } else {
            this.open();
        }
    }

    open(noteContent, existingMessages) {
        if (noteContent !== undefined) this.noteContent = noteContent;
        if (existingMessages !== undefined) this.messages = existingMessages;
        this.isVisible = true;
        this.panel?.classList.add('visible');
        this.fabBtn?.classList.add('hidden');
        this.renderMessages();
        this.elements.input?.focus();
    }

    close() {
        this.isVisible = false;
        this.panel?.classList.remove('visible');
        this.fabBtn?.classList.remove('hidden');
    }

    send() {
        const text = this.elements.input?.value.trim();
        if (!text || !this.onSend) return;

        this.addMessage('user', text);
        this.elements.input.value = '';
        this.showTyping(true);

        this.onSend(text, this.messages, this.noteContent);
    }

    addMessage(role, content) {
        this.messages.push({ role, content, timestamp: Date.now() });
        this.renderMessages();
    }

    showTyping(show) {
        this.elements.typing?.classList.toggle('hidden', !show);
        this.scrollToBottom();
    }

    renderMessages() {
        if (!this.elements.messages) return;

        if (this.messages.length === 0) {
            this.elements.messages.innerHTML = `
                <div class="chat-welcome">
                    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1"><circle cx="16" cy="16" r="12"/><path d="M16 10v4l3 3"/></svg>
                    <p>Ask anything about your note</p>
                </div>
            `;
            return;
        }

        this.elements.messages.innerHTML = this.messages.map(m => `
            <div class="chat-message ${m.role}">
                <div class="chat-avatar">${m.role === 'user' ? 'U' : 'AI'}</div>
                <div class="chat-content">${safeMarkdownParse(m.content)}</div>
            </div>
        `).join('');

        this.elements.messages.querySelectorAll('.chat-content').forEach(el => safeRenderMath(el));
        this.scrollToBottom();
    }

    scrollToBottom() {
        if (this.elements.messages) {
            this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        }
    }

    clear() {
        this.messages = [];
        this.renderMessages();
        if (this.onClear) this.onClear();
    }

    getMessages() {
        return this.messages;
    }

    setNoteContent(content) {
        this.noteContent = content;
    }
}

class MindMapController {
    constructor(modal, elements) {
        this.modal = modal;
        this.elements = elements;
        this.data = null;

        elements.close?.addEventListener('click', () => this.close());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
    }

    show(data) {
        this.data = data;
        this.render();
        this.modal.classList.add('visible');
    }

    close() {
        this.modal.classList.remove('visible');
    }

    render() {
        if (!this.elements.canvas || !this.data) return;

        const { central, branches } = this.data;

        let html = `
            <div class="mindmap-container">
                <div class="mindmap-central">${escapeHtml(central)}</div>
                <div class="mindmap-branches">
        `;

        (branches || []).forEach((branch) => {
            html += `
                <div class="mindmap-branch">
                    <div class="mindmap-node">${escapeHtml(branch.label)}</div>
                    <div class="mindmap-children">
                        ${(branch.children || []).map(c => `
                            <div class="mindmap-leaf">${escapeHtml(c)}</div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        this.elements.canvas.innerHTML = html;
    }
}

class QuizController {
    constructor(modal, elements) {
        this.modal = modal;
        this.elements = elements;
        this.quiz = null;
        this.currentIndex = 0;
        this.answers = [];
        this.showingResults = false;

        elements.close?.addEventListener('click', () => this.close());
        elements.next?.addEventListener('click', () => this.next());
        elements.prev?.addEventListener('click', () => this.prev());
        elements.restart?.addEventListener('click', () => this.restart());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
    }

    show(quiz) {
        this.quiz = quiz;
        this.currentIndex = 0;
        this.answers = new Array(quiz.questions.length).fill(null);
        this.showingResults = false;
        this.render();
        this.modal.classList.add('visible');
    }

    close() {
        this.modal.classList.remove('visible');
    }

    selectAnswer(index) {
        if (this.showingResults) return;
        this.answers[this.currentIndex] = index;
        this.render();
    }

    next() {
        if (this.currentIndex < this.quiz.questions.length - 1) {
            this.currentIndex++;
            this.render();
        } else if (!this.showingResults) {
            this.showResults();
        }
    }

    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.render();
        }
    }

    restart() {
        this.currentIndex = 0;
        this.answers = new Array(this.quiz.questions.length).fill(null);
        this.showingResults = false;
        this.render();
    }

    showResults() {
        this.showingResults = true;
        this.render();
    }

    render() {
        if (!this.elements.content || !this.quiz) return;

        if (this.showingResults) {
            this.renderResults();
            return;
        }

        const q = this.quiz.questions[this.currentIndex];
        const selected = this.answers[this.currentIndex];

        this.elements.content.innerHTML = `
            <div class="quiz-header">
                <h3>${escapeHtml(this.quiz.title)}</h3>
                <span class="quiz-progress">${this.currentIndex + 1} / ${this.quiz.questions.length}</span>
            </div>
            <div class="quiz-question">${escapeHtml(q.question)}</div>
            <div class="quiz-options">
                ${q.options.map((opt, i) => `
                    <button class="quiz-option ${selected === i ? 'selected' : ''}" data-index="${i}">
                        ${escapeHtml(opt)}
                    </button>
                `).join('')}
            </div>
        `;

        this.elements.content.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', () => this.selectAnswer(parseInt(btn.dataset.index)));
        });

        if (this.elements.prev) this.elements.prev.disabled = this.currentIndex === 0;
        if (this.elements.next) this.elements.next.textContent = this.currentIndex === this.quiz.questions.length - 1 ? 'Finish' : 'Next';
        this.elements.restart?.classList.add('hidden');
        this.elements.prev?.classList.remove('hidden');
        this.elements.next?.classList.remove('hidden');
    }

    renderResults() {
        const correct = this.answers.filter((a, i) => a === this.quiz.questions[i].correct).length;
        const total = this.quiz.questions.length;
        const percent = Math.round((correct / total) * 100);

        this.elements.content.innerHTML = `
            <div class="quiz-results">
                <div class="quiz-score ${percent >= 70 ? 'good' : percent >= 50 ? 'ok' : 'poor'}">
                    <span class="score-value">${percent}%</span>
                    <span class="score-label">${correct}/${total} Correct</span>
                </div>
                <div class="quiz-review">
                    ${this.quiz.questions.map((q, i) => `
                        <div class="review-item ${this.answers[i] === q.correct ? 'correct' : 'wrong'}">
                            <div class="review-q">${escapeHtml(q.question)}</div>
                            <div class="review-answer">Your answer: ${escapeHtml(q.options[this.answers[i]] || 'Not answered')}</div>
                            ${this.answers[i] !== q.correct ? `<div class="review-correct">Correct: ${escapeHtml(q.options[q.correct])}</div>` : ''}
                            <div class="review-explanation">${escapeHtml(q.explanation || '')}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.elements.prev?.classList.add('hidden');
        this.elements.next?.classList.add('hidden');
        this.elements.restart?.classList.remove('hidden');
    }
}

class AIPanelController {
    constructor(panel, elements) {
        this.panel = panel;
        this.elements = elements;
        this.result = null;
        this.onApply = null;

        elements.close?.addEventListener('click', () => this.close());
        elements.discard?.addEventListener('click', () => this.close());
        elements.apply?.addEventListener('click', () => this.apply());
    }

    open() {
        this.panel.classList.add('visible');
        this.showLoading(true);
    }

    close() {
        this.panel.classList.remove('visible');
        this.result = null;
        if (this.elements.content) this.elements.content.innerHTML = '';
    }

    showLoading(show) {
        this.elements.loading?.classList.toggle('hidden', !show);
        this.elements.result?.classList.toggle('hidden', show);
    }

    showResult(text) {
        this.result = text;
        this.showLoading(false);
        if (this.elements.content) {
            this.elements.content.innerHTML = safeMarkdownParse(text);
            safeRenderMath(this.elements.content);
        }
    }

    apply() {
        if (this.result && this.onApply) {
            this.onApply(this.result);
        }
        this.close();
    }
}

class EditorController {
    constructor(elements) {
        this.elements = elements;
        this.viewMode = 'edit';
        this.onContentChange = null;
        this.onViewModeChange = null;

        this.setupViewToggle();
        this.setupToolbar();
        this.setupMarkdown();
    }

    setupViewToggle() {
        const modes = ['edit', 'preview', 'split'];
        modes.forEach(mode => {
            const btn = this.elements[`btn${mode.charAt(0).toUpperCase() + mode.slice(1)}View`];
            btn?.addEventListener('click', () => this.setViewMode(mode));
        });
        this.updateViewButtons();
    }

    setupToolbar() {
        const shortcuts = {
            bold: ['**', '**'],
            italic: ['*', '*'],
            heading: ['## ', ''],
            list: ['- ', ''],
            code: ['`', '`']
        };

        Object.entries(shortcuts).forEach(([action, [before, after]]) => {
            const btn = this.elements[`btn${action.charAt(0).toUpperCase() + action.slice(1)}`];
            btn?.addEventListener('click', () => this.insertMarkdown(before, after));
        });
    }

    setupMarkdown() {
        if (typeof marked !== 'undefined') {
            marked.use({ silent: true });
        }

        this.elements.content?.addEventListener('input', () => {
            this.updatePreview();
            if (this.onContentChange) this.onContentChange();
        });
    }

    setViewMode(mode) {
        this.viewMode = mode;
        this.updateViewButtons();

        const showWrite = mode === 'edit' || mode === 'split';
        const showPreview = mode === 'preview' || mode === 'split';

        this.elements.write?.classList.toggle('hidden', !showWrite);
        this.elements.preview?.classList.toggle('hidden', !showPreview);

        if (showPreview) this.updatePreview();
        if (this.onViewModeChange) this.onViewModeChange(mode);
    }

    updateViewButtons() {
        ['edit', 'preview', 'split'].forEach(m => {
            const btn = this.elements[`btn${m.charAt(0).toUpperCase() + m.slice(1)}View`];
            btn?.classList.toggle('active', m === this.viewMode);
        });
    }

    updatePreview() {
        if (this.elements.markdownPreview) {
            this.elements.markdownPreview.innerHTML = safeMarkdownParse(this.elements.content?.value || '');
            safeRenderMath(this.elements.markdownPreview);
        }
    }

    insertMarkdown(before, after) {
        const ta = this.elements.content;
        if (!ta) return;

        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = ta.value.substring(start, end);

        ta.value = ta.value.substring(0, start) + before + selected + after + ta.value.substring(end);
        ta.setSelectionRange(start + before.length + selected.length + after.length, start + before.length + selected.length + after.length);
        ta.focus();
        this.updatePreview();
    }

    load(note) {
        if (this.elements.title) this.elements.title.value = note?.title || '';
        if (this.elements.content) this.elements.content.value = note?.content || '';
        this.updateWordCount();
        this.updateDate(note?.updatedAt);
        this.updatePreview();
    }

    clear() {
        this.load(null);
    }

    get title() {
        return this.elements.title?.value.trim() || '';
    }

    get content() {
        return this.elements.content?.value || '';
    }

    updateWordCount() {
        const words = this.content.trim() ? this.content.trim().split(/\s+/).length : 0;
        if (this.elements.metaWords) {
            this.elements.metaWords.textContent = `${words} word${words !== 1 ? 's' : ''}`;
        }
    }

    updateDate(dateStr) {
        if (this.elements.metaDate) {
            this.elements.metaDate.textContent = dateStr ? formatDate(dateStr) : 'Today';
        }
    }
}

class HelpModal {
    constructor(modal, elements) {
        this.modal = modal;
        this.elements = elements;

        elements.close?.addEventListener('click', () => this.close());
        elements.openBtn?.addEventListener('click', () => this.open());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
    }

    open() {
        this.modal.classList.add('visible');
    }

    close() {
        this.modal.classList.remove('visible');
    }
}

class FileUploader {
    constructor(inputEl) {
        this.input = inputEl;
        this.onTextExtracted = null;

        this.input?.addEventListener('change', (e) => this.handleFile(e));
    }

    handleFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'pdf') {
            this.extractPdfText(file);
        } else if (ext === 'txt' || ext === 'md') {
            this.extractPlainText(file);
        } else {
            if (this.onTextExtracted) {
                this.onTextExtracted(null, 'Unsupported file type. Use PDF, TXT, or MD.');
            }
        }

        this.input.value = '';
    }

    async extractPdfText(file) {
        try {
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js not loaded');
            }

            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';
            for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const text = content.items.map(item => item.str).join(' ');
                fullText += text + '\n\n';
            }

            if (this.onTextExtracted) {
                this.onTextExtracted(fullText.trim(), null);
            }
        } catch (error) {
            if (this.onTextExtracted) {
                this.onTextExtracted(null, 'Failed to read PDF: ' + error.message);
            }
        }
    }

    extractPlainText(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (this.onTextExtracted) {
                this.onTextExtracted(e.target?.result, null);
            }
        };
        reader.onerror = () => {
            if (this.onTextExtracted) {
                this.onTextExtracted(null, 'Failed to read file');
            }
        };
        reader.readAsText(file);
    }
}

export {
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
    FileUploader,
    formatDate,
    escapeHtml,
    safeMarkdownParse
};
