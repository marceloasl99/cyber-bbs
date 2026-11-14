/**
 * CYBER BBS — Master Application Controller & Navigation Stack
 * Handles 100% In-Terminal Typing (Zero Pop-ups), Reliable ESC Back Navigation,
 * Numeric Quick-Jump, Arrow Pre-Selection, and Full HD Screen Presentation.
 */
(function() {
  window.CyberBBS = window.CyberBBS || {};

  class BBSApp {
    constructor() {
      this.state = 'BOOT';
      this.history = []; // Navigation stack for reliable ESC back navigation
      this.currentRenderFn = null;

      this.themes = ['theme-vga', 'theme-green', 'theme-amber', 'theme-paper', 'theme-flat'];
      this.currentThemeIdx = 0;
      this.crtEnabled = true;
      this.aspect169 = false;

      this.numKeyBuffer = '';
      this.numKeyTimer = null;
    }

    init() {
      window.CyberBBS.Term.init('term-canvas', 'mouse-overlay');
      this.setupKeyboard();
      this.setupBezelButtons();
      this.setupFileUpload();

      // Start Boot Sequence
      this.bootSequence();
    }

    pushScreen(screenName, renderFn) {
      if (this.currentRenderFn && this.state !== 'BOOT') {
        this.history.push({ state: this.state, render: this.currentRenderFn });
      }
      this.state = screenName;
      this.currentRenderFn = renderFn;
      renderFn();
    }

    goBack() {
      // 1. If in-terminal input prompt is active, cancel it
      const term = window.CyberBBS.Term;
      if (term && term.activePrompt) {
        const cancelCb = term.activePrompt.onCancel;
        term.activePrompt = null;
        term.redrawAll();
        if (typeof cancelCb === 'function') cancelCb();
        return;
      }

      // 2. Stop any active timers (e.g. World Clocks)
      if (window.CyberBBS.Doors && window.CyberBBS.Doors.stopActiveTimer) {
        window.CyberBBS.Doors.stopActiveTimer();
      }

      // 3. Pop from navigation history
      if (this.history.length > 0) {
        const prev = this.history.pop();
        this.state = prev.state;
        this.currentRenderFn = prev.render;
        if (typeof prev.render === 'function') {
          prev.render();
          return;
        }
      }

      // 4. Fallback to Main Menu if not already there
      if (this.state !== 'MAIN' && this.state !== 'BOOT') {
        this.showMainMenu();
      }
    }

    setupKeyboard() {
      window.addEventListener('keydown', (e) => {
        const term = window.CyberBBS.Term;

        // If in-terminal prompt is active, route all input directly to it!
        if (term && term.activePrompt) {
          e.preventDefault();
          term.handlePromptKey(e);
          return;
        }

        // Fullscreen hotkey: F11 or Alt+Enter
        if (e.key === 'F11' || (e.altKey && e.key === 'Enter')) {
          e.preventDefault();
          this.toggleFullscreen();
          return;
        }

        // ESC hotkey: ALWAYS GO BACK RELIABLY!
        if (e.key === 'Escape') {
          e.preventDefault();
          if (this.state === 'HANDSHAKE') {
            window.CyberBBS.Audio.skipHandshake(() => this.showBanner());
          } else {
            this.goBack();
          }
          return;
        }

        // Mechanical key click sound
        if (!e.ctrlKey && !e.altKey && e.key.length === 1) {
          if (window.CyberBBS.Audio) window.CyberBBS.Audio.playKeyClick();
        }

        // 1. Direct Numeric Quick-Jump
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          this.handleNumericInput(e.key);
          return;
        }

        // 2. Arrow Key Pre-Selection
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'Tab') {
          e.preventDefault();
          term.selectNextRegion(true);
          return;
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          term.selectNextRegion(false);
          return;
        }

        // 3. Enter Key Activates Pre-Selected Option
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (this.state === 'READY_TO_DIAL') {
            this.startDialing();
          } else if (term.activeRegionIdx >= 0) {
            term.activateCurrentRegion();
          }
          return;
        }

        // 4. Letter hotkeys
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
          const k = e.key.toUpperCase();
          if (term.triggerByNumKey(k)) {
            return;
          }

          if (this.state === 'MAIN') {
            if (k === 'N') window.CyberBBS.Doors.openNews();
            else if (k === 'B') window.CyberBBS.Doors.openForum();
            else if (k === 'F') window.CyberBBS.Doors.openFiles();
            else if (k === 'P') window.CyberBBS.Doors.openPhotos();
            else if (k === 'G') window.CyberBBS.Doors.openGitHub();
            else if (k === 'D') window.CyberBBS.Doors.openGames();
            else if (k === 'H' || k === 'W') window.CyberBBS.Doors.openWorldClock();
            else if (k === 'C') window.CyberBBS.Doors.openChat();
            else if (k === 'A') this.showAnsiGallery();
            else if (k === 'O') this.showOneLiners();
            else if (k === 'S') this.showSettings();
            else if (k === 'X' || k === 'Q') this.showLogoff();
            else if (k === '?') this.showHelp();
          }
        }
      });
    }

    handleNumericInput(digit) {
      if (this.numKeyTimer) clearTimeout(this.numKeyTimer);
      this.numKeyBuffer += digit;

      const term = window.CyberBBS.Term;
      const matched = term.hitRegions.find(r => r.numKey === this.numKeyBuffer);

      if (matched && typeof matched.action === 'function') {
        const hasLongerMatches = term.hitRegions.some(r => r.numKey && r.numKey !== this.numKeyBuffer && r.numKey.startsWith(this.numKeyBuffer));
        if (!hasLongerMatches || this.numKeyBuffer.length >= 2) {
          this.numKeyBuffer = '';
          matched.action();
          return;
        }
      }

      this.numKeyTimer = setTimeout(() => {
        const singleMatch = term.hitRegions.find(r => r.numKey === this.numKeyBuffer);
        if (singleMatch && typeof singleMatch.action === 'function') {
          singleMatch.action();
        }
        this.numKeyBuffer = '';
      }, 250);
    }

    setupBezelButtons() {
      document.getElementById('btn-fullscreen')?.addEventListener('click', () => this.toggleFullscreen());
      document.getElementById('btn-mute')?.addEventListener('click', () => this.toggleMute());
      document.getElementById('btn-crt')?.addEventListener('click', () => this.toggleCrt());
      document.getElementById('btn-theme')?.addEventListener('click', () => this.cycleTheme());
      document.getElementById('btn-aspect')?.addEventListener('click', () => this.toggleAspectRatio());

      const volSlider = document.getElementById('vol-slider');
      if (volSlider) {
        volSlider.addEventListener('input', (e) => {
          if (window.CyberBBS.Audio) window.CyberBBS.Audio.setVolume(parseFloat(e.target.value));
        });
      }
    }

    setupFileUpload() {
      const input = document.getElementById('bbs-file-input');
      if (!input) return;

      input.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
          const store = window.CyberBBS.Store;
          await store.saveUploadFile(file.name.toUpperCase(), file.size, file.type, reader.result);
          window.CyberBBS.Term.showNotice(`FILE ${file.name.toUpperCase()} UPLOADED! REWARDED CREDITS.`);
          if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
          window.CyberBBS.Doors.browseFileArea({ code: '07', name: 'YOUR UPLOADS (LOCAL SANDBOX)' });
        };
        reader.readAsArrayBuffer(file);
      });
    }

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        document.getElementById('btn-fullscreen')?.classList.add('active');
      } else {
        document.exitFullscreen().catch(() => {});
        document.getElementById('btn-fullscreen')?.classList.remove('active');
      }
    }

    toggleMute() {
      const audio = window.CyberBBS.Audio;
      if (!audio) return;
      const isMuted = audio.toggleMute();
      const btn = document.getElementById('btn-mute');
      if (btn) {
        btn.textContent = isMuted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON';
        btn.classList.toggle('active', !isMuted);
      }
    }

    toggleCrt() {
      this.crtEnabled = !this.crtEnabled;
      const frame = document.getElementById('crt-frame');
      const btn = document.getElementById('btn-crt');
      if (frame) {
        frame.classList.toggle('scanlines', this.crtEnabled);
        frame.classList.toggle('vignette', this.crtEnabled);
      }
      if (btn) btn.classList.toggle('active', this.crtEnabled);
    }

    cycleTheme() {
      const housing = document.getElementById('monitor-housing');
      if (!housing) return;

      housing.classList.remove(...this.themes);
      this.currentThemeIdx = (this.currentThemeIdx + 1) % this.themes.length;
      const theme = this.themes[this.currentThemeIdx];
      housing.classList.add(theme);

      const themeNames = ['VGA COLOR', 'GREEN CRT', 'AMBER CRT', 'PAPER WHITE', 'FLAT LCD'];
      const btn = document.getElementById('btn-theme');
      if (btn) btn.textContent = `🎨 ${themeNames[this.currentThemeIdx]}`;
    }

    toggleAspectRatio() {
      this.aspect169 = !this.aspect169;
      const housing = document.getElementById('monitor-housing');
      if (housing) {
        housing.classList.toggle('aspect-16-9', this.aspect169);
        housing.classList.toggle('aspect-4-3', !this.aspect169);
      }
      const btn = document.getElementById('btn-aspect');
      if (btn) btn.textContent = this.aspect169 ? '📐 RATIO: 16:9' : '📐 RATIO: 4:3';
    }

    // ==========================================
    // BOOT & SESSION FLOW
    // ==========================================

    bootSequence() {
      this.state = 'BOOT';
      this.history = [];
      const term = window.CyberBBS.Term;
      term.clear();

      term.println(` Phoenix ROM BIOS PLUS Version 1.10 A04`, 15, 0);
      term.println(` Copyright 1985-1994 Phoenix Technologies Ltd.`, 7, 0);
      term.println(` All Rights Reserved\r\n`, 7, 0);
      term.println(` 486DX2-66 CPU DETECTED · VESA LOCAL BUS READY`, 11, 0);
      term.println(` 640K Base Memory OK · 15360K Extended Memory OK`, 10, 0);
      term.println(` COM1: 03F8h (Mouse)  ·  COM2: 02F8h (Modem)`, 7, 0);
      term.println(` HAYES COMPATIBLE MODEM FOUND: USRobotics Courier 14400 HST Dual Standard`, 14, 0);
      term.println(` INITIALIZING COM2 PORT: 14400,8,N,1  ·  DTR ACTIVE\r\n`, 10, 0);
      term.println(` ============================================================================`, 8, 0);
      term.println(`               CYBER BBS TERMINAL INITIALIZED AND READY`, 15, 0);
      term.println(` ============================================================================\r\n`, 8, 0);

      this.state = 'READY_TO_DIAL';

      term.setCursor(20, 15);
      term.print(`┌────────────────────────────────────────┐`, 14, 0);
      term.setCursor(20, 16);
      term.print(`│     ► [ CLICK HERE TO DIAL BBS ] ◄     │`, 15, 1);
      term.setCursor(20, 17);
      term.print(`└────────────────────────────────────────┘`, 14, 0);

      term.addHitRegion(20, 15, 42, 3, 'btn-dial', () => this.startDialing(), 'Dial BBS', '1');

      term.setCursor(21, 19);
      term.print(`(Press 1, ENTER or click above to dial)`, 8, 0);

      term.renderStatusBar();
    }

    startDialing() {
      this.state = 'HANDSHAKE';
      const term = window.CyberBBS.Term;
      term.clear();
      term.clearHitRegions();

      term.println(` ATZ`, 15, 0);
      term.println(` OK`, 10, 0);
      term.println(` ATDT +1 (555) 019-2847`, 15, 0);
      term.println(` DIALING CYBER BBS NODE 1...`, 14, 0);
      term.println(` ────────────────────────────────────────────────────────────────────────────`, 8, 0);

      term.setCursor(26, 18);
      term.print(`[ SKIP HANDSHAKE (ESC) ]`, 14, 4);
      term.addHitRegion(26, 18, 24, 1, 'btn-skip', () => {
        window.CyberBBS.Audio.skipHandshake(() => this.showBanner());
      }, 'Skip Handshake', 'ESC');

      if (window.CyberBBS.Audio) {
        window.CyberBBS.Audio.startModemHandshake({
          onProgress: (time, text, leds) => {
            term.setCursor(2, 6);
            term.println(` Status : ${text.padEnd(65, ' ')}`, 11, 0);
            term.println(` Active : [${leds.padEnd(20, ' ')}]  Line carrier locked.`, 7, 0);

            const vu = '█'.repeat(Math.min(50, Math.floor(time * 4))) + '░'.repeat(Math.max(0, 50 - Math.floor(time * 4)));
            term.setCursor(2, 9);
            term.println(` RF Signal: [${vu}]`, 10, 0);
          },
          onComplete: () => {
            this.showBanner();
          }
        });
      } else {
        setTimeout(() => this.showBanner(), 2500);
      }
    }

    showBanner() {
      this.state = 'BANNER';
      const term = window.CyberBBS.Term;
      term.clear();
      term.clearHitRegions();

      const banner = `
  \x1b[96m██████  ██  ██ ██████  ██████ ██████    ██████  ██████  ██████
  ██      ██  ██ ██   ██ ██     ██   ██   ██   ██ ██   ██ ██
  ██      ██████ ██████  █████  ██████    ██████  ██████   █████
  ██        ██   ██   ██ ██     ██   ██   ██   ██ ██   ██      ██
  ██████    ██   ██████  ██████ ██   ██   ██████  ██████  ██████\x1b[0m

       \x1b[93m─── N O D E   1 ─── 14.4k HST DUAL STANDARD ─── EST. 1993 ───\x1b[0m
              SysOp: DR. NOISE  ·  Basement 486DX2/66  ·  24h/7d
            \x1b[37m"Where the modems scream and the packets flow free."\x1b[0m
      `;

      term.print(banner);

      term.setCursor(15, 12);
      term.println(`┌──────────────────────────────────────────────────┐`, 11, 0);
      term.setCursor(15, 13);
      term.println(`│         CHOOSE YOUR LOGIN METHOD (1, 2, 3)       │`, 15, 0);
      term.setCursor(15, 14);
      term.println(`├──────────────────────────────────────────────────┤`, 11, 0);
      term.setCursor(15, 15);
      term.println(`│  [1] GUEST LOGIN      (Instant Browse Access)    │`, 14, 0);
      term.setCursor(15, 16);
      term.println(`│  [2] NEW USER REG     (Apply for Full Handle)    │`, 14, 0);
      term.setCursor(15, 17);
      term.println(`│  [3] RETURNING USER   (Login with Password)      │`, 14, 0);
      term.setCursor(15, 18);
      term.println(`└──────────────────────────────────────────────────┘`, 11, 0);

      term.addHitRegion(17, 15, 46, 1, 'login-guest', () => this.loginAsGuest(), 'Guest Login', '1');
      term.addHitRegion(17, 16, 46, 1, 'login-new', () => this.registerNewUser(), 'New User', '2');
      term.addHitRegion(17, 17, 46, 1, 'login-user', () => this.loginExistingUser(), 'Returning User', '3');

      term.renderStatusBar();
    }

    loginAsGuest() {
      window.CyberBBS.Store.loginGuest();
      this.showBulletins();
    }

    registerNewUser() {
      const term = window.CyberBBS.Term;

      // In-Terminal Step 1: Handle
      term.promptInline('NEW USER REGISTRATION (1/3)', 'Choose Handle (2-16 characters):', 'CYBER_HERO', (handle) => {
        if (!handle) return;

        // In-Terminal Step 2: Password
        term.promptInline('NEW USER REGISTRATION (2/3)', 'Choose Password (min 4 chars):', '', (pass) => {
          if (!pass) return;

          // In-Terminal Step 3: City
          term.promptInline('NEW USER REGISTRATION (3/3)', 'Enter your Location / City:', 'Seattle, WA', async (city) => {
            const res = await window.CyberBBS.Store.registerUser(handle, pass, handle, city);
            if (res.ok) {
              window.CyberBBS.Store.setCurrentUser(res.user);
              term.showNotice(`HANDLE ${handle.toUpperCase()} REGISTERED!`);
              this.showBulletins();
            } else {
              term.showNotice(res.error);
              this.showBanner();
            }
          }, () => this.showBanner());
        }, () => this.showBanner(), true);
      }, () => this.showBanner());
    }

    loginExistingUser() {
      const term = window.CyberBBS.Term;

      // In-Terminal Step 1: Handle
      term.promptInline('LOGIN (1/2)', 'Enter your BBS Handle:', '', (handle) => {
        if (!handle) return;

        // In-Terminal Step 2: Password
        term.promptInline('LOGIN (2/2)', 'Enter Password:', '', async (pass) => {
          if (!pass) return;

          const res = await window.CyberBBS.Store.loginUser(handle, pass);
          if (res.ok) {
            window.CyberBBS.Store.setCurrentUser(res.user);
            this.showBulletins();
          } else {
            term.showNotice(res.error);
            this.showBanner();
          }
        }, () => this.showBanner(), true);
      }, () => this.showBanner());
    }

    showBulletins() {
      this.state = 'BULLETINS';
      const term = window.CyberBBS.Term;
      term.clear();
      term.clearHitRegions();

      term.println(`┌────────────────────────[ SYSTEM BULLETINS // NODE 1 ]────────────────────────┐`, 11, 0);
      term.println(`│ Date: 1995-10-14       SysOp: DR. NOISE       Priority: SYSTEM ANNOUNCEMENT  │`, 15, 0);
      term.println(`├──────────────────────────────────────────────────────────────────────────────┤`, 11, 0);
      term.println(`  1. NAVIGATION NOTICE: Primary navigation is by NUMBERS! Type 1-12 to jump.\r\n     Arrow keys pre-select items with '►'. Press Enter to confirm pre-selection.`, 14, 0);
      term.println(`  2. BULLETIN BOARD / FORUM: Full Internet forum database persisted as JSON!\r\n     Post threads, read discussions, and export/import FORUM_DATA.JSON.`, 10, 0);
      term.println(`  3. WORLD CLOCKS (HORAS MUNDIAIS): Real-time live ticking clocks across major\r\n     hubs (Seattle, New York, São Paulo, London, Paris, Tokyo, Sydney).`, 11, 0);
      term.println(`  4. GITHUB VAULT: Pure text repository browser, README text viewer & DIR tree!`, 7, 0);
      term.println(`├──────────────────────────────────────────────────────────────────────────────┤`, 11, 0);

      term.setCursor(20, 18);
      term.print(`[ PRESS 1 OR ENTER TO ENTER MAIN MENU ]`, 15, 1);
      term.addHitRegion(20, 18, 43, 1, 'btn-main', () => this.showMainMenu(), 'Enter Main Menu', '1');

      term.renderStatusBar();
    }

    // ==========================================
    // MAIN MENU — 100% NUMBERED & ARROW PRE-SELECTION
    // ==========================================
    showMainMenu() {
      this.state = 'MAIN';
      this.history = []; // Clear stack at main menu
      this.currentRenderFn = () => this.showMainMenu();

      const term = window.CyberBBS.Term;
      term.clear();
      term.clearHitRegions();

      const user = window.CyberBBS.Store.currentUser;
      const handle = user ? user.handle : 'GUEST';
      const timeLeft = window.CyberBBS.Store.getTimeRemainingFormatted();
      const credits = user ? user.credits : 500;
      const ratio = window.CyberBBS.Store.getRatio();

      term.println(`┌────────────────────────[ CYBER BBS // MAIN MENU ]───────────────────────────┐`, 11, 0);
      term.println(`│ Handle: ${handle.padEnd(16, ' ')} Access: 100 MEMBER      Node 1   14400 ARQ  │`, 7, 0);
      term.println(`│ Time left: ${timeLeft.padEnd(14, ' ')} Ratio: ${ratio.padEnd(16, ' ')} Credits: ${credits.toString().padEnd(6, ' ')}    │`, 7, 0);
      term.println(`├──────────────────────────────────────────────────────────────────────────────┤`, 11, 0);

      const menuItems = [
        { num: '1',  key: 'N', label: 'News & Live Feeds', act: () => window.CyberBBS.Doors.openNews() },
        { num: '2',  key: 'B', label: 'Bulletin Board (Forum)', act: () => window.CyberBBS.Doors.openForum() },
        { num: '3',  key: 'F', label: 'File Areas & Downloads', act: () => window.CyberBBS.Doors.openFiles() },
        { num: '4',  key: 'P', label: 'Photo Grabber & ANSI', act: () => window.CyberBBS.Doors.openPhotos() },
        { num: '5',  key: 'G', label: 'GitHub Vault (Text)', act: () => window.CyberBBS.Doors.openGitHub() },
        { num: '6',  key: 'D', label: 'Door Games & RPG', act: () => window.CyberBBS.Doors.openGames() },
        { num: '7',  key: 'H', label: 'World Clocks (Horas)', act: () => window.CyberBBS.Doors.openWorldClock() },
        { num: '8',  key: 'W', label: 'Weather Telemetry', act: () => window.CyberBBS.Doors.openWeather() },
        { num: '9',  key: 'A', label: 'ANSI Art Gallery', act: () => this.showAnsiGallery() },
        { num: '10', key: 'C', label: 'Live SysOp Chat', act: () => window.CyberBBS.Doors.openChat() },
        { num: '11', key: 'O', label: 'One-Liners Wall', act: () => this.showOneLiners() },
        { num: '12', key: 'S', label: 'Settings & Defaults', act: () => this.showSettings() },
        { num: '0',  key: 'X', label: 'Logoff & Disconnect', act: () => this.showLogoff() }
      ];

      for (let i = 0; i < 7; i++) {
        const leftItem = menuItems[i];
        const rightItem = menuItems[i + 7];
        const y = 4 + i * 2;

        if (leftItem) {
          term.setCursor(3, y);
          term.print(`[`, 15, 0);
          term.print(`${leftItem.num.padStart(2, ' ')}`, 14, 0);
          term.print(`] `, 15, 0);
          term.print(`${leftItem.label.padEnd(28, ' ')}`, 7, 0);

          term.addHitRegion(3, y, 34, 1, `main-${leftItem.num}`, leftItem.act, leftItem.label, leftItem.num);
        }

        if (rightItem) {
          term.setCursor(41, y);
          term.print(`[`, 15, 0);
          term.print(`${rightItem.num.padStart(2, ' ')}`, 14, 0);
          term.print(`] `, 15, 0);
          term.print(`${rightItem.label.padEnd(28, ' ')}`, 7, 0);

          term.addHitRegion(41, y, 34, 1, `main-${rightItem.num}`, rightItem.act, rightItem.label, rightItem.num);
        }
      }

      term.setCursor(0, 18);
      term.println(`├──────────────────────────────────────────────────────────────────────────────┤`, 11, 0);
      term.println(`│  Type NUMBER (1-12, 0) or use Arrow Keys to Pre-Select and press Enter       │`, 10, 0);
      term.println(`└──────────────────────────────────────────────────────────────────────────────┘`, 11, 0);

      term.setCursor(2, 21);
      term.print(`Command/Number> _`, 14, 0);

      term.renderStatusBar();
    }

    showAnsiGallery() {
      this.pushScreen('ANSI_GALLERY', () => {
        const term = window.CyberBBS.Term;
        window.CyberBBS.Doors.renderHeader('ANSI ART GALLERY // VINTAGE SCREENS');

        const art = `
  \x1b[96m╔══════════════════════════════════════════════════════════════════════════════╗
  ║ \x1b[93m▄▄█▀▀▀█▄▄  ▄█▀▀▀█▄   ▄█▀▀█▄   ██   ██ ██████  ▄█▀▀█▄   ▄████▄   ▄█▀▀▀█▄\x1b[96m      ║
  ║ \x1b[93m██    ██   ██   ██  ██    ██  ██   ██ ██     ██    ██  ██  ▀██  ██   ██\x1b[96m      ║
  ║ \x1b[93m██    ██   █████▀   ██    ██  ██   ██ █████  ██    ██  ██   ██  █████▀ \x1b[96m      ║
  ║ \x1b[93m██    ██   ██  ██   ██    ██  ██   ██ ██     ██    ██  ██   ██  ██  ██ \x1b[96m      ║
  ║ \x1b[93m▀▀█▄▄▄█▀▀  ██   ██   ▀█▄▄█▀    ▀███▀  ██████  ▀█▄▄█▀   ▀████▀   ██   ██\x1b[96m      ║
  ╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m
     Title: Cyber Station '95   ·   Artist: ACID BURN   ·   Format: 80x25 CP437
        `;
        term.print(art);

        window.CyberBBS.Doors.renderFooter([
          { key: '1', label: 'Save as .ANS', action: () => {
            const blob = window.CyberBBS.Ansi.createAnsiBlob(art, 'Cyber Station 95', 'ACID BURN');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'CYBER95.ANS'; a.click();
            URL.revokeObjectURL(url);
            term.showNotice('SAVED AS CYBER95.ANS');
          }}
        ]);
      });
    }

    showOneLiners() {
      this.pushScreen('ONE_LINERS', () => {
        window.CyberBBS.Doors.renderHeader('ONE-LINERS WALL // GRAFFITI BOARD');
        const term = window.CyberBBS.Term;

        const lines = window.CyberBBS.Store.getOneLiners();
        lines.slice(0, 8).forEach((l, idx) => {
          const row = 5 + idx * 2;
          term.setCursor(2, row);
          term.print(`[${l.handle.padEnd(12, ' ')}] `, 14, 0);
          term.print(`${l.text}`, 15, 0);
        });

        window.CyberBBS.Doors.renderFooter([
          { key: '1', label: 'Add Your One-Liner', action: () => {
            term.promptInline('ONE-LINER GRAFFITI', 'Enter your 70-character message:', '', (text) => {
              if (text) {
                const user = window.CyberBBS.Store.currentUser;
                window.CyberBBS.Store.addOneLiner(user ? user.handle : 'GUEST', text);
                this.showOneLiners();
              }
            }, () => this.showOneLiners());
          }}
        ]);
      });
    }

    showSettings() {
      this.pushScreen('SETTINGS', () => {
        window.CyberBBS.Doors.renderHeader('USER DEFAULTS & TERMINAL SETUP');
        const term = window.CyberBBS.Term;

        term.println(`  #  SETTING                    CURRENT VALUE         ACTION`, 11, 0);
        term.println(`  ─  ─────────────────────────  ────────────────────  ────────────────────────`, 8, 0);

        const settings = [
          { num: '1', name: 'Color Theme', val: this.themes[this.currentThemeIdx].replace('theme-', '').toUpperCase(), act: () => this.cycleTheme() },
          { num: '2', name: 'CRT Shaders / Scanlines', val: this.crtEnabled ? 'ENABLED' : 'DISABLED', act: () => this.toggleCrt() },
          { num: '3', name: 'Aspect Ratio', val: this.aspect169 ? '16:9 WIDESCREEN' : '4:3 CLASSIC CRT', act: () => this.toggleAspectRatio() },
          { num: '4', name: 'Sound & Modem Handshake', val: window.CyberBBS.Audio?.muted ? 'MUTED' : 'UNMUTED', act: () => this.toggleMute() },
          { num: '5', name: 'Export System Save', val: 'CYBERBBS.SAV', act: () => window.CyberBBS.Store.exportSaveData() }
        ];

        settings.forEach((s) => {
          const row = 5 + (parseInt(s.num, 10) - 1) * 2;
          term.setCursor(2, row);
          term.print(`[${s.num}] `, 14, 0);
          term.print(`${s.name.padEnd(26, ' ')}  `, 15, 0);
          term.print(`${s.val.padEnd(20, ' ')}  `, 10, 0);
          term.print(`[ CLICK TO TOGGLE ]`, 11, 0);

          term.addHitRegion(2, row, 76, 1, `set-${s.num}`, () => { s.act(); this.showSettings(); }, s.name, s.num);
        });

        term.setCursor(2, 20);
        term.print(`Type number (1-5) to toggle setting directly.`, 14, 0);

        window.CyberBBS.Doors.renderFooter();
      });
    }

    showHelp() {
      this.pushScreen('HELP', () => {
        window.CyberBBS.Doors.renderHeader('HELP & COMMAND REFERENCE');
        const term = window.CyberBBS.Term;

        term.println(`  KEYBOARD SHORTCUTS & NAVIGATION`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  NUMBER KEYS  : Type numbers (1, 2, 3...) to jump to any option instantly!`, 14, 0);
        term.println(`  ARROW KEYS   : Move the pre-selection highlight cursor [►] across items`, 15, 0);
        term.println(`  ENTER / SPACE: Activate the pre-selected option`, 15, 0);
        term.println(`  ESCAPE       : ALWAYS returns to the previous menu or cancels prompts!`, 14, 0);
        term.println(`  F11 / Alt+Ent: Toggle Full Screen (Full HD 1080p)`, 15, 0);
        term.println(`  IN-TERMINAL  : All text input is typed directly on-screen (no pop-up windows!)`, 10, 0);
        term.println(`  MOUSE        : 100% clickable with hover indicator and scrollwheel support`, 10, 0);

        window.CyberBBS.Doors.renderFooter();
      });
    }

    showLogoff() {
      this.state = 'LOGOFF';
      this.history = [];
      const term = window.CyberBBS.Term;
      term.clear();
      term.clearHitRegions();

      const user = window.CyberBBS.Store.currentUser;
      const handle = user ? user.handle : 'GUEST';

      term.println(`\r\n\r\n`, 0, 0);
      term.println(`  ╔══════════════════════════════════════════════════════════════════════════╗`, 11, 0);
      term.println(`  ║                  THANKS FOR CALLING CYBER BBS NODE 1                     ║`, 14, 0);
      term.println(`  ║              "The Basement BBS That Never Stopped Answering"             ║`, 15, 0);
      term.println(`  ╚══════════════════════════════════════════════════════════════════════════╝`, 11, 0);
      term.println(`\r\n  SESSION SUMMARY FOR ${handle}:`, 14, 0);
      term.println(`  Calls Today : ${user?.calls || 1}      Downloads : ${Math.ceil((user?.bytesDown || 0) / 1024)} KB`, 7, 0);
      term.println(`  Credits Left: ${user?.credits || 500}       Uploads   : ${Math.ceil((user?.bytesUp || 0) / 1024)} KB`, 7, 0);
      term.println(`\r\n  Dropping carrier... ATH0\r\n  NO CARRIER`, 12, 0);

      if (window.CyberBBS.Audio) window.CyberBBS.Audio.playHangup();

      ['hs', 'aa', 'cd', 'oh', 'rd', 'sd'].forEach(id => {
        document.getElementById('led-' + id)?.classList.remove('on');
      });

      term.setCursor(24, 17);
      term.print(`[ PRESS 1 OR CLICK TO DIAL AGAIN ]`, 15, 1);
      term.addHitRegion(24, 17, 34, 1, 'btn-redial', () => this.bootSequence(), 'Redial BBS', '1');

      term.renderStatusBar();
    }
  }

  window.CyberBBS.App = new BBSApp();

  window.addEventListener('DOMContentLoaded', () => {
    window.CyberBBS.App.init();
  });
})();
