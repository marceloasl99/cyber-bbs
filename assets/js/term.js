/**
 * CYBER BBS — Virtual Terminal Engine & CP437 High-Resolution Renderer (Mega Edition v3.0 / Enhanced)
 * 1440x800 crisp IBM VGA buffer, dynamic glyph caching, dirty cell tracking,
 * multi-mode video profile architecture, single/multi-line in-terminal editors,
 * full ANSI CSI K/s/u/iCE support, mouse wheel scrolling, and live ARIA announcements.
 */
(function() {
  window.CyberBBS = window.CyberBBS || {};

  const PALETTES = {
    vga16: [
      '#000000', '#0000AA', '#00AA00', '#00AAAA',
      '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
      '#555555', '#5555FF', '#55FF55', '#55FFFF',
      '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'
    ],
    cga16_rgbi: [
      '#000000', '#0000AA', '#00AA00', '#00AAAA',
      '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
      '#555555', '#5555FF', '#55FF55', '#55FFFF',
      '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'
    ],
    mono_green: [
      '#051505', '#003300', '#005500', '#007700',
      '#004400', '#006600', '#008800', '#22CC22',
      '#114411', '#33DD33', '#44EE44', '#55FF55',
      '#33CC33', '#44DD44', '#66FF66', '#88FF88'
    ],
    mono_amber: [
      '#140C00', '#331A00', '#552C00', '#773D00',
      '#442200', '#663300', '#884400', '#CC8800',
      '#442800', '#DD9900', '#EEAA00', '#FFB800',
      '#CC8000', '#DDA000', '#FFCC33', '#FFE066'
    ],
    composite_ntsc: [
      '#000000', '#1E35A5', '#387B2E', '#4194A8',
      '#942C2B', '#8443B8', '#8B7020', '#A5A5A5',
      '#4F4F4F', '#5970DF', '#74AF64', '#80C2D6',
      '#C66564', '#BA7CD9', '#C5AE5C', '#FFFFFF'
    ],
    ega16: [
      '#000000', '#0000AA', '#00AA00', '#00AAAA',
      '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
      '#555555', '#5555FF', '#55FF55', '#55FFFF',
      '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'
    ],
    truecolor_oled: [
      '#08080A', '#1E40AF', '#15803D', '#0284C7',
      '#B91C1C', '#7E22CE', '#D97706', '#E2E8F0',
      '#64748B', '#3B82F6', '#22C55E', '#38BDF8',
      '#EF4444', '#A855F7', '#FBBF24', '#F8FAFC'
    ]
  };

  const VIDEO_PROFILES = {
    vga80x25: {
      id: 'vga80x25',
      name: 'IBM VGA (1987) · 80x25 Standard',
      cols: 80, rows: 25, cellW: 18, cellH: 32,
      fontFamily: '"Px437_IBM_VGA9", "Px437_IBM_VGA8", "Consolas", monospace',
      fontSize: 32,
      aspectRatio: '4 / 3',
      paletteType: 'vga16',
      crtDefault: true,
      scanlines: 'medium'
    },
    mda80x25: {
      id: 'mda80x25',
      name: 'IBM MDA (1981) · 80x25 Monochrome',
      cols: 80, rows: 25, cellW: 18, cellH: 32,
      fontFamily: '"Px437_IBM_VGA9", "Px437_IBM_VGA8", "Consolas", monospace',
      fontSize: 32,
      aspectRatio: '4 / 3',
      paletteType: 'mono_green',
      crtDefault: true,
      scanlines: 'fine'
    },
    cga40x25: {
      id: 'cga40x25',
      name: 'IBM CGA (1981) · 40x25 Big Type',
      cols: 40, rows: 25, cellW: 36, cellH: 32,
      fontFamily: '"Px437_IBM_VGA8", "Px437_IBM_VGA9", "Consolas", monospace',
      fontSize: 32,
      aspectRatio: '4 / 3',
      paletteType: 'cga16_rgbi',
      crtDefault: true,
      scanlines: 'coarse'
    },
    cga80x25: {
      id: 'cga80x25',
      name: 'IBM CGA (1981) · 80x25 PC XT Text',
      cols: 80, rows: 25, cellW: 18, cellH: 32,
      fontFamily: '"Px437_IBM_VGA8", "Px437_IBM_VGA9", "Consolas", monospace',
      fontSize: 30,
      aspectRatio: '4 / 3',
      paletteType: 'cga16_rgbi',
      crtDefault: true,
      scanlines: 'coarse'
    },
    cga_comp: {
      id: 'cga_comp',
      name: 'CGA Composite NTSC (1981) · 80x25 TV',
      cols: 80, rows: 25, cellW: 18, cellH: 32,
      fontFamily: '"Px437_IBM_VGA8", "Px437_IBM_VGA9", "Consolas", monospace',
      fontSize: 30,
      aspectRatio: '4 / 3',
      paletteType: 'composite_ntsc',
      crtDefault: true,
      scanlines: 'coarse'
    },
    ega80x43: {
      id: 'ega80x43',
      name: 'IBM EGA (1984) · 80x43 High Density',
      cols: 80, rows: 43, cellW: 18, cellH: 18,
      fontFamily: '"Px437_IBM_VGA8", "Px437_IBM_VGA9", "Consolas", monospace',
      fontSize: 18,
      aspectRatio: '4 / 3',
      paletteType: 'ega16',
      crtDefault: true,
      scanlines: 'fine'
    },
    vga80x50: {
      id: 'vga80x50',
      name: 'IBM VGA (1987) · 80x50 Compact Lines',
      cols: 80, rows: 50, cellW: 18, cellH: 16,
      fontFamily: '"Px437_IBM_VGA8", "Px437_IBM_VGA9", "Consolas", monospace',
      fontSize: 16,
      aspectRatio: '4 / 3',
      paletteType: 'vga16',
      crtDefault: true,
      scanlines: 'fine'
    },
    vga_13h: {
      id: 'vga_13h',
      name: 'VGA Mode 13h (1987) · 40x25 256-Color Canvas',
      cols: 40, rows: 25, cellW: 36, cellH: 32,
      fontFamily: '"Px437_IBM_VGA8", "Px437_IBM_VGA9", "Consolas", monospace',
      fontSize: 32,
      aspectRatio: '4 / 3',
      paletteType: 'vga16',
      crtDefault: true,
      scanlines: 'coarse'
    },
    svga132x37: {
      id: 'svga132x37',
      name: 'VESA SVGA (1991) · 132x37 Widescreen 16:9',
      cols: 132, rows: 37, cellW: 11, cellH: 21,
      fontFamily: '"Px437_IBM_VGA8", "Px437_IBM_VGA9", "Consolas", monospace',
      fontSize: 20,
      aspectRatio: '16 / 9',
      paletteType: 'vga16',
      crtDefault: true,
      scanlines: 'fine'
    },
    modern_hd: {
      id: 'modern_hd',
      name: 'Modern OLED (2026) · 120x36 Clean Truecolor',
      cols: 120, rows: 36, cellW: 12, cellH: 22,
      fontFamily: '"Px437_IBM_VGA8", "Px437_IBM_VGA9", "Consolas", monospace',
      fontSize: 22,
      aspectRatio: '16 / 9',
      paletteType: 'truecolor_oled',
      crtDefault: false,
      scanlines: 'none'
    }
  };

  window.CyberBBS.VIDEO_PROFILES = VIDEO_PROFILES;

  class BBSTerminal {
    constructor() {
      this.currentProfile = VIDEO_PROFILES.vga80x25;
      this.cols = this.currentProfile.cols;
      this.rows = this.currentProfile.rows;
      this.cellWidth = this.currentProfile.cellW;
      this.cellHeight = this.currentProfile.cellH;
      this.canvas = null;
      this.ctx = null;
      this.overlay = null;

      this.buffer = [];
      this.dirty = [];
      this.cursor = { col: 0, row: 0, visible: true };
      this.savedCursor = { col: 0, row: 0 };
      this.currentFg = 7;
      this.currentBg = 0;
      this.bold = false;
      this.reverse = false;
      this.iceColors = false;

      this.hitRegions = [];
      this.activeRegionIdx = -1;
      this.hoveredRegion = null;
      this.lastHighlightedRegion = null;

      this.outputQueue = [];
      this.isPacing = false;
      this.pacingRaf = null;

      this.activePrompt = null;
      this.activeMultiline = null;
      this.onWheelHandler = null;
      this.onCustomMouseDown = null;
      this.onCustomMouseMove = null;

      this.noticeText = '';
      this.noticeExpiry = 0;

      // Dynamic glyph sprite cache (Map of key `${ch}_${fg}` -> OffscreenCanvas)
      this.glyphCache = new Map();

      this.sessionTranscript = [
        '==============================================================================',
        '  CYBER BBS — SESSION TRANSCRIPT LOG (NODE 1 · 14.4k HST)',
        `  Started: ${new Date().toISOString()}`,
        '==============================================================================\n'
      ];

      this.scrollback = [];
      this.scrollbackOffset = 0;

      this.cursorBlink = true;
      setInterval(() => {
        this.cursorBlink = !this.cursorBlink;
        if (this.activePrompt) this.drawPromptBox();
        else if (this.activeMultiline) this.drawMultilineBox();
        else this.renderCursor();
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
      this.ctx.imageSmoothingEnabled = false;
      this.setupMouseEvents();

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          this.warmGlyphCache();
          this.redrawAll();
        });
      }
      this.redrawAll();
    }

    initBuffer() {
      this.buffer = [];
      this.dirty = [];
      for (let r = 0; r < this.rows; r++) {
        const row = [];
        const dRow = [];
        for (let c = 0; c < this.cols; c++) {
          row.push({ ch: ' ', fg: 7, bg: 0, bold: false, reverse: false });
          dRow.push(true);
        }
        this.buffer.push(row);
        this.dirty.push(dRow);
      }
    }

    markCellDirty(col, row) {
      if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
        if (this.dirty[row]) this.dirty[row][col] = true;
      }
    }

    /**
     * Pre-render common ASCII glyphs into offscreen sprites once fonts are loaded
     */
    warmGlyphCache() {
      this.glyphCache.clear();
      const commonFgs = [7, 10, 11, 14, 15, 0, 1, 2, 3, 4, 5, 6, 8, 9, 12, 13];
      // Pre-render printable ASCII
      for (let code = 32; code <= 126; code++) {
        const ch = String.fromCharCode(code);
        for (const fg of commonFgs) {
          this.getGlyphSprite(ch, fg);
        }
      }
    }

    /**
     * Retrieves or renders a glyph sprite into an isolated offscreen canvas
     */
    getGlyphSprite(ch, fg) {
      const key = `${ch}_${fg}`;
      let sprite = this.glyphCache.get(key);
      if (sprite) return sprite;

      // Create new sprite canvas
      sprite = document.createElement('canvas');
      sprite.width = this.cellWidth;
      sprite.height = this.cellHeight;
      const sCtx = sprite.getContext('2d', { alpha: true });
      sCtx.imageSmoothingEnabled = false;

      sCtx.fillStyle = this.getPaletteColor(fg);
      sCtx.font = `${this.currentProfile.fontSize}px ${this.currentProfile.fontFamily}`;
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillText(ch, this.cellWidth / 2, this.cellHeight / 2);

      this.glyphCache.set(key, sprite);
      return sprite;
    }

    setVideoProfile(profileId, triggerFx = true) {
      const profile = VIDEO_PROFILES[profileId];
      if (!profile) return false;
      this.currentProfile = profile;
      this.cols = profile.cols;
      this.rows = profile.rows;
      this.cellWidth = profile.cellW;
      this.cellHeight = profile.cellH;

      if (this.canvas) {
        this.canvas.width = this.cols * this.cellWidth;
        this.canvas.height = this.rows * this.cellHeight;
        if (this.ctx) this.ctx.imageSmoothingEnabled = false;
      }

      // Update monitor housing aspect ratio
      const housing = document.getElementById('monitor-housing');
      if (housing) {
        if (profile.aspectRatio === '16 / 9') {
          housing.classList.remove('aspect-4-3');
          housing.classList.add('aspect-16-9');
        } else {
          housing.classList.remove('aspect-16-9');
          housing.classList.add('aspect-4-3');
        }
      }

      // Update bezel controls if present
      const btnMode = document.getElementById('btn-mode');
      if (btnMode) {
        const shortName = profile.name.split('·')[0].trim();
        btnMode.innerHTML = `📼 ${shortName}`;
      }
      const btnAspect = document.getElementById('btn-aspect');
      if (btnAspect) {
        btnAspect.innerHTML = profile.aspectRatio === '16 / 9' ? '📐 16:9' : '📐 4:3';
      }

      this.glyphCache.clear();
      this.initBuffer();
      this.warmGlyphCache();
      this.clear();

      if (triggerFx) {
        this.triggerDegauss();
        this.showNotice(`VIDEO ADAPTER: ${profile.name.toUpperCase()}`);
      }

      if (window.CyberBBS.Store && typeof window.CyberBBS.Store.saveVideoProfile === 'function') {
        window.CyberBBS.Store.saveVideoProfile(profileId);
      }
      return true;
    }

    triggerDegauss() {
      if (window.CyberBBS.Audio && typeof window.CyberBBS.Audio.playDegauss === 'function') {
        window.CyberBBS.Audio.playDegauss();
      }
      const housing = document.getElementById('monitor-housing') || document.getElementById('crt-frame');
      if (housing) {
        housing.classList.add('degauss-active');
        setTimeout(() => housing.classList.remove('degauss-active'), 450);
      }
    }

    cycleVideoProfile() {
      const keys = Object.keys(VIDEO_PROFILES);
      const curIdx = keys.indexOf(this.currentProfile.id);
      const nextIdx = (curIdx + 1) % keys.length;
      return this.setVideoProfile(keys[nextIdx], true);
    }

    exportScreenGrab(format = 'both') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      if ((format === 'ansi' || format === 'both') && window.CyberBBS.Ansi) {
        const ansiText = window.CyberBBS.Ansi.bufferToAnsi(this.buffer, this.cols, this.rows);
        const blob = window.CyberBBS.Ansi.createAnsiBlob(ansiText, `CYBER BBS ${this.currentProfile.id.toUpperCase()}`, 'SYSOP');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `CYBER_BBS_${timestamp}.ANS`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      if ((format === 'png' || format === 'both') && this.canvas) {
        this.canvas.toBlob(blob => {
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `CYBER_BBS_${timestamp}.PNG`;
          a.click();
          URL.revokeObjectURL(a.href);
        });
      }
      this.showNotice('SCREEN GRAB EXPORTED (ANS + PNG)!');
    }

    clear() {
      this.initBuffer();
      this.cursor.col = 0;
      this.cursor.row = 0;
      this.clearHitRegions();
      this.redrawAll();
    }

    logCommand(cmd) {
      const time = new Date().toTimeString().substring(0, 8);
      this.sessionTranscript.push(`[${time}] ${cmd}`);
    }

    exportSessionLog() {
      const text = this.sessionTranscript.join('\r\n');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `CYBER_BBS_SESSION_${new Date().toISOString().substring(0, 10)}.TXT`;
      a.click();
      URL.revokeObjectURL(a.href);
      this.showNotice('SESSION TRANSCRIPT EXPORTED AS TXT FILE!');
    }

    announceLive(msg) {
      const el = document.getElementById('bbs-live-region');
      if (el && msg) el.textContent = msg;
    }

    setCursor(col, row) {
      this.cursor.col = Math.max(0, Math.min(this.cols - 1, col));
      this.cursor.row = Math.max(0, Math.min(this.rows - 1, row));
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
      if (this.lastHighlightedRegion) {
        this.clearRegionHighlight(this.lastHighlightedRegion);
        this.lastHighlightedRegion = null;
      }
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
      if (this.lastHighlightedRegion && this.lastHighlightedRegion !== region) {
        this.clearRegionHighlight(this.lastHighlightedRegion);
      }
      this.lastHighlightedRegion = region;
      if (!region) return;

      const x = region.col * this.cellWidth, y = region.row * this.cellHeight;
      const w = region.width * this.cellWidth, h = region.height * this.cellHeight;
      this.ctx.strokeStyle = '#FFFF55';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      if (region.col > 0) {
        this.drawBoxGlyph('►', (region.col - 1) * this.cellWidth, y, this.cellWidth, this.cellHeight, '#FFFF55');
      }
    }

    clearRegionHighlight(region) {
      if (!region) return;
      // Redraw only the cells covered by the region outline
      const startCol = Math.max(0, region.col - 1);
      const endCol = Math.min(this.cols - 1, region.col + region.width);
      const startRow = Math.max(0, region.row);
      const endRow = Math.min(this.rows - 1, region.row + region.height - 1);

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          this.drawCell(c, r);
        }
      }
    }

    setupMouseEvents() {
      if (!this.overlay) return;
      const getColRow = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width, scaleY = this.canvas.height / rect.height;
        const col = Math.max(0, Math.min(this.cols - 1, Math.floor(((e.clientX - rect.left) * scaleX) / this.cellWidth)));
        const row = Math.max(0, Math.min(this.rows - 1, Math.floor(((e.clientY - rect.top) * scaleY) / this.cellHeight)));
        return { col, row };
      };

      this.overlay.addEventListener('mousemove', (e) => {
        if (this.activePrompt || this.activeMultiline) return;
        const { col, row } = getColRow(e);
        if (typeof this.onCustomMouseMove === 'function' && e.buttons === 1) {
          this.onCustomMouseMove(col, row);
          return;
        }
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
            if (this.lastHighlightedRegion) {
              this.clearRegionHighlight(this.lastHighlightedRegion);
              this.lastHighlightedRegion = null;
            }
          }
        }
      });

      this.overlay.addEventListener('mousedown', (e) => {
        if (this.activePrompt || this.activeMultiline) return;
        const { col, row } = getColRow(e);
        if (typeof this.onCustomMouseDown === 'function') {
          this.onCustomMouseDown(col, row, e);
        }
      });

      this.overlay.addEventListener('click', (e) => {
        if (this.isPacing) { this.skipPacing(); return; }
        if (this.activePrompt || this.activeMultiline) return;
        const { col, row } = getColRow(e);
        for (const r of this.hitRegions) {
          if (col >= r.col && col < r.col + r.width && row >= r.row && row < r.row + r.height) {
            if (window.CyberBBS.Audio) window.CyberBBS.Audio.playKeyClick();
            if (typeof r.action === 'function') r.action();
            break;
          }
        }
      });

      this.overlay.addEventListener('wheel', (e) => {
        if (this.activePrompt || this.activeMultiline) return;
        if (typeof this.onWheelHandler === 'function') {
          e.preventDefault();
          this.onWheelHandler(e.deltaY > 0 ? 1 : -1);
        } else {
          e.preventDefault();
          this.scrollBack(e.deltaY > 0 ? -3 : 3);
        }
      }, { passive: false });
    }

    putChar(ch, fg, bg) {
      if (this.scrollbackOffset > 0) this.scrollbackOffset = 0;
      if (this.cursor.col >= this.cols) { this.cursor.col = 0; this.cursor.row++; }
      if (this.cursor.row >= this.rows - 1) { this.scrollUp(); this.cursor.row = this.rows - 2; }
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
      if (this.buffer[0]) {
        this.scrollback.push(this.buffer[0].map(c => ({...c})));
        if (this.scrollback.length > 500) this.scrollback.shift();
      }
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

    scrollBack(lines) {
      if (!this.scrollback || this.scrollback.length === 0) return;
      const maxOffset = Math.min(500, this.scrollback.length);
      const prev = this.scrollbackOffset;
      this.scrollbackOffset = Math.max(0, Math.min(maxOffset, this.scrollbackOffset + lines));
      if (this.scrollbackOffset !== prev) {
        this.redrawAll();
      }
    }

    resetScrollback() {
      if (this.scrollbackOffset > 0) {
        this.scrollbackOffset = 0;
        this.redrawAll();
      }
    }

    print(text, fg, bg) {
      if (fg !== undefined) this.currentFg = fg;
      if (bg !== undefined) this.currentBg = bg;
      let i = 0;
      while (i < text.length) {
        const char = text[i];
        if (char === '\x1b' && text[i + 1] === '[') {
          let j = i + 2;
          // Support standard CSI parameters including '?' private prefix (e.g. \x1b[?33h)
          while (j < text.length && !/[a-zA-Z]/.test(text[j])) j++;
          if (j < text.length) {
            this.handleAnsi(text.substring(i + 2, j), text[j]);
            i = j + 1;
            continue;
          }
        }
        if (char === '\r') this.cursor.col = 0;
        else if (char === '\n') {
          this.cursor.col = 0;
          this.cursor.row++;
          if (this.cursor.row >= this.rows - 1) { this.scrollUp(); this.cursor.row = this.rows - 2; }
        } else if (char === '\t') this.cursor.col = (Math.floor(this.cursor.col / 8) + 1) * 8;
        else if (char === '\b') { if (this.cursor.col > 0) this.cursor.col--; }
        else this.putChar(char, this.currentFg, this.currentBg);
        i++;
      }
    }

    println(text, fg, bg) { this.print(text + '\r\n', fg, bg); }

    handleAnsi(paramsStr, cmd) {
      // 1. Private mode toggles: CSI ?33h (iCE colors ON) / CSI ?33l (OFF)
      if (paramsStr.startsWith('?')) {
        const pNum = parseInt(paramsStr.substring(1), 10);
        if (pNum === 33) {
          this.iceColors = (cmd === 'h');
        }
        return;
      }

      const params = paramsStr.split(';').map(n => parseInt(n, 10) || 0);

      // SGR: Set Graphics Rendition
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
          else if (p === 5) {
            // Blink bit: If iCE colors enabled, acts as high-intensity background trigger
            if (this.iceColors && this.currentBg < 8) this.currentBg += 8;
          }
          else if (p === 7) this.reverse = true;
          else if (p >= 30 && p <= 37) this.currentFg = (this.bold ? p - 30 + 8 : p - 30);
          else if (p >= 40 && p <= 47) this.currentBg = p - 40;
          else if (p >= 90 && p <= 97) this.currentFg = p - 90 + 8;
          else if (p >= 100 && p <= 107) this.currentBg = p - 100 + 8;
        }
      }
      // Cursor Position
      else if (cmd === 'H' || cmd === 'f') {
        this.setCursor((params[1] || 1) - 1, (params[0] || 1) - 1);
      }
      // Clear Screen (ED)
      else if (cmd === 'J') {
        if (params[0] === 2 || params[0] === 3) this.clear();
      }
      // Erase in Line (EL): 0 = to end of line, 1 = from start, 2 = whole line
      else if (cmd === 'K') {
        const mode = params[0] || 0;
        let start = 0, end = this.cols;
        if (mode === 0) { start = this.cursor.col; end = this.cols; }
        else if (mode === 1) { start = 0; end = this.cursor.col + 1; }
        else if (mode === 2) { start = 0; end = this.cols; }

        for (let c = start; c < end && c < this.cols; c++) {
          this.buffer[this.cursor.row][c] = { ch: ' ', fg: 7, bg: 0, bold: false, reverse: false };
        }
        this.redrawRow(this.cursor.row);
      }
      // Save cursor position (ANSI.SYS CSI s)
      else if (cmd === 's') {
        this.savedCursor = { col: this.cursor.col, row: this.cursor.row };
      }
      // Restore cursor position (ANSI.SYS CSI u)
      else if (cmd === 'u') {
        this.setCursor(this.savedCursor.col, this.savedCursor.row);
      }
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
      this.announceLive(text);
      this.renderStatusBar();
    }

    renderStatusBar() {
      this.hitRegions = this.hitRegions.filter(r => !['btn-fs', 'btn-mute', 'btn-back'].includes(r.id));
      const store = window.CyberBBS.Store;
      const user = store ? store.currentUser : null;
      const handle = user ? user.handle : 'GUEST';
      const timeLeft = store ? store.getTimeRemainingFormatted() : '45:00';
      const credits = user ? user.credits : 500;
      const unread = store ? store.getUnreadMailCount() : 0;
      const nodeId = store ? store.currentNodeId : 1;

      let text = '';
      const statusRow = this.rows - 1;
      const maxCols = this.cols;

      if (this.noticeText && Date.now() < this.noticeExpiry) {
        text = ` ${this.noticeText.padEnd(maxCols - 2, ' ')} `;
      } else {
        const mailTag = unread > 0 ? ` · MAIL:${unread}*` : '';
        const left = ` N${nodeId} · ${handle} · T:${timeLeft} · CR:${credits}${mailTag}`;
        const right = `[F11:FULL] [M:MUTE] [ESC:BACK] `;
        text = (left.padEnd(maxCols - 1 - right.length, ' ') + right).substring(0, maxCols);
      }

      for (let c = 0; c < maxCols; c++) {
        this.buffer[statusRow][c] = { ch: text[c] || ' ', fg: 0, bg: 3, bold: true, reverse: false };
        this.drawCell(c, statusRow);
      }

      this.addHitRegion(maxCols - 30, statusRow, 10, 1, 'btn-fs', () => window.CyberBBS.App.toggleFullscreen(), 'Fullscreen');
      this.addHitRegion(maxCols - 19, statusRow, 8, 1, 'btn-mute', () => window.CyberBBS.App.toggleMute(), 'Mute');
      this.addHitRegion(maxCols - 10, statusRow, 9, 1, 'btn-back', () => window.CyberBBS.App.goBack(), 'Back');
    }

    drawCell(col, row, customCell = null) {
      if (!this.ctx || row >= this.rows || col >= this.cols) return;
      const cell = customCell || (this.buffer[row] ? this.buffer[row][col] : null);
      if (!cell) return;
      const x = col * this.cellWidth, y = row * this.cellHeight, w = this.cellWidth, h = this.cellHeight;

      // 1. Background Fill
      this.ctx.fillStyle = this.getPaletteColor(cell.bg);
      this.ctx.fillRect(x, y, w, h);
      if (!cell.ch || cell.ch === ' ') return;

      const fgColor = this.getPaletteColor(cell.fg);

      // 2. Procedural Box and Block Drawing Characters (100% gapless)
      if (this.isBoxOrBlockChar(cell.ch)) {
        this.drawBoxGlyph(cell.ch, x, y, w, h, fgColor);
        return;
      }

      // 3. Fast hardware-accelerated drawImage via dynamic glyph sprite cache
      const sprite = this.getGlyphSprite(cell.ch, cell.fg);
      if (sprite) {
        this.ctx.drawImage(sprite, x, y);
      } else {
        this.ctx.fillStyle = fgColor;
        this.ctx.font = `${this.currentProfile.fontSize}px ${this.currentProfile.fontFamily}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(cell.ch, x + w / 2, y + h / 2);
      }
    }

    renderCursor() {
      if (!this.ctx || !this.cursor.visible || this.scrollbackOffset > 0) return;
      const x = this.cursor.col * this.cellWidth, y = this.cursor.row * this.cellHeight;
      if (this.cursorBlink) {
        this.ctx.fillStyle = this.getPaletteColor(14);
        this.ctx.fillRect(x, y + this.cellHeight - 6, this.cellWidth, 4);
      } else {
        this.drawCell(this.cursor.col, this.cursor.row);
      }
    }

    redrawRow(row) {
      if (row < 0 || row >= this.rows) return;
      for (let c = 0; c < this.cols; c++) this.drawCell(c, row);
    }

    redrawAll() {
      if (!this.ctx) return;
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      if (this.scrollbackOffset > 0 && this.scrollback && this.scrollback.length > 0) {
        const combined = this.scrollback.concat(this.buffer.slice(0, this.rows - 1));
        const viewRows = this.rows - 1;
        const startIdx = Math.max(0, combined.length - viewRows - this.scrollbackOffset);
        for (let r = 0; r < viewRows; r++) {
          const rowData = combined[startIdx + r];
          if (rowData) {
            for (let c = 0; c < this.cols; c++) {
              const cell = rowData[c] || { ch: ' ', fg: 7, bg: 0 };
              this.drawCell(c, r, cell);
            }
          }
        }
        // Draw scrollback notice on status row
        const scrollNotice = ` ▲ SCROLLBACK: -${this.scrollbackOffset}/${this.scrollback.length} LINES · [PgUp/PgDn/Wheel] · [ESC/Any Key] Return ▲ `;
        for (let c = 0; c < this.cols; c++) {
          this.drawCell(c, this.rows - 1, { ch: scrollNotice[c] || ' ', fg: 0, bg: 6 });
        }
        return;
      }

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) this.drawCell(c, r);
      }
      if (this.activePrompt) this.drawPromptBox();
      else if (this.activeMultiline) this.drawMultilineBox();
      else this.renderCursor();
    }

    promptInline(title, promptLabel, defaultVal, onSubmit, onCancel) {
      this.activePrompt = { title, label: promptLabel, value: String(defaultVal || ''), maxLen: 32, onSubmit, onCancel };
      this.drawPromptBox();
    }

    drawPromptBox() {
      if (!this.ctx || !this.activePrompt) return;
      const p = this.activePrompt;
      const boxW = Math.min(this.canvas.width - 40, 60 * this.cellWidth);
      const boxH = 6 * this.cellHeight;
      const px = Math.floor((this.canvas.width - boxW) / 2);
      const py = Math.floor((this.canvas.height - boxH) / 2);

      this.ctx.fillStyle = '#000088';
      this.ctx.fillRect(px, py, boxW, boxH);
      this.ctx.strokeStyle = '#55FFFF';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(px + 1.5, py + 1.5, boxW - 3, boxH - 3);

      this.ctx.font = '26px "Px437_IBM_VGA9", "Px437_IBM_VGA8", "Consolas", monospace';
      this.ctx.textBaseline = 'top';
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = '#55FFFF';
      this.ctx.fillText(`──[ ${p.title.toUpperCase()} ]──`, px + 20, py + 12);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillText(p.label, px + 20, py + 50);

      const inputX = px + 20, inputY = py + 90, inputW = boxW - 40, inputH = 44;
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(inputX, inputY, inputW, inputH);
      this.ctx.strokeStyle = '#FFFF55';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(inputX, inputY, inputW, inputH);

      this.ctx.fillStyle = '#FFFF55';
      this.ctx.fillText(p.value, inputX + 12, inputY + 8);
      if (this.cursorBlink) {
        const textWidth = this.ctx.measureText(p.value).width;
        this.ctx.fillStyle = '#FFFF55';
        this.ctx.fillRect(inputX + 14 + textWidth, inputY + 8, 14, 28);
      }
      this.ctx.fillStyle = '#AAAAAA';
      this.ctx.font = '20px "Px437_IBM_VGA9", "Px437_IBM_VGA8", "Consolas", monospace';
      this.ctx.fillText('[ENTER] Submit   [ESC] Cancel   [CTRL+V] Paste', px + 20, py + boxH - 32);
    }

    handlePromptKey(e) {
      if (!this.activePrompt) return false;
      const p = this.activePrompt;
      if (e.key === 'Enter') {
        const val = p.value.trim();
        this.logCommand(`[PROMPT INPUT: ${p.title}] -> "${val}"`);
        const cb = p.onSubmit;
        this.activePrompt = null;
        this.redrawAll();
        if (typeof cb === 'function') cb(val);
        return true;
      }
      if (e.key === 'Escape') {
        const cb = p.onCancel;
        this.activePrompt = null;
        this.redrawAll();
        if (typeof cb === 'function') cb();
        return true;
      }
      if (e.key === 'Backspace') {
        p.value = p.value.slice(0, -1);
        this.drawPromptBox();
        if (window.CyberBBS.Audio) window.CyberBBS.Audio.playKeyClick();
        return true;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        navigator.clipboard?.readText().then(txt => {
          if (txt) {
            p.value = (p.value + txt.replace(/[\r\n]+/g, ' ')).substring(0, p.maxLen);
            this.drawPromptBox();
          }
        }).catch(() => {});
        return true;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && p.value.length < p.maxLen) {
        p.value += e.key;
        this.drawPromptBox();
        if (window.CyberBBS.Audio) window.CyberBBS.Audio.playKeyClick();
      }
      return true;
    }

    promptMultiline(title, subtitle, onSubmit, onCancel) {
      this.activeMultiline = { title, subtitle, lines: [''], curLine: 0, maxLines: 8, maxCols: 64, onSubmit, onCancel };
      this.drawMultilineBox();
    }

    drawMultilineBox() {
      if (!this.ctx || !this.activeMultiline) return;
      const m = this.activeMultiline;
      const px = 4 * this.cellWidth, py = 5 * this.cellHeight, pw = 72 * this.cellWidth, ph = 14 * this.cellHeight;
      this.ctx.fillStyle = '#000088';
      this.ctx.fillRect(px, py, pw, ph);
      this.ctx.strokeStyle = '#55FFFF';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(px + 1.5, py + 1.5, pw - 3, ph - 3);
      this.ctx.font = '26px "Px437_IBM_VGA9", "Px437_IBM_VGA8", "Consolas", monospace';
      this.ctx.textBaseline = 'top';
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = '#55FFFF';
      this.ctx.fillText(`──[ ${m.title.toUpperCase()} ]──`, px + 20, py + 12);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '22px "Px437_IBM_VGA9", "Px437_IBM_VGA8", "Consolas", monospace';
      this.ctx.fillText(m.subtitle, px + 20, py + 44);

      const editorX = px + 20, editorY = py + 76, editorW = pw - 40, editorH = 280;
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(editorX, editorY, editorW, editorH);
      this.ctx.strokeStyle = '#FFFF55';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(editorX, editorY, editorW, editorH);

      this.ctx.font = '26px "Px437_IBM_VGA9", "Px437_IBM_VGA8", "Consolas", monospace';
      for (let i = 0; i < m.maxLines; i++) {
        const lineText = m.lines[i] !== undefined ? m.lines[i] : '';
        const rowY = editorY + 10 + i * 32;
        this.ctx.fillStyle = i === m.curLine ? '#55FF55' : '#555555';
        this.ctx.fillText(`${i + 1}:`, editorX + 8, rowY);
        this.ctx.fillStyle = '#FFFF55';
        this.ctx.fillText(lineText, editorX + 44, rowY);
        if (i === m.curLine && this.cursorBlink) {
          const w = this.ctx.measureText(lineText).width;
          this.ctx.fillStyle = '#FFFF55';
          this.ctx.fillRect(editorX + 46 + w, rowY + 2, 12, 24);
        }
      }
      this.ctx.fillStyle = '#AAAAAA';
      this.ctx.font = '20px "Px437_IBM_VGA9", "Px437_IBM_VGA8", "Consolas", monospace';
      this.ctx.fillText('[CTRL+S / F2] Post Message   [ENTER] New Line   [ESC] Cancel', px + 20, py + ph - 38);
    }

    handleMultilineKey(e) {
      if (!this.activeMultiline) return false;
      const m = this.activeMultiline;
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') || e.key === 'F2') {
        e.preventDefault();
        const fullText = m.lines.join('\r\n').trim();
        this.logCommand(`[MULTI-LINE POST]`);
        const cb = m.onSubmit;
        this.activeMultiline = null;
        this.redrawAll();
        if (typeof cb === 'function') cb(fullText);
        return true;
      }
      if (e.key === 'Escape') {
        const cb = m.onCancel;
        this.activeMultiline = null;
        this.redrawAll();
        if (typeof cb === 'function') cb();
        return true;
      }
      if (e.key === 'ArrowUp') { m.curLine = Math.max(0, m.curLine - 1); this.drawMultilineBox(); return true; }
      if (e.key === 'ArrowDown') { if (m.curLine + 1 < m.lines.length) m.curLine++; this.drawMultilineBox(); return true; }
      if (e.key === 'Enter') {
        if (m.lines.length < m.maxLines) { m.lines.splice(m.curLine + 1, 0, ''); m.curLine++; this.drawMultilineBox(); }
        return true;
      }
      if (e.key === 'Backspace') {
        const cur = m.lines[m.curLine] || '';
        if (cur.length > 0) m.lines[m.curLine] = cur.slice(0, -1);
        else if (m.curLine > 0) { m.lines.splice(m.curLine, 1); m.curLine--; }
        this.drawMultilineBox();
        return true;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
        const cur = m.lines[m.curLine] || '';
        if (cur.length < m.maxCols) m.lines[m.curLine] = cur + e.key;
        else if (m.lines.length < m.maxLines) { m.lines.splice(m.curLine + 1, 0, e.key); m.curLine++; }
        this.drawMultilineBox();
      }
      return true;
    }

    isBoxOrBlockChar(ch) {
      if (!ch || ch.length !== 1) return false;
      const code = ch.charCodeAt(0);
      return (code >= 0x2500 && code <= 0x259F) || '►◄▲▼■•▪▫'.includes(ch);
    }

    drawBoxGlyph(ch, x, y, w, h, color) {
      const ctx = this.ctx;
      ctx.fillStyle = color;
      const cx = Math.floor(w / 2), cy = Math.floor(h / 2), lw = 2;
      const lx = x + cx - 1, ly = y + cy - 1;

      if (ch === '█') { ctx.fillRect(x, y, w, h); return; }
      if (ch === '▀') { ctx.fillRect(x, y, w, cy); return; }
      if (ch === '▄') { ctx.fillRect(x, y + cy, w, h - cy); return; }
      if (ch === '▌') { ctx.fillRect(x, y, cx, h); return; }
      if (ch === '▐') { ctx.fillRect(x + cx, y, w - cx, h); return; }
      if (ch === '░' || ch === '▒' || ch === '▓') {
        for (let py = 0; py < h; py += 2) {
          for (let px = 0; px < w; px += 2) {
            const p = ((px + py) / 2) % 2 === 0;
            if ((ch === '▒' && p) || (ch === '░' && px % 4 === 0 && py % 4 === 0) || (ch === '▓' && (p || px % 4 === 0))) {
              ctx.fillRect(x + px, y + py, 2, 2);
            }
          }
        }
        return;
      }
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

      const y1 = ly - 3, y2 = ly + 3, x1 = lx - 3, x2 = lx + 3;
      if (ch === '═') { ctx.fillRect(x, y1, w, lw); ctx.fillRect(x, y2, w, lw); return; }
      if (ch === '║') { ctx.fillRect(x1, y, lw, h); ctx.fillRect(x2, y, lw, h); return; }
      if (ch === '╔') { ctx.fillRect(x1, y1, w - (cx - 3), lw); ctx.fillRect(x2, y2, w - (cx + 3), lw); ctx.fillRect(x1, y1, lw, h - (cy - 3)); ctx.fillRect(x2, y2, lw, h - (cy + 3)); return; }
      if (ch === '╗') { ctx.fillRect(x, y1, cx + 3, lw); ctx.fillRect(x, y2, cx - 1, lw); ctx.fillRect(x2, y1, lw, h - (cy - 3)); ctx.fillRect(x1, y2, lw, h - (cy + 3)); return; }
      if (ch === '╚') { ctx.fillRect(x1, y, lw, cy + 5); ctx.fillRect(x2, y, lw, cy - 1); ctx.fillRect(x1, y2, w - (cx - 3), lw); ctx.fillRect(x2, y1, w - (cx + 3), lw); return; }
      if (ch === '╝') { ctx.fillRect(x1, y, lw, cy - 1); ctx.fillRect(x2, y, lw, cy + 5); ctx.fillRect(x, y1, cx - 1, lw); ctx.fillRect(x, y2, cx + 5, lw); return; }
      if (ch === '╠') { ctx.fillRect(x1, y, lw, h); ctx.fillRect(x2, y, lw, cy - 1); ctx.fillRect(x2, y + cy + 5, lw, h - (cy + 5)); ctx.fillRect(x2, y1, w - (cx + 3), lw); ctx.fillRect(x2, y2, w - (cx + 3), lw); return; }
      if (ch === '╣') { ctx.fillRect(x2, y, lw, h); ctx.fillRect(x1, y, lw, cy - 1); ctx.fillRect(x1, y + cy + 5, lw, h - (cy + 5)); ctx.fillRect(x, y1, cx - 1, lw); ctx.fillRect(x, y2, cx - 1, lw); return; }
      if (ch === '╦') { ctx.fillRect(x, y1, w, lw); ctx.fillRect(x, y2, cx - 1, lw); ctx.fillRect(x + cx + 5, y2, w - (cx + 5), lw); ctx.fillRect(x1, y2, lw, h - (cy + 3)); ctx.fillRect(x2, y2, lw, h - (cy + 3)); return; }
      if (ch === '╩') { ctx.fillRect(x, y2, w, lw); ctx.fillRect(x, y1, cx - 1, lw); ctx.fillRect(x + cx + 5, y1, w - (cx + 5), lw); ctx.fillRect(x1, y, lw, cy - 1); ctx.fillRect(x2, y, lw, cy - 1); return; }
      if (ch === '╬') { ctx.fillRect(x, y1, cx - 1, lw); ctx.fillRect(x + cx + 5, y1, w - (cx + 5), lw); ctx.fillRect(x, y2, cx - 1, lw); ctx.fillRect(x + cx + 5, y2, w - (cx + 5), lw); ctx.fillRect(x1, y, lw, cy - 1); ctx.fillRect(x1, y + cy + 5, lw, h - (cy + 5)); ctx.fillRect(x2, y, lw, cy - 1); ctx.fillRect(x2, y + cy + 5, lw, h - (cy + 5)); return; }
      if (ch === '►') { ctx.beginPath(); ctx.moveTo(x + 4, y + 6); ctx.lineTo(x + w - 4, y + cy); ctx.lineTo(x + 4, y + h - 6); ctx.closePath(); ctx.fill(); return; }
      if (ch === '◄') { ctx.beginPath(); ctx.moveTo(x + w - 4, y + 6); ctx.lineTo(x + 4, y + cy); ctx.lineTo(x + w - 4, y + h - 6); ctx.closePath(); ctx.fill(); return; }
      if (ch === '▲') { ctx.beginPath(); ctx.moveTo(x + cx, y + 6); ctx.lineTo(x + w - 4, y + h - 6); ctx.lineTo(x + 4, y + h - 6); ctx.closePath(); ctx.fill(); return; }
      if (ch === '▼') { ctx.beginPath(); ctx.moveTo(x + 4, y + 6); ctx.lineTo(x + w - 4, y + 6); ctx.lineTo(x + cx, y + h - 6); ctx.closePath(); ctx.fill(); return; }
      if (ch === '■' || ch === '▪' || ch === '▫') { ctx.fillRect(x + 4, y + 8, w - 8, h - 16); return; }
      if (ch === '•') { ctx.beginPath(); ctx.arc(x + cx, y + cy, 3.5, 0, Math.PI * 2); ctx.fill(); return; }
      ctx.fillRect(x, ly, w, lw);
    }

    getPaletteColor(idx) {
      if (typeof idx === 'string' && idx.startsWith('#')) return idx;
      const palette = PALETTES[this.currentProfile?.paletteType] || PALETTES.vga16;
      return palette[idx % 16] || '#AAAAAA';
    }
  }

  window.CyberBBS.Term = new BBSTerminal();
})();
