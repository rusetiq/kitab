export const TEMPLATES = {
    blank: {
        id: 'blank',
        name: 'Blank',
        icon: '☐',
        draw: () => { }
    },
    ruled: {
        id: 'ruled',
        name: 'Ruled',
        icon: '≡',
        lineSpacing: 32,
        draw: (ctx, width, height, theme) => {
            ctx.strokeStyle = theme === 'dark' ? 'rgba(230, 184, 74, 0.15)' : 'rgba(26, 23, 20, 0.12)';
            ctx.lineWidth = 1;
            for (let y = TEMPLATES.ruled.lineSpacing; y < height; y += TEMPLATES.ruled.lineSpacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        }
    },
    square: {
        id: 'square',
        name: 'Square Grid',
        icon: '▦',
        gridSize: 32,
        draw: (ctx, width, height, theme) => {
            ctx.strokeStyle = theme === 'dark' ? 'rgba(230, 184, 74, 0.12)' : 'rgba(26, 23, 20, 0.1)';
            ctx.lineWidth = 1;
            const size = TEMPLATES.square.gridSize;
            for (let x = 0; x < width; x += size) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += size) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        }
    },
    dotGrid: {
        id: 'dotGrid',
        name: 'Dot Grid',
        icon: '⋮⋮⋮',
        dotSpacing: 24,
        draw: (ctx, width, height, theme) => {
            ctx.fillStyle = theme === 'dark' ? 'rgba(230, 184, 74, 0.25)' : 'rgba(26, 23, 20, 0.2)';
            const spacing = TEMPLATES.dotGrid.dotSpacing;
            for (let x = spacing; x < width; x += spacing) {
                for (let y = spacing; y < height; y += spacing) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    },
    planner: {
        id: 'planner',
        name: 'Daily Planner',
        icon: '📅',
        draw: (ctx, width, height, theme) => {
            const lineColor = theme === 'dark' ? 'rgba(230, 184, 74, 0.15)' : 'rgba(26, 23, 20, 0.12)';
            const textColor = theme === 'dark' ? 'rgba(230, 184, 74, 0.4)' : 'rgba(26, 23, 20, 0.3)';
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1;

            const headerHeight = 60;
            ctx.beginPath();
            ctx.moveTo(0, headerHeight);
            ctx.lineTo(width, headerHeight);
            ctx.stroke();

            const timeColWidth = 60;
            ctx.beginPath();
            ctx.moveTo(timeColWidth, headerHeight);
            ctx.lineTo(timeColWidth, height);
            ctx.stroke();

            const hourHeight = 48;
            ctx.font = '11px "Sometype Mono", monospace';
            ctx.fillStyle = textColor;

            for (let i = 0; i < 24; i++) {
                const y = headerHeight + (i * hourHeight);
                if (y > height) break;

                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();

                const hour = i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`;
                ctx.fillText(hour, 8, y + 20);
            }
        }
    },
    cornell: {
        id: 'cornell',
        name: 'Cornell Notes',
        icon: '📝',
        draw: (ctx, width, height, theme) => {
            const lineColor = theme === 'dark' ? 'rgba(230, 184, 74, 0.15)' : 'rgba(26, 23, 20, 0.12)';
            const textColor = theme === 'dark' ? 'rgba(230, 184, 74, 0.35)' : 'rgba(26, 23, 20, 0.25)';
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1.5;

            const cueWidth = width * 0.25;
            ctx.beginPath();
            ctx.moveTo(cueWidth, 0);
            ctx.lineTo(cueWidth, height * 0.75);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, height * 0.75);
            ctx.lineTo(width, height * 0.75);
            ctx.stroke();

            ctx.strokeStyle = theme === 'dark' ? 'rgba(230, 184, 74, 0.08)' : 'rgba(26, 23, 20, 0.06)';
            ctx.lineWidth = 1;
            for (let y = 32; y < height * 0.75; y += 32) {
                ctx.beginPath();
                ctx.moveTo(cueWidth + 10, y);
                ctx.lineTo(width - 10, y);
                ctx.stroke();
            }

            ctx.font = '10px "Sometype Mono", monospace';
            ctx.fillStyle = textColor;
            ctx.fillText('CUES', 10, 20);
            ctx.fillText('NOTES', cueWidth + 10, 20);
            ctx.fillText('SUMMARY', 10, height * 0.75 + 20);
        }
    }
};

export class HandwritingCanvas {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            template: 'blank',
            penColor: '#e6b84a',
            penWidth: 2.5,
            eraserWidth: 20,
            ...options
        };

        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.lastPressure = 0.5;
        this.currentTool = 'pen';
        this.theme = document.documentElement.getAttribute('data-theme') || 'dark';

        this.strokes = [];
        this.currentStroke = null;
        this.undoStack = [];
        this.redoStack = [];

        this.setupCanvas();
        this.setupEventListeners();
        this.applyTemplate();
    }

    setupCanvas() {
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'handwriting-wrapper';

        this.bgCanvas = document.createElement('canvas');
        this.bgCanvas.className = 'handwriting-bg-canvas';

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'handwriting-canvas';
        this.canvas.setAttribute('touch-action', 'none');

        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.bgCtx = this.bgCanvas.getContext('2d');

        this.wrapper.appendChild(this.bgCanvas);
        this.wrapper.appendChild(this.canvas);
        this.container.appendChild(this.wrapper);

        this.resizeCanvas();

        this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
        this.resizeObserver.observe(this.container);
    }

    resizeCanvas() {
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        const width = Math.max(rect.width, 800);
        const height = Math.max(rect.height, 1200);

        [this.canvas, this.bgCanvas].forEach(canvas => {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
        });

        this.ctx.scale(dpr, dpr);
        this.bgCtx.scale(dpr, dpr);

        this.applyTemplate();
        this.redrawStrokes();
    }

    setupEventListeners() {
        this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
        this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('pointerleave', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('pointercancel', this.handlePointerUp.bind(this));

        window.addEventListener('themechange', () => {
            this.theme = document.documentElement.getAttribute('data-theme') || 'dark';
            this.applyTemplate();
        });
    }

    handlePointerDown(e) {
        e.preventDefault();
        this.isDrawing = true;

        const rect = this.canvas.getBoundingClientRect();
        this.lastX = e.clientX - rect.left;
        this.lastY = e.clientY - rect.top;
        this.lastPressure = e.pressure || 0.5;

        if (this.currentTool === 'pen') {
            this.currentStroke = {
                tool: 'pen',
                color: this.options.penColor,
                width: this.options.penWidth,
                points: [{ x: this.lastX, y: this.lastY, pressure: this.lastPressure }]
            };
        } else if (this.currentTool === 'highlighter') {
            this.currentStroke = {
                tool: 'highlighter',
                color: this.options.highlighterColor || '#ffeb3b',
                width: this.options.highlighterWidth || 20,
                points: [{ x: this.lastX, y: this.lastY, pressure: 0.3 }]
            };
        }

        this.canvas.setPointerCapture(e.pointerId);
    }

    handlePointerMove(e) {
        if (!this.isDrawing) return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const pressure = e.pressure || 0.5;

        if (this.currentTool === 'eraser') {
            this.erase(x, y);
        } else if (this.currentStroke) {
            this.currentStroke.points.push({ x, y, pressure });
            this.drawStroke(this.currentStroke, true);
        }

        this.lastX = x;
        this.lastY = y;
        this.lastPressure = pressure;
    }

    handlePointerUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (this.currentStroke && this.currentStroke.points.length > 1) {
            this.strokes.push(this.currentStroke);
            this.undoStack.push({ type: 'stroke', index: this.strokes.length - 1 });
            this.redoStack = [];
        }

        this.currentStroke = null;
        this.canvas.releasePointerCapture(e.pointerId);
    }

    drawStroke(stroke, isCurrentStroke = false) {
        if (!stroke.points || stroke.points.length < 2) return;

        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        if (stroke.tool === 'highlighter') {
            this.ctx.globalCompositeOperation = 'multiply';
            this.ctx.globalAlpha = 0.3;
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.globalAlpha = 1;
        }

        const startIndex = isCurrentStroke && stroke.points.length > 2 ? stroke.points.length - 2 : 0;

        for (let i = startIndex; i < stroke.points.length - 1; i++) {
            const p1 = stroke.points[i];
            const p2 = stroke.points[i + 1];

            const avgPressure = (p1.pressure + p2.pressure) / 2;
            const width = stroke.width * (0.5 + avgPressure * 0.8);

            this.ctx.beginPath();
            this.ctx.strokeStyle = stroke.color;
            this.ctx.lineWidth = width;
            this.ctx.moveTo(p1.x, p1.y);

            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            this.ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);

            this.ctx.stroke();
        }

        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1;
    }

    erase(x, y) {
        const eraserSize = this.options.eraserWidth;
        const eraserRect = { x: x - eraserSize / 2, y: y - eraserSize / 2, width: eraserSize, height: eraserSize };

        this.strokes = this.strokes.filter(stroke => {
            return !stroke.points.some(p =>
                p.x >= eraserRect.x && p.x <= eraserRect.x + eraserRect.width &&
                p.y >= eraserRect.y && p.y <= eraserRect.y + eraserRect.height
            );
        });

        this.redrawStrokes();
    }

    redrawStrokes() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.strokes.forEach(stroke => this.drawStroke(stroke));
    }

    applyTemplate() {
        const template = TEMPLATES[this.options.template];
        const dpr = window.devicePixelRatio || 1;
        const width = this.bgCanvas.width / dpr;
        const height = this.bgCanvas.height / dpr;

        this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);

        if (template && template.draw) {
            template.draw(this.bgCtx, width, height, this.theme);
        }
    }

    setTemplate(templateId) {
        this.options.template = templateId;
        this.applyTemplate();
    }

    setTool(tool) {
        this.currentTool = tool;
    }

    setPenColor(color) {
        this.options.penColor = color;
    }

    setPenWidth(width) {
        this.options.penWidth = width;
    }

    undo() {
        if (this.undoStack.length === 0) return;

        const action = this.undoStack.pop();
        if (action.type === 'stroke') {
            const stroke = this.strokes.pop();
            this.redoStack.push({ type: 'stroke', stroke });
        }

        this.redrawStrokes();
    }

    redo() {
        if (this.redoStack.length === 0) return;

        const action = this.redoStack.pop();
        if (action.type === 'stroke') {
            this.strokes.push(action.stroke);
            this.undoStack.push({ type: 'stroke', index: this.strokes.length - 1 });
        }

        this.redrawStrokes();
    }

    clear() {
        this.undoStack.push({ type: 'clear', strokes: [...this.strokes] });
        this.strokes = [];
        this.redoStack = [];
        this.redrawStrokes();
    }

    getData() {
        return {
            template: this.options.template,
            strokes: this.strokes,
            penColor: this.options.penColor,
            penWidth: this.options.penWidth
        };
    }

    loadData(data) {
        if (!data) return;

        if (data.template) {
            this.options.template = data.template;
            this.applyTemplate();
        }

        if (data.strokes) {
            this.strokes = data.strokes;
            this.redrawStrokes();
        }

        if (data.penColor) this.options.penColor = data.penColor;
        if (data.penWidth) this.options.penWidth = data.penWidth;
    }

    destroy() {
        this.resizeObserver.disconnect();
        this.wrapper.remove();
    }

    exportAsImage() {
        const dpr = window.devicePixelRatio || 1;
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.canvas.width;
        exportCanvas.height = this.canvas.height;
        const exportCtx = exportCanvas.getContext('2d');

        exportCtx.fillStyle = this.theme === 'dark' ? '#1a1714' : '#f8f6f2';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        exportCtx.drawImage(this.bgCanvas, 0, 0);
        exportCtx.drawImage(this.canvas, 0, 0);

        return exportCanvas.toDataURL('image/png');
    }
}

export class HandwritingToolbar {
    constructor(container, canvas, options = {}) {
        this.container = container;
        this.canvas = canvas;
        this.options = options;
        this.currentTool = 'pen';
        this.currentColor = '#e6b84a';

        this.render();
        this.bindEvents();
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = 'handwriting-toolbar glass-panel';
        this.element.innerHTML = `
            <div class="hw-toolbar-group hw-tools">
                <button class="hw-tool-btn active" data-tool="pen" title="Pen">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                    </svg>
                </button>
                <button class="hw-tool-btn" data-tool="highlighter" title="Highlighter">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="m9 11-6 6v3h9l3-3"/>
                        <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>
                    </svg>
                </button>
                <button class="hw-tool-btn" data-tool="eraser" title="Eraser">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>
                        <path d="M22 21H7"/>
                        <path d="m5 11 9 9"/>
                    </svg>
                </button>
            </div>
            <div class="hw-toolbar-sep"></div>
            <div class="hw-toolbar-group hw-colors">
                <button class="hw-color-btn active" data-color="#e6b84a" style="--color: #e6b84a" title="Gold"></button>
                <button class="hw-color-btn" data-color="#f0e6d2" style="--color: #f0e6d2" title="Light"></button>
                <button class="hw-color-btn" data-color="#4a6b5c" style="--color: #4a6b5c" title="Teal"></button>
                <button class="hw-color-btn" data-color="#c4525a" style="--color: #c4525a" title="Rose"></button>
                <button class="hw-color-btn" data-color="#8b7355" style="--color: #8b7355" title="Brown"></button>
            </div>
            <div class="hw-toolbar-sep"></div>
            <div class="hw-toolbar-group hw-sizes">
                <button class="hw-size-btn" data-size="1" title="Fine">
                    <span class="hw-size-dot" style="width: 4px; height: 4px;"></span>
                </button>
                <button class="hw-size-btn active" data-size="2.5" title="Medium">
                    <span class="hw-size-dot" style="width: 8px; height: 8px;"></span>
                </button>
                <button class="hw-size-btn" data-size="5" title="Thick">
                    <span class="hw-size-dot" style="width: 12px; height: 12px;"></span>
                </button>
            </div>
            <div class="hw-toolbar-sep"></div>
            <div class="hw-toolbar-group hw-templates">
                <button class="hw-template-btn" data-template="blank" title="Blank">☐</button>
                <button class="hw-template-btn" data-template="ruled" title="Ruled">≡</button>
                <button class="hw-template-btn" data-template="square" title="Grid">▦</button>
                <button class="hw-template-btn" data-template="dotGrid" title="Dots">⋮</button>
                <button class="hw-template-btn" data-template="planner" title="Planner">📅</button>
                <button class="hw-template-btn" data-template="cornell" title="Cornell">📝</button>
            </div>
            <div class="hw-toolbar-grow"></div>
            <div class="hw-toolbar-group hw-actions">
                <button class="hw-action-btn" data-action="undo" title="Undo (Ctrl+Z)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M3 7v6h6"/>
                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                    </svg>
                </button>
                <button class="hw-action-btn" data-action="redo" title="Redo (Ctrl+Y)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 7v6h-6"/>
                        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
                    </svg>
                </button>
                <button class="hw-action-btn hw-danger" data-action="clear" title="Clear All">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                </button>
                <button class="hw-action-btn" data-action="export" title="Export as Image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                </button>
            </div>
        `;

        this.container.appendChild(this.element);
    }

    bindEvents() {
        this.element.querySelectorAll('.hw-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.element.querySelectorAll('.hw-tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                this.canvas.setTool(this.currentTool);
            });
        });

        this.element.querySelectorAll('.hw-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.element.querySelectorAll('.hw-color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentColor = btn.dataset.color;
                this.canvas.setPenColor(this.currentColor);
            });
        });

        this.element.querySelectorAll('.hw-size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.element.querySelectorAll('.hw-size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.canvas.setPenWidth(parseFloat(btn.dataset.size));
            });
        });

        this.element.querySelectorAll('.hw-template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.element.querySelectorAll('.hw-template-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.canvas.setTemplate(btn.dataset.template);
            });
        });

        this.element.querySelectorAll('.hw-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                switch (action) {
                    case 'undo':
                        this.canvas.undo();
                        break;
                    case 'redo':
                        this.canvas.redo();
                        break;
                    case 'clear':
                        if (confirm('Clear all strokes?')) {
                            this.canvas.clear();
                        }
                        break;
                    case 'export':
                        this.exportImage();
                        break;
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.canvas.undo();
            } else if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                this.canvas.redo();
            }
        });
    }

    exportImage() {
        const dataUrl = this.canvas.exportAsImage();
        const link = document.createElement('a');
        link.download = `kitab-note-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    }

    destroy() {
        this.element.remove();
    }
}
