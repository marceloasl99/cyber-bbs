/**
 * CYBER BBS — Virtual Terminal Engine & CP437 High-Resolution Renderer
 * High-Definition 1440x800 internal canvas buffer, In-Terminal Interactive Input Prompt (Zero Browser Pop-ups),
 * 80x25 character matrix, ANSI parser, and Arrow Key Pre-Selection Bar.
 */
(function() {
  window.CyberBBS = window.CyberBBS || {};

  class BBSTerminal {
    constructor() {
      this.cols = 80;
      this.rows = 25;
      // High-Definition Canvas Geometry (2x resolution: 1440x800)
      this.cellWidth = 18;   // 80 * 18 = 1440px
      this.cellHeight = 32;  // 25 * 32 = 800px
      this.canvas = null;
      this.ctx = null;
      this.overlay = null;

      // Virtual Grid Buffer [row][col]
      this.buffer = [];
      this.cursor = { col: 0, row: 0, visible: true };
      this.currentFg = 7;
      this.currentBg = 0;
      this.bold = false;
      this.reverse = false;
      this.underline = false;

      // Interactive hit regions
      this.hitRegions = [];
      this.activeRegionIdx = -1;
      this.hoveredRegion = null;

      // Output queue & pacing
      this.outputQueue = [];
      this.isPacing = false;
      this.cps = 1440;
      this.pacingRaf = null;

      // In-Terminal Input Prompt state (No window.prompt!)
      this.activePrompt = null;

      // Notice message
      this.noticeText = '';
      this.noticeExpiry = 0;

      // Cursor blink timer
      this.cursorBlink = true;
      setInterval(() => {
        this.cursorBlink = !this.cursorBlink;
        if (this.activePrompt) {
          this.drawPromptBox();
        } else {
          this.renderCursor();
        }
      }, 500);

      this.initBuffer();
    }

    init(canvasId, overlayId) {
      this.canvas = document.getElementById(canvasId);
      this.overlay = document.getElementById(overlayId);
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d', { alpha: false });
      this.canvas.width = this.cols * this.cellWidth;
      this.canvas.height = this.rows * this.cellHeight;

      // Disable bilinear interpolation for crisp IBM VGA pixel font
      this.ctx.imageSmoothingEnabled = false;

      this.setupMouseEvents();

      // Trigger crisp redraw once embedded fonts are ready
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          this.redrawAll();
        });
      }

      this.redrawAll();
    }

    initBuffer() {
      this.buffer = [];
      for (let r = 0; r < this.rows; r++) {
        const row = [];
        for (let c = 0; c < this.cols; c++) {
          row.push({ ch: ' ', fg: 7, bg: 0, bold: false, reverse: false });
        }
        this.buffer.push(row);
      }
    }

    clear() {
      this.initBuffer();
      this.cursor.col = 0;
      this.cursor.row = 0;
      this.hitRegions = [];
      this.activeRegionIdx = -1;
      this.hoveredRegion = null;
      this.redrawAll();
    }

    setCursor(col, row) {
      this.cursor.col = Math.max(0, Math.min(this.cols - 1, col));
      this.cursor.row = Math.max(0, Math.min(this.rows - 1, row));
    }

    setColor(fg, bg) {
      if (fg !== undefined && fg !== null) this.currentFg = fg;
      if (bg !== undefined && bg !== null) this.currentBg = bg;
    }

    addHitRegion(col, row, width, height, id, action, label = '', numKey = null) {
      const region = {
        col, row, width, height,
        id, action, label,
        numKey: numKey !== null ? String(numKey).toUpperCase() : null,
        idx: this.hitRegions.length
      };
      this.hitRegions.push(region);
      return region;
    }

    clearHitRegions() {
      this.hitRegions = [];
      this.activeRegionIdx = -1;
      this.hoveredRegion = null;
    }

    selectNextRegion(forward = true) {
      if (this.hitRegions.length === 0) return;
      if (this.activeRegionIdx === -1) {
        this.activeRegionIdx = forward ? 0 : this.hitRegions.length - 1;
      } else if (forward) {
        this.activeRegionIdx = (this.activeRegionIdx + 1) % this.hitRegions.length;
      } else {
        this.activeRegionIdx = (this.activeRegionIdx - 1 + this.hitRegions.length) % this.hitRegions.length;
      }

      const region = this.hitRegions[this.activeRegionIdx];
      this.hoveredRegion = region;
      this.highlightRegion(region);
      if (window.CyberBBS.Audio) window.CyberBBS.Audio.playKeyClick();
    }

    triggerByNumKey(key) {
      const target = String(key).toUpperCase();
      const region = this.hitRegions.find(r => r.numKey === target);
      if (region && typeof region.action === 'function') {
        this.activeRegionIdx = region.idx;
        this.hoveredRegion = region;
        this.highlightRegion(region);
        if (window.CyberBBS.Audio) window.CyberBBS.Audio.playKeyClick();
        region.action();
        return true;
      }
      return false;
    }

    activateCurrentRegion() {
      if (this.activeRegionIdx >= 0 && this.activeRegionIdx < this.hitRegions.length) {
        const region = this.hitRegions[this.activeRegionIdx];
        if (typeof region.action === 'function') {
          if (window.CyberBBS.Audio) window.CyberBBS.Audio.playKeyClick();
          region.action();
          return true;
        }
      }
      return false;
    }

    highlightRegion(region) {
      this.redrawAll();
      if (!region) return;

      const x = region.col * this.cellWidth;
      const y = region.row * this.cellHeight;
      const w = region.width * this.cellWidth;
      const h = region.height * this.cellHeight;

      this.ctx.strokeStyle = '#FFFF55';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

      // Draw indicator '►' at left cell if space allows
      if (region.col > 0) {
        this.drawBoxGlyph('►', (region.col - 1) * this.cellWidth, y, this.cellWidth, this.cellHeight, '#FFFF55');
      }
    }

    setupMouseEvents() {
      if (!this.overlay) return;

      const getColRow = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = clientX * scaleX;
        const y = clientY * scaleY;
        const col = Math.floor(x / this.cellWidth);
        const row = Math.floor(y / this.cellHeight);
        return { col, row };
      };

      this.overlay.addEventListener('mousemove', (e) => {
        if (this.activePrompt) return;
        const { col, row } = getColRow(e);
        let found = null;
        for (const r of this.hitRegions) {
          if (col >= r.col && col < r.col + r.width && row >= r.row && row < r.row + r.height) {
            found = r;
            break;
          }
        }

        if (found !== this.hoveredRegion) {
          this.hoveredRegion = found;
          if (found) {
            this.activeRegionIdx = found.idx;
            this.overlay.style.cursor = 'pointer';
            this.highlightRegion(found);
          } else {
            this.overlay.style.cursor = 'default';
            this.redrawAll();
          }
        }
      });

      this.overlay.addEventListener('click', (e) => {
        if (this.isPacing) {
          this.skipPacing();
          return;
        }
        if (this.activePrompt) return;

        const { col, row } = getColRow(e);
        for (const r of this.hitRegions) {
          if (col >= r.col && col < r.col + r.width && row >= r.row && row < r.row + r.height) {
            if (window.CyberBBS.Audio) window.CyberBBS.Audio.playKeyClick();
            if (typeof r.action === 'function') {
              r.action();
            }
            break;
          }
        }
      });
    }

    putChar(ch, fg, bg) {
      if (this.cursor.col >= this.cols) {
        this.cursor.col = 0;
        this.cursor.row++;
      }
      if (this.cursor.row >= this.rows - 1) {
        this.scrollUp();
        this.cursor.row = this.rows - 2;
      }

      const effectiveFg = this.reverse ? (bg !== undefined ? bg : this.currentBg) : (fg !== undefined ? fg : this.currentFg);
      const effectiveBg = this.reverse ? (fg !== undefined ? fg : this.currentFg) : (bg !== undefined ? bg : this.currentBg);

      this.buffer[this.cursor.row][this.cursor.col] = {
        ch,
        fg: effectiveFg,
        bg: effectiveBg,
        bold: this.bold,
        reverse: this.reverse
      };

      this.drawCell(this.cursor.col, this.cursor.row);
      this.cursor.col++;
    }

    scrollUp() {
      for (let r = 0; r < this.rows - 2; r++) {
        this.buffer[r] = this.buffer[r + 1];
      }
      const blankRow = [];
      for (let c = 0; c < this.cols; c++) {
        blankRow.push({ ch: ' ', fg: 7, bg: 0, bold: false, reverse: false });
      }
      this.buffer[this.rows - 2] = blankRow;
      this.redrawAll();
    }

    print(text, fg, bg) {
      if (fg !== undefined) this.currentFg = fg;
      if (bg !== undefined) this.currentBg = bg;

      let i = 0;
      while (i < text.length) {
        const char = text[i];

        if (char === '\x1b' && text[i + 1] === '[') {
          let j = i + 2;
          while (j < text.length && !/[a-zA-Z]/.test(text[j])) j++;
          if (j < text.length) {
            const seq = text.substring(i + 2, j);
            const cmd = text[j];
            this.handleAnsi(seq, cmd);
            i = j + 1;
            continue;
          }
        }

        if (char === '\r') {
          this.cursor.col = 0;
        } else if (char === '\n') {
          this.cursor.col = 0;
          this.cursor.row++;
          if (this.cursor.row >= this.rows - 1) {
            this.scrollUp();
            this.cursor.row = this.rows - 2;
          }
        } else if (char === '\t') {
          this.cursor.col = (Math.floor(this.cursor.col / 8) + 1) * 8;
        } else if (char === '\b') {
          if (this.cursor.col > 0) this.cursor.col--;
        } else {
          this.putChar(char, this.currentFg, this.currentBg);
        }
        i++;
      }
    }

    println(text, fg, bg) {
      this.print(text + '\r\n', fg, bg);
    }

    handleAnsi(paramsStr, cmd) {
      const params = paramsStr.split(';').map(n => parseInt(n, 10) || 0);

      if (cmd === 'm') {
        if (paramsStr === '' || params[0] === 0) {
          this.currentFg = 7;
          this.currentBg = 0;
          this.bold = false;
          this.reverse = false;
          return;
        }
        for (let p of params) {
          if (p === 1) this.bold = true;
          else if (p === 7) this.reverse = true;
          else if (p >= 30 && p <= 37) this.currentFg = (this.bold ? p - 30 + 8 : p - 30);
          else if (p >= 40 && p <= 47) this.currentBg = p - 40;
          else if (p >= 90 && p <= 97) this.currentFg = p - 90 + 8;
          else if (p >= 100 && p <= 107) this.currentBg = p - 100 + 8;
        }
      } else if (cmd === 'H' || cmd === 'f') {
        const r = (params[0] || 1) - 1;
        const c = (params[1] || 1) - 1;
        this.setCursor(c, r);
      } else if (cmd === 'J') {
        if (params[0] === 2) this.clear();
      } else if (cmd === 'K') {
        for (let c = this.cursor.col; c < this.cols; c++) {
          this.buffer[this.cursor.row][c] = { ch: ' ', fg: 7, bg: 0, bold: false, reverse: false };
        }
        this.redrawRow(this.cursor.row);
      }
    }

    writePaced(text, onComplete) {
      this.outputQueue = text.split('');
      this.isPacing = true;

      const charsPerFrame = Math.max(2, Math.floor(this.cps / 60));
      const step = () => {
        if (!this.isPacing || this.outputQueue.length === 0) {
          this.isPacing = false;
          if (typeof onComplete === 'function') onComplete();
          return;
        }

        let chunk = '';
        for (let i = 0; i < charsPerFrame && this.outputQueue.length > 0; i++) {
          chunk += this.outputQueue.shift();
        }
        this.print(chunk);
        this.pacingRaf = requestAnimationFrame(step);
      };

      step();
    }

    skipPacing() {
      if (!this.isPacing) return;
      this.isPacing = false;
      if (this.pacingRaf) cancelAnimationFrame(this.pacingRaf);
      const remaining = this.outputQueue.join('');
      this.outputQueue = [];
      this.print(remaining);
      this.redrawAll();
    }

    showNotice(text, durationMs = 3500) {
      this.noticeText = text;
      this.noticeExpiry = Date.now() + durationMs;
      this.renderStatusBar();
    }

    renderStatusBar() {
      const store = window.CyberBBS.Store;
      const user = store ? store.currentUser : null;
      const handle = user ? user.handle : 'GUEST';
      const timeLeft = store ? store.getTimeRemainingFormatted() : '30:00';
      const credits = user ? user.credits : 500;
      const ratio = store ? store.getRatio() : '1:3';

      let text = '';
      if (this.noticeText && Date.now() < this.noticeExpiry) {
        text = ` ${this.noticeText.padEnd(78, ' ')} `;
      } else {
        const left = ` NODE 1 · 14.4k · ${handle} · TIME: ${timeLeft} · CR: ${credits} · RATIO: ${ratio}`;
        const right = `[F11:FULL] [M:MUTE] [ESC:BACK] `;
        text = (left.padEnd(79 - right.length, ' ') + right).substring(0, 80);
      }

      for (let c = 0; c < 80; c++) {
        this.buffer[24][c] = {
          ch: text[c] || ' ',
          fg: 0,
          bg: 3,
          bold: true,
          reverse: false
        };
        this.drawCell(c, 24);
      }

      this.addHitRegion(50, 24, 10, 1, 'btn-fs', () => window.CyberBBS.App.toggleFullscreen(), 'Fullscreen');
      this.addHitRegion(61, 24, 8, 1, 'btn-mute', () => window.CyberBBS.App.toggleMute(), 'Mute');
      this.addHitRegion(70, 24, 10, 1, 'btn-back', () => window.CyberBBS.App.goBack(), 'Back');
    }

    drawCell(col, row) {
      if (!this.ctx) return;
      const cell = this.buffer[row][col];
      const x = col * this.cellWidth;
      const y = row * this.cellHeight;
      const w = this.cellWidth;
      const h = this.cellHeight;

      // 1. Draw cell background
      this.ctx.fillStyle = this.getPaletteColor(cell.bg);
      this.ctx.fillRect(x, y, w, h);

      if (!cell.ch || cell.ch === ' ') return;

      const fgColor = this.getPaletteColor(cell.fg);

      // 2. Procedural rendering for all box-drawing, block, and UI symbol characters (100% gapless)
      if (this.isBoxOrBlockChar(cell.ch)) {
        this.drawBoxGlyph(cell.ch, x, y, w, h, fgColor);
        return;
      }

      // 3. Crisp character rendering with authentic IBM VGA font (32px matching 18x32 cell)
      this.ctx.fillStyle = fgColor;
      this.ctx.font = '32px "Px437_IBM_VGA9", "Px437_IBM_VGA8", "Consolas", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(cell.ch, x + w / 2, y + h / 2);
    }

    renderCursor() {
      if (!this.ctx || !this.cursor.visible) return;
      const x = this.cursor.col * this.cellWidth;
      const y = this.cursor.row * this.cellHeight;

      if (this.cursorBlink) {
        this.ctx.fillStyle = this.getPaletteColor(14);
        this.ctx.fillRect(x, y + this.cellHeight - 6, this.cellWidth, 4);
      } else {
        this.drawCell(this.cursor.col, this.cursor.row);
      }
    }

    redrawRow(row) {
      for (let c = 0; c < this.cols; c++) this.drawCell(c, row);
    }

    redrawAll() {
      if (!this.ctx) return;
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          this.drawCell(c, r);
        }
      }
      if (this.activePrompt) {
        this.drawPromptBox();
      } else {
        this.renderCursor();
      }
    }

    // ==========================================
    // IN-TERMINAL INTERACTIVE INPUT PROMPT (NO POP-UPS!)
    // ==========================================
    promptInline(title, promptLabel, defaultVal = '', onSubmit, onCancel, isMasked = false) {
      this.activePrompt = {
        title,
        label: promptLabel,
        value: String(defaultVal || ''),
        isMasked: !!isMasked,
        onSubmit,
        onCancel
      };
      this.drawPromptBox();
    }

    drawPromptBox() {
      if (!this.ctx || !this.activePrompt) return;
      const p = this.activePrompt;

      const boxCols = 64;
      const boxRows = 7;
      const startCol = Math.floor((this.cols - boxCols) / 2);
      const startRow = 8;

      const px = startCol * this.cellWidth;
      const py = startRow * this.cellHeight;
      const pw = boxCols * this.cellWidth;
      const ph = boxRows * this.cellHeight;

      // Dark blue dialog background with cyan border
      this.ctx.fillStyle = '#000088';
      this.ctx.fillRect(px, py, pw, ph);

      this.ctx.strokeStyle = '#55FFFF';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(px + 1.5, py + 1.5, pw - 3, ph - 3);

      this.ctx.font = '28px "Px437_IBM_VGA9", "Px437_IBM_VGA8", "Consolas", monospace';
      this.ctx.textBaseline = 'top';
      this.ctx.textAlign = 'left';

      // Title bar
      this.ctx.fillStyle = '#55FFFF';
      this.ctx.fillText(`──[ ${p.title.toUpperCase()} ]──`, px + 24, py + 14);

      // Label
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillText(p.label, px + 24, py + 52);

      // Input field box (black background)
      const fieldX = px + 24;
      const fieldY = py + 88;
      const fieldW = pw - 48;
      const fieldH = 38;

      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(fieldX, fieldY, fieldW, fieldH);
      this.ctx.strokeStyle = '#FFFF55';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(fieldX, fieldY, fieldW, fieldH);

      // Typed value
      this.ctx.fillStyle = '#FFFF55';
      const displayVal = p.isMasked ? '•'.repeat(p.value.length) : p.value;
      this.ctx.fillText('> ' + displayVal, fieldX + 8, fieldY + 4);

      // Blinking cursor inside input
      if (this.cursorBlink) {
        const textMetrics = this.ctx.measureText('> ' + displayVal);
        this.ctx.fillStyle = '#FFFF55';
        this.ctx.fillRect(fieldX + 10 + textMetrics.width, fieldY + 6, 12, 26);
      }

      // Footer hint
      this.ctx.fillStyle = '#AAAAAA';
      this.ctx.font = '20px "Px437_IBM_VGA9", "Px437_IBM_VGA8", "Consolas", monospace';
      this.ctx.fillText('[ENTER] Confirm      [ESC] Cancel', px + 24, py + 160);
    }

    handlePromptKey(e) {
      if (!this.activePrompt) return false;
      const p = this.activePrompt;

      if (e.key === 'Enter') {
        const val = p.value.trim();
        const callback = p.onSubmit;
        this.activePrompt = null;
        this.redrawAll();
        if (typeof callback === 'function') callback(val);
        return true;
      }

      if (e.key === 'Escape') {
        const cancelCb = p.onCancel;
        this.activePrompt = null;
        this.redrawAll();
        if (typeof cancelCb === 'function') cancelCb();
        return true;
      }

      if (e.key === 'Backspace') {
        p.value = p.value.slice(0, -1);
        this.drawPromptBox();
        if (window.CyberBBS.Audio) window.CyberBBS.Audio.playKeyClick();
        return true;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
        if (p.value.length < 52) {
          p.value += e.key;
          this.drawPromptBox();
          if (window.CyberBBS.Audio) window.CyberBBS.Audio.playKeyClick();
        }
        return true;
      }

      return true;
    }

    isBoxOrBlockChar(ch) {
      if (!ch || ch.length !== 1) return false;
      const code = ch.charCodeAt(0);
      if (code >= 0x2500 && code <= 0x259F) return true;
      if (ch === '►' || ch === '◄' || ch === '▲' || ch === '▼' || ch === '■' || ch === '•' || ch === '▪' || ch === '▫') return true;
      return false;
    }

    drawBoxGlyph(ch, x, y, w, h, color) {
      const ctx = this.ctx;
      ctx.fillStyle = color;
      const cx = Math.floor(w / 2);
      const cy = Math.floor(h / 2);
      const lw = 2;
      const lx = x + cx - Math.floor(lw / 2);
      const ly = y + cy - Math.floor(lw / 2);

      // 1. Solid & Half Blocks
      if (ch === '█') { ctx.fillRect(x, y, w, h); return; }
      if (ch === '▀') { ctx.fillRect(x, y, w, cy); return; }
      if (ch === '▄') { ctx.fillRect(x, y + cy, w, h - cy); return; }
      if (ch === '▌') { ctx.fillRect(x, y, cx, h); return; }
      if (ch === '▐') { ctx.fillRect(x + cx, y, w - cx, h); return; }

      // 2. Shading Elements
      if (ch === '░' || ch === '▒' || ch === '▓') {
        for (let py = 0; py < h; py += 2) {
          for (let px = 0; px < w; px += 2) {
            const pattern = ((px + py) / 2) % 2 === 0;
            if (ch === '▒' && pattern) {
              ctx.fillRect(x + px, y + py, 2, 2);
            } else if (ch === '░' && px % 4 === 0 && py % 4 === 0) {
              ctx.fillRect(x + px, y + py, 2, 2);
            } else if (ch === '▓' && (pattern || px % 4 === 0)) {
              ctx.fillRect(x + px, y + py, 2, 2);
            }
          }
        }
        return;
      }

      // 3. Single-line Box Drawing
      if (ch === '─') { ctx.fillRect(x, ly, w, lw); return; }
      if (ch === '│') { ctx.fillRect(lx, y, lw, h); return; }
      if (ch === '┌') { ctx.fillRect(lx, ly, w - cx + 1, lw); ctx.fillRect(lx, ly, lw, h - cy + 1); return; }
      if (ch === '┐') { ctx.fillRect(x, ly, cx + 1, lw); ctx.fillRect(lx, ly, lw, h - cy + 1); return; }
      if (ch === '└') { ctx.fillRect(lx, ly, w - cx + 1, lw); ctx.fillRect(lx, y, lw, cy + 1); return; }
      if (ch === '┘') { ctx.fillRect(x, ly, cx + 1, lw); ctx.fillRect(lx, y, lw, cy + 1); return; }
      if (ch === '├') { ctx.fillRect(lx, y, lw, h); ctx.fillRect(lx, ly, w - cx + 1, lw); return; }
      if (ch === '┤') { ctx.fillRect(lx, y, lw, h); ctx.fillRect(x, ly, cx + 1, lw); return; }
      if (ch === '┬') { ctx.fillRect(x, ly, w, lw); ctx.fillRect(lx, ly, lw, h - cy + 1); return; }
      if (ch === '┴') { ctx.fillRect(x, ly, w, lw); ctx.fillRect(lx, y, lw, cy + 1); return; }
      if (ch === '┼') { ctx.fillRect(x, ly, w, lw); ctx.fillRect(lx, y, lw, h); return; }

      // 4. Double-line Box Drawing
      const y1 = ly - 3, y2 = ly + 3;
      const x1 = lx - 3, x2 = lx + 3;
      if (ch === '═') { ctx.fillRect(x, y1, w, lw); ctx.fillRect(x, y2, w, lw); return; }
      if (ch === '║') { ctx.fillRect(x1, y, lw, h); ctx.fillRect(x2, y, lw, h); return; }
      if (ch === '╔') {
        ctx.fillRect(x1, y1, w - (cx - 3), lw); ctx.fillRect(x2, y2, w - (cx + 3), lw);
        ctx.fillRect(x1, y1, lw, h - (cy - 3)); ctx.fillRect(x2, y2, lw, h - (cy + 3));
        return;
      }
      if (ch === '╗') {
        ctx.fillRect(x, y1, cx + 3, lw); ctx.fillRect(x, y2, cx - 1, lw);
        ctx.fillRect(x2, y1, lw, h - (cy - 3)); ctx.fillRect(x1, y2, lw, h - (cy + 3));
        return;
      }
      if (ch === '╚') {
        ctx.fillRect(x1, y, lw, cy + 5); ctx.fillRect(x2, y, lw, cy - 1);
        ctx.fillRect(x1, y2, w - (cx - 3), lw); ctx.fillRect(x2, y1, w - (cx + 3), lw);
        return;
      }
      if (ch === '╝') {
        ctx.fillRect(x1, y, lw, cy - 1); ctx.fillRect(x2, y, lw, cy + 5);
        ctx.fillRect(x, y1, cx - 1, lw); ctx.fillRect(x, y2, cx + 5, lw);
        return;
      }
      if (ch === '╠') {
        ctx.fillRect(x1, y, lw, h);
        ctx.fillRect(x2, y, lw, cy - 1);
        ctx.fillRect(x2, y + cy + 5, lw, h - (cy + 5));
        ctx.fillRect(x2, y1, w - (cx + 3), lw);
        ctx.fillRect(x2, y2, w - (cx + 3), lw);
        return;
      }
      if (ch === '╣') {
        ctx.fillRect(x2, y, lw, h);
        ctx.fillRect(x1, y, lw, cy - 1);
        ctx.fillRect(x1, y + cy + 5, lw, h - (cy + 5));
        ctx.fillRect(x, y1, cx - 1, lw);
        ctx.fillRect(x, y2, cx - 1, lw);
        return;
      }
      if (ch === '╦') {
        ctx.fillRect(x, y1, w, lw);
        ctx.fillRect(x, y2, cx - 1, lw);
        ctx.fillRect(x + cx + 5, y2, w - (cx + 5), lw);
        ctx.fillRect(x1, y2, lw, h - (cy + 3));
        ctx.fillRect(x2, y2, lw, h - (cy + 3));
        return;
      }
      if (ch === '╩') {
        ctx.fillRect(x, y2, w, lw);
        ctx.fillRect(x, y1, cx - 1, lw);
        ctx.fillRect(x + cx + 5, y1, w - (cx + 5), lw);
        ctx.fillRect(x1, y, lw, cy - 1);
        ctx.fillRect(x2, y, lw, cy - 1);
        return;
      }
      if (ch === '╬') {
        ctx.fillRect(x, y1, cx - 1, lw); ctx.fillRect(x + cx + 5, y1, w - (cx + 5), lw);
        ctx.fillRect(x, y2, cx - 1, lw); ctx.fillRect(x + cx + 5, y2, w - (cx + 5), lw);
        ctx.fillRect(x1, y, lw, cy - 1); ctx.fillRect(x1, y + cy + 5, lw, h - (cy + 5));
        ctx.fillRect(x2, y, lw, cy - 1); ctx.fillRect(x2, y + cy + 5, lw, h - (cy + 5));
        return;
      }

      // 5. Mixed Single / Double lines
      if (ch === '╒' || ch === '╓') {
        ctx.fillRect(lx, ly, w - cx + 1, lw); ctx.fillRect(lx, ly, lw, h - cy + 1);
        if (ch === '╒') ctx.fillRect(lx, ly - 3, w - cx + 1, lw);
        return;
      }
      if (ch === '╕' || ch === '╖') {
        ctx.fillRect(x, ly, cx + 1, lw); ctx.fillRect(lx, ly, lw, h - cy + 1);
        if (ch === '╕') ctx.fillRect(x, ly - 3, cx + 1, lw);
        return;
      }
      if (ch === '╘' || ch === '╙') {
        ctx.fillRect(lx, ly, w - cx + 1, lw); ctx.fillRect(lx, y, lw, cy + 1);
        if (ch === '╘') ctx.fillRect(lx, ly + 3, w - cx + 1, lw);
        return;
      }
      if (ch === '╛' || ch === '╜') {
        ctx.fillRect(x, ly, cx + 1, lw); ctx.fillRect(lx, y, lw, cy + 1);
        if (ch === '╛') ctx.fillRect(x, ly + 3, cx + 1, lw);
        return;
      }
      if (ch === '╞' || ch === '╟') {
        ctx.fillRect(lx, y, lw, h); ctx.fillRect(lx, ly, w - cx + 1, lw);
        return;
      }
      if (ch === '╡' || ch === '╢') {
        ctx.fillRect(lx, y, lw, h); ctx.fillRect(x, ly, cx + 1, lw);
        return;
      }
      if (ch === '╤' || ch === '╥') {
        ctx.fillRect(x, ly, w, lw); ctx.fillRect(lx, ly, lw, h - cy + 1);
        return;
      }
      if (ch === '╧' || ch === '╨') {
        ctx.fillRect(x, ly, w, lw); ctx.fillRect(lx, y, lw, cy + 1);
        return;
      }
      if (ch === '╪' || ch === '╫') {
        ctx.fillRect(x, ly, w, lw); ctx.fillRect(lx, y, lw, h);
        return;
      }

      // 6. Geometric UI shapes
      if (ch === '►') {
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 6);
        ctx.lineTo(x + w - 4, y + cy);
        ctx.lineTo(x + 4, y + h - 6);
        ctx.closePath();
        ctx.fill();
        return;
      }
      if (ch === '◄') {
        ctx.beginPath();
        ctx.moveTo(x + w - 4, y + 6);
        ctx.lineTo(x + 4, y + cy);
        ctx.lineTo(x + w - 4, y + h - 6);
        ctx.closePath();
        ctx.fill();
        return;
      }
      if (ch === '▲') {
        ctx.beginPath();
        ctx.moveTo(x + cx, y + 6);
        ctx.lineTo(x + w - 4, y + h - 6);
        ctx.lineTo(x + 4, y + h - 6);
        ctx.closePath();
        ctx.fill();
        return;
      }
      if (ch === '▼') {
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 6);
        ctx.lineTo(x + w - 4, y + 6);
        ctx.lineTo(x + cx, y + h - 6);
        ctx.closePath();
        ctx.fill();
        return;
      }
      if (ch === '■' || ch === '▪' || ch === '▫') {
        ctx.fillRect(x + 4, y + 8, w - 8, h - 16);
        return;
      }
      if (ch === '•') {
        ctx.beginPath();
        ctx.arc(x + cx, y + cy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      // Generic fallback for any other Box Drawing character
      ctx.fillRect(x, ly, w, lw);
    }

    getPaletteColor(idx) {
      if (typeof idx === 'string' && idx.startsWith('#')) return idx;
      const vgaColors = [
        '#000000', '#0000AA', '#00AA00', '#00AAAA',
        '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
        '#555555', '#5555FF', '#55FF55', '#55FFFF',
        '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'
      ];
      return vgaColors[idx % 16] || '#AAAAAA';
    }
  }

  window.CyberBBS.Term = new BBSTerminal();
})();
