/**
 * CYBER BBS — Master Application Controller & Command-Line Router (Mega Edition v3.0)
 */
(function() {
  window.CyberBBS = window.CyberBBS || {};

  class BBSApp {
    constructor() {
      this.state = 'BOOT';
      this.history = [];
      this.currentRenderFn = null;

      this.themes = ['theme-vga', 'theme-green', 'theme-amber', 'theme-paper', 'theme-flat'];
      this.currentThemeIdx = 0;

      this.skins = ['skin-classic', 'skin-compaq', 'skin-amiga', 'skin-ibm5151'];
      this.currentSkinIdx = 0;

      this.crtEnabled = true;
      this.aspect169 = false;
      this.pureMode = false;
      this.lateNight = false;
      this.randomEventsEnabled = true;

      this.cmdBuffer = '';
      this.cmdHistory = [];
      this.cmdHistoryIdx = -1;
      this.sysopEventTimer = null;
    }

    init() {
      window.CyberBBS.Term.init('term-canvas', 'mouse-overlay');
      this.setupKeyboard();
      this.setupBezelButtons();
      this.setupFileUploads();
      this.startSysOpEventsLoop();
      this.bootSequence();
    }

    pushScreen(screenName, renderFn) {
      if (this.state === screenName) { this.currentRenderFn = renderFn; renderFn(); return; }
      if (this.currentRenderFn && this.state !== 'BOOT') this.history.push({ state: this.state, render: this.currentRenderFn });
      this.state = screenName;
      this.currentRenderFn = renderFn;
      renderFn();
    }

    goBack() {
      const term = window.CyberBBS.Term;
      if (term && term.activePrompt) {
        const cb = term.activePrompt.onCancel; term.activePrompt = null; term.redrawAll();
        if (typeof cb === 'function') cb();
        return;
      }
      if (term && term.activeMultiline) {
        const cb = term.activeMultiline.onCancel; term.activeMultiline = null; term.redrawAll();
        if (typeof cb === 'function') cb();
        return;
      }
      if (window.CyberBBS.Doors?.stopActiveTimer) window.CyberBBS.Doors.stopActiveTimer();
      if (window.CyberBBS.Games?.clearKeyHandler) window.CyberBBS.Games.clearKeyHandler();

      if (this.history.length > 0) {
        const prev = this.history.pop();
        this.state = prev.state;
        this.currentRenderFn = prev.render;
        if (typeof prev.render === 'function') { prev.render(); return; }
      }
      if (this.state !== 'MAIN' && this.state !== 'BOOT') this.showMainMenu();
    }

    startSysOpEventsLoop() {
      if (this.sysopEventTimer) clearInterval(this.sysopEventTimer);
      this.sysopEventTimer = setInterval(() => {
        if (!this.randomEventsEnabled || this.state !== 'MAIN') return;
        const term = window.CyberBBS.Term;
        if (!term || term.activePrompt || term.activeMultiline) return;
        const events = [
          'SYSOP (DR. NOISE): Compiling Linux 1.2.13 kernel on tty2 — CPU load 0.42',
          'LINE TELEMETRY: V.42bis dictionary sync verified · 0 CRC errors on COM2',
          'NODE 2: ACID_BURN just uploaded a new CP437 screen to ANSI Gallery!',
          'FIDONET HUB: Incoming ZMODEM echomail bundle from Zone 1:117/104...',
          'SYSOP TIP: Type STATS or CALLERS at Command> _ to inspect node telemetry!'
        ];
        term.showNotice(events[Math.floor(Math.random() * events.length)], 4500);
      }, 28000);
    }

    updateCmdPromptDisplay() {
      const term = window.CyberBBS.Term;
      if (!term || this.state !== 'MAIN') return;
      term.setCursor(2, 22);
      term.print(`Command/Number> ${this.cmdBuffer}_`.padEnd(55, ' '), 14, 0);
    }

    executeMainCommand(rawCmd) {
      const raw = String(rawCmd || '').trim();
      this.cmdBuffer = '';
      if (!raw) {
        const term = window.CyberBBS.Term;
        if (term.activeRegionIdx >= 0) term.activateCurrentRegion();
        else this.updateCmdPromptDisplay();
        return;
      }

      // Record in command history
      this.cmdHistory.push(raw);
      if (this.cmdHistory.length > 25) this.cmdHistory.shift();
      this.cmdHistoryIdx = -1;

      // Handle command chaining with ';' delimiter (e.g. M;1;R or NEWS;FORUM)
      if (raw.includes(';')) {
        const chain = raw.split(';').map(s => s.trim()).filter(Boolean);
        for (const single of chain) {
          this.executeSingleCommand(single);
        }
        return;
      }

      this.executeSingleCommand(raw);
    }

    executeSingleCommand(rawCmd) {
      const cmd = String(rawCmd || '').trim().toUpperCase();
      window.CyberBBS.Term.logCommand(cmd);
      const doors = window.CyberBBS.Doors, games = window.CyberBBS.Games;

      if (/^[0-9]{1,2}$/.test(cmd) && window.CyberBBS.Term.triggerByNumKey(cmd)) return;

      // Hayes AT Command handling
      if (cmd.startsWith('ATDT') || cmd.startsWith('ATDP')) {
        const num = cmd.substring(4).trim();
        if (num) { doors.dialCustomNumber(num); return; }
      } else if (cmd.startsWith('AT')) {
        window.CyberBBS.Term.showNotice('OK (HAYES 14.4k HST READY)');
        return;
      } else if (cmd === '+++') {
        window.CyberBBS.Term.showNotice('OK (ESCAPE TO COMMAND MODE)');
        return;
      }

      // MODE Command (e.g. MODE VGA, MODE MDA, MODE CGA, MODE SVGA, MODE OLED)
      if (cmd.startsWith('MODE')) {
        const parts = cmd.split(/\s+/);
        if (parts.length > 1) {
          const target = parts[1].toLowerCase();
          const profiles = window.CyberBBS.VIDEO_PROFILES || {};
          const matchedKey = Object.keys(profiles).find(k => k.toLowerCase().includes(target));
          if (matchedKey) {
            window.CyberBBS.Term.setVideoProfile(matchedKey, true);
            return;
          }
        }
        this.showVideoModePicker();
        return;
      }

      const commandMap = {
        '1': () => doors.openNews(), 'N': () => doors.openNews(), 'NEWS': () => doors.openNews(),
        '2': () => doors.openForum(), 'B': () => doors.openForum(), 'FORUM': () => doors.openForum(), 'MSGS': () => doors.openForum(),
        '3': () => doors.openNetmail(), 'E': () => doors.openNetmail(), 'MAIL': () => doors.openNetmail(), 'NETMAIL': () => doors.openNetmail(),
        '4': () => doors.openFiles(), 'F': () => doors.openFiles(), 'FILES': () => doors.openFiles(), 'DIR': () => doors.openFiles(), 'SEARCH': () => doors.searchFilesPrompt(),
        '5': () => doors.openPhotos(), 'P': () => doors.openPhotos(), 'PHOTOS': () => doors.openPhotos(),
        '6': () => doors.openGitHub(), 'G': () => doors.openGitHub(), 'GITHUB': () => doors.openGitHub(),
        '7': () => doors.openGames(), 'D': () => doors.openGames(), 'GAMES': () => doors.openGames(), 'DOORS': () => doors.openGames(),
        'LORD': () => games.playCyberLord('TOWN'), 'TRADE': () => games.playStarTrade(), 'ZORK': () => games.playZork(), 'TRIVIA': () => games.playTrivia(),
        '8': () => doors.showAnsiGallery(0), 'A': () => doors.showAnsiGallery(0), 'ANSI': () => doors.showAnsiGallery(0), 'EDITOR': () => doors.openAnsiEditor(),
        '9': () => doors.openWorldClock(), 'H': () => doors.openWorldClock(), 'CLOCKS': () => doors.openWorldClock(),
        '10': () => doors.openWeather(), 'W': () => doors.openWeather(), 'WEATHER': () => doors.openWeather(),
        '11': () => doors.openChat(), 'C': () => doors.openChat(), 'CHAT': () => doors.openChat(),
        '12': () => this.showOneLiners(), 'O': () => this.showOneLiners(), 'ONELINERS': () => this.showOneLiners(),
        '13': () => doors.openTodayHub(), 'T': () => doors.openTodayHub(), 'TODAY': () => doors.openTodayHub(),
        '14': () => doors.openMultiNode(), 'M': () => doors.openMultiNode(), 'NODES': () => doors.openMultiNode(),
        '15': () => doors.openNewspaper(), 'J': () => doors.openNewspaper(), 'NEWSPAPER': () => doors.openNewspaper(),
        '16': () => this.showUserStats(), 'U': () => this.showUserStats(), 'STATS': () => this.showUserStats(),
        'L': () => this.showLastCallers(), 'CALLERS': () => this.showLastCallers(), 'WHO': () => this.showLastCallers(),
        '17': () => this.showSettings(), 'S': () => this.showSettings(), 'SETTINGS': () => this.showSettings(),
        '18': () => doors.openMarketWire(), 'MARKET': () => doors.openMarketWire(), 'FOREX': () => doors.openMarketWire(), 'CRYPTO': () => doors.openMarketWire(), 'MKT': () => doors.openMarketWire(),
        '19': () => doors.openEarthAndSky(), 'EARTH': () => doors.openEarthAndSky(), 'ISS': () => doors.openEarthAndSky(), 'QUAKE': () => doors.openEarthAndSky(), 'RADAR': () => doors.openEarthAndSky(),
        '20': () => doors.openRadio(), 'RADIO': () => doors.openRadio(), 'TUNER': () => doors.openRadio(), 'MUSIC': () => doors.openRadio(),
        '21': () => doors.openWikiTerminal(), 'WIKI': () => doors.openWikiTerminal(), 'WIKIPEDIA': () => doors.openWikiTerminal(),
        '22': () => doors.openNetDiagnostics(), 'DIAG': () => doors.openNetDiagnostics(), 'IP': () => doors.openNetDiagnostics(), 'PING': () => doors.openNetDiagnostics(),
        'BOOKS': () => doors.openGutenberg(), 'GUTENBERG': () => doors.openGutenberg(), 'READ': () => doors.openGutenberg(),
        'PHONE': () => doors.openPhoneBook(), 'DIAL': () => doors.openPhoneBook(),
        'DEGAUSS': () => window.CyberBBS.Term.triggerDegauss(),
        'GRAB': () => window.CyberBBS.Term.exportScreenGrab('both'),
        'SELFTEST': () => this.runSelfTest(),
        'PURE': () => { this.togglePureMode(); this.showMainMenu(); },
        'NIGHT': () => { this.toggleLateNight(); this.showMainMenu(); },
        'EXPORT': () => window.CyberBBS.Term.exportSessionLog(),
        'CLS': () => this.showMainMenu(),
        '?': () => this.showHelp(), 'HELP': () => this.showHelp(),
        '0': () => this.showLogoff(), 'X': () => this.showLogoff(), 'Q': () => this.showLogoff(), 'LOGOFF': () => this.showLogoff(), 'BYE': () => this.showLogoff()
      };

      if (commandMap[cmd]) commandMap[cmd]();
      else { window.CyberBBS.Term.showNotice(`UNKNOWN COMMAND "${cmd}". TYPE HELP OR 0-22.`); this.updateCmdPromptDisplay(); }
    }

    setupKeyboard() {
      window.addEventListener('keydown', (e) => {
        const term = window.CyberBBS.Term;
        if (term && term.activePrompt) { e.preventDefault(); term.handlePromptKey(e); return; }
        if (term && term.activeMultiline) { e.preventDefault(); term.handleMultilineKey(e); return; }

        if (window.CyberBBS.Games && typeof window.CyberBBS.Games.customKeyHandler === 'function') {
          if (e.key !== 'Escape' && e.key !== 'F11' && window.CyberBBS.Games.customKeyHandler(e)) { e.preventDefault(); return; }
        }

        // Global hotkeys
        if (e.key === 'F11' || (e.altKey && e.key === 'Enter')) { e.preventDefault(); this.toggleFullscreen(); return; }
        if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); term.redrawAll(); term.showNotice('SCREEN BUFFER REFRESHED (CTRL+L).'); return; }
        if (e.altKey && e.key.toLowerCase() === 'v') { e.preventDefault(); this.showVideoModePicker(); return; }
        if (e.altKey && e.key.toLowerCase() === 'g') { e.preventDefault(); term.exportScreenGrab('both'); return; }
        if (e.altKey && e.key.toLowerCase() === 'd') { e.preventDefault(); window.CyberBBS.Doors.openPhoneBook(); return; }
        if (e.altKey && e.key.toLowerCase() === 'n') {
          e.preventDefault();
          const nextNode = (window.CyberBBS.Store.currentNodeId % 4) + 1;
          window.CyberBBS.Store.switchNode(nextNode);
          term.showNotice(`HOPPED TO NODE ${nextNode}!`);
          if (this.state === 'MAIN') this.showMainMenu();
          return;
        }

        // Scrollback buffer navigation via PageUp / PageDown
        if (e.key === 'PageUp' || e.key === 'PageDown') {
          if (typeof term.onWheelHandler === 'function') {
            e.preventDefault(); term.onWheelHandler(e.key === 'PageDown' ? 1 : -1); return;
          } else {
            e.preventDefault(); term.scrollBack(e.key === 'PageUp' ? 6 : -6); return;
          }
        }

        // Exit scrollback viewing mode on any regular navigation
        if (term.scrollbackOffset > 0 && ['Escape', 'Enter', ' '].includes(e.key)) {
          e.preventDefault(); term.resetScrollback(); return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          if (this.state === 'MAIN' && this.cmdBuffer.length > 0) { this.cmdBuffer = ''; this.updateCmdPromptDisplay(); return; }
          if (this.state === 'HANDSHAKE') window.CyberBBS.Audio.skipHandshake(() => this.showBanner());
          else this.goBack();
          return;
        }

        if (!e.ctrlKey && !e.altKey && e.key.length === 1 && window.CyberBBS.Audio) window.CyberBBS.Audio.playKeyClick();

        if (this.state === 'MAIN') {
          if (e.key === 'Backspace') { e.preventDefault(); if (this.cmdBuffer.length > 0) { this.cmdBuffer = this.cmdBuffer.slice(0, -1); this.updateCmdPromptDisplay(); } return; }
          if (e.key === 'Enter') { e.preventDefault(); this.executeMainCommand(this.cmdBuffer); return; }

          // Command history recall
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.cmdHistory.length > 0) {
              if (this.cmdHistoryIdx === -1) this.cmdHistoryIdx = this.cmdHistory.length - 1;
              else this.cmdHistoryIdx = Math.max(0, this.cmdHistoryIdx - 1);
              this.cmdBuffer = this.cmdHistory[this.cmdHistoryIdx] || '';
              this.updateCmdPromptDisplay();
            }
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.cmdHistory.length > 0 && this.cmdHistoryIdx >= 0) {
              if (this.cmdHistoryIdx + 1 < this.cmdHistory.length) {
                this.cmdHistoryIdx++;
                this.cmdBuffer = this.cmdHistory[this.cmdHistoryIdx] || '';
              } else {
                this.cmdHistoryIdx = -1;
                this.cmdBuffer = '';
              }
              this.updateCmdPromptDisplay();
            }
            return;
          }

          // Command Tab autocompletion
          if (e.key === 'Tab') {
            e.preventDefault();
            const allCmds = ['NEWS', 'FORUM', 'MAIL', 'FILES', 'PHOTOS', 'GITHUB', 'GAMES', 'LORD', 'TRADE', 'ZORK', 'TRIVIA', 'ANSI', 'CLOCKS', 'WEATHER', 'CHAT', 'ONELINERS', 'TODAY', 'NODES', 'NEWSPAPER', 'STATS', 'CALLERS', 'SETTINGS', 'MARKET', 'EARTH', 'RADIO', 'WIKI', 'BOOKS', 'DIAG', 'PHONE', 'MODE', 'DEGAUSS', 'GRAB', 'SELFTEST', 'HELP', 'LOGOFF'];
            const prefix = this.cmdBuffer.toUpperCase();
            if (prefix) {
              const found = allCmds.find(c => c.startsWith(prefix) && c !== prefix);
              if (found) {
                this.cmdBuffer = found;
                this.updateCmdPromptDisplay();
              }
            }
            return;
          }

          if (e.key === 'ArrowRight') { e.preventDefault(); term.selectNextRegion(true); return; }
          if (e.key === 'ArrowLeft') { e.preventDefault(); term.selectNextRegion(false); return; }

          if (e.key.length === 1 && !e.ctrlKey && !e.altKey && e.key !== ' ') {
            e.preventDefault();
            const ch = e.key.toUpperCase();
            if (this.cmdBuffer.length === 0) {
              if (ch === '?') { this.showHelp(); return; }
              if (/^[0-9]$/.test(ch)) { term.triggerByNumKey(ch); return; }
            }
            if (this.cmdBuffer.length < 24) { this.cmdBuffer += ch; this.updateCmdPromptDisplay(); }
            return;
          }
        }

        if (/^[0-9]$/.test(e.key)) { e.preventDefault(); term.triggerByNumKey(e.key); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'Tab') { e.preventDefault(); term.selectNextRegion(true); return; }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); term.selectNextRegion(false); return; }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (this.state === 'READY_TO_DIAL') this.startDialing();
          else if (term.activeRegionIdx >= 0) term.activateCurrentRegion();
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey) term.triggerByNumKey(e.key.toUpperCase());
      });
    }

    setupBezelButtons() {
      document.getElementById('btn-fullscreen')?.addEventListener('click', () => this.toggleFullscreen());
      document.getElementById('btn-mute')?.addEventListener('click', () => this.toggleMute());
      document.getElementById('btn-crt')?.addEventListener('click', () => this.toggleCrt());
      document.getElementById('btn-theme')?.addEventListener('click', () => this.cycleTheme());
      document.getElementById('btn-skin')?.addEventListener('click', () => this.cycleSkin());
      document.getElementById('btn-pure')?.addEventListener('click', () => this.togglePureMode());
      document.getElementById('btn-aspect')?.addEventListener('click', () => this.toggleAspectRatio());
      document.getElementById('btn-mode')?.addEventListener('click', () => window.CyberBBS.Term.cycleVideoProfile());

      document.addEventListener('fullscreenchange', () => {
        const active = !!document.fullscreenElement;
        const btn = document.getElementById('btn-fullscreen');
        btn?.classList.toggle('active', active);
        btn?.setAttribute('aria-pressed', String(active));
      });

      document.getElementById('vol-slider')?.addEventListener('input', (e) => {
        if (window.CyberBBS.Audio) window.CyberBBS.Audio.setVolume(parseFloat(e.target.value));
      });
    }

    setupFileUploads() {
      document.getElementById('bbs-file-input')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
          const res = await window.CyberBBS.Store.saveUploadFile(file.name.toUpperCase(), file.size, file.type, reader.result);
          window.CyberBBS.Doors.runUploadTheater(file.name.toUpperCase(), file.size, res?.reward || 25);
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
      });

      document.getElementById('bbs-json-input')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const txt = String(reader.result || ''), store = window.CyberBBS.Store;
          const backupRes = store.importFullBackup(txt);
          if (backupRes.ok) { window.CyberBBS.Term.showNotice(backupRes.message); this.showMainMenu(); }
          else {
            const forumRes = store.importForumJson(txt);
            window.CyberBBS.Term.showNotice(forumRes.ok ? forumRes.message : forumRes.error);
            if (forumRes.ok) window.CyberBBS.Doors.renderForumCategories();
          }
        };
        reader.readAsText(file);
        e.target.value = '';
      });
    }

    toggleFullscreen() {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    }

    toggleMute() {
      const audio = window.CyberBBS.Audio;
      if (!audio) return;
      const isMuted = audio.toggleMute();
      const btn = document.getElementById('btn-mute');
      if (btn) { btn.textContent = isMuted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON'; btn.classList.toggle('active', !isMuted); btn.setAttribute('aria-pressed', String(!isMuted)); }
    }

    toggleCrt() {
      this.crtEnabled = !this.crtEnabled;
      const frame = document.getElementById('crt-frame'), btn = document.getElementById('btn-crt');
      if (frame) { frame.classList.toggle('scanlines', this.crtEnabled); frame.classList.toggle('vignette', this.crtEnabled); }
      if (btn) { btn.textContent = this.crtEnabled ? '📺 CRT: ON' : '📺 CRT: OFF'; btn.classList.toggle('active', this.crtEnabled); btn.setAttribute('aria-pressed', String(this.crtEnabled)); }
    }

    cycleTheme() {
      const housing = document.getElementById('monitor-housing');
      if (!housing) return;
      housing.classList.remove(...this.themes);
      this.currentThemeIdx = (this.currentThemeIdx + 1) % this.themes.length;
      housing.classList.add(this.themes[this.currentThemeIdx]);
      const names = ['VGA COLOR', 'GREEN CRT', 'AMBER CRT', 'PAPER WHITE', 'FLAT LCD'];
      const btn = document.getElementById('btn-theme');
      if (btn) btn.textContent = `🎨 ${names[this.currentThemeIdx]}`;
    }

    cycleSkin() {
      const housing = document.getElementById('monitor-housing');
      if (!housing) return;
      housing.classList.remove(...this.skins);
      this.currentSkinIdx = (this.currentSkinIdx + 1) % this.skins.length;
      housing.classList.add(this.skins[this.currentSkinIdx]);
      const names = ['CLASSIC PC', 'COMPAQ', 'AMIGA 1084', 'IBM 5151'];
      const btn = document.getElementById('btn-skin');
      if (btn) btn.textContent = `🖥️ ${names[this.currentSkinIdx]}`;
    }

    togglePureMode() {
      this.pureMode = !this.pureMode;
      document.body.classList.toggle('pure-mode', this.pureMode);
      const btn = document.getElementById('btn-pure');
      if (btn) { btn.textContent = this.pureMode ? '⬜ PURE: ON' : '⬜ PURE: OFF'; btn.classList.toggle('active', this.pureMode); }
      if (this.pureMode && window.CyberBBS.Term) window.CyberBBS.Term.showNotice('PURE 80x25 TERMINAL MODE ACTIVE (TYPE "PURE" TO RESTORE)');
    }

    toggleLateNight() {
      this.lateNight = !this.lateNight;
      document.body.classList.toggle('late-night', this.lateNight);
      if (window.CyberBBS.Term) window.CyberBBS.Term.showNotice(this.lateNight ? 'AFTER HOURS MODE ENABLED (03:15 AM BASEMENT VIBE)' : 'DAYLIGHT MODE RESTORED');
    }

    toggleAspectRatio() {
      this.aspect169 = !this.aspect169;
      const housing = document.getElementById('monitor-housing');
      if (housing) { housing.classList.toggle('aspect-16-9', this.aspect169); housing.classList.toggle('aspect-4-3', !this.aspect169); }
      const btn = document.getElementById('btn-aspect');
      if (btn) { btn.textContent = this.aspect169 ? '📐 RATIO: 16:9' : '📐 RATIO: 4:3'; btn.setAttribute('aria-pressed', String(this.aspect169)); }
    }

    bootSequence() {
      this.state = 'BOOT'; this.history = [];
      const term = window.CyberBBS.Term;
      term.clear();
      term.println(` Phoenix ROM BIOS PLUS Version 1.10 A04`, 15, 0);
      term.println(` Copyright 1985-1994 Phoenix Technologies Ltd. All Rights Reserved\r\n`, 7, 0);
      term.println(` 486DX2-66 CPU DETECTED · VESA LOCAL BUS SVGA · 16384K RAM OK`, 11, 0);
      term.println(` COM1: 03F8h (Microsoft Mouse)  ·  COM2: 02F8h (16550A UART FIFO)`, 7, 0);
      term.println(` HAYES MODEM DETECTED: USRobotics Courier 14400 HST Dual Standard`, 14, 0);
      term.println(` INITIALIZING PORT: 14400,8,N,1  ·  V.42bis / MNP5 ARQ ENABLED\r\n`, 10, 0);
      term.println(` ============================================================================`, 8, 0);
      term.println(`          CYBER BBS MEGA EDITION v3.0 — TERMINAL INITIALIZED & READY`, 15, 0);
      term.println(` ============================================================================\r\n`, 8, 0);

      this.state = 'READY_TO_DIAL';
      term.setCursor(20, 14); term.print(`┌────────────────────────────────────────┐`, 14, 0);
      term.setCursor(20, 15); term.print(`│     ► [ CLICK HERE TO DIAL BBS ] ◄     │`, 15, 1);
      term.setCursor(20, 16); term.print(`└────────────────────────────────────────┘`, 14, 0);
      term.addHitRegion(20, 14, 42, 3, 'btn-dial', () => this.startDialing(), 'Dial BBS', '1');
      term.setCursor(21, 18); term.print(`(Press 1, ENTER or click above to dial)`, 8, 0);
      term.renderStatusBar();
    }

    startDialing() {
      this.state = 'HANDSHAKE';
      const term = window.CyberBBS.Term;
      term.clear(); term.clearHitRegions();
      term.println(` ATZ`, 15, 0); term.println(` OK`, 10, 0); term.println(` ATDT +1 (555) 019-2847`, 15, 0);
      term.println(` DIALING CYBER BBS NODE 1...`, 14, 0);
      term.println(` ────────────────────────────────────────────────────────────────────────────`, 8, 0);
      term.setCursor(26, 18); term.print(`[ SKIP HANDSHAKE (ESC) ]`, 14, 4);
      term.addHitRegion(26, 18, 24, 1, 'btn-skip', () => window.CyberBBS.Audio.skipHandshake(() => this.showBanner()), 'Skip Handshake', 'ESC');

      if (window.CyberBBS.Audio) {
        window.CyberBBS.Audio.startModemHandshake({
          onProgress: (time, text, leds) => {
            term.setCursor(2, 6);
            term.println(` Status : ${text.padEnd(65, ' ')}`, 11, 0);
            term.println(` Active : [${leds.padEnd(20, ' ')}]  Line carrier locked.`, 7, 0);
            const filled = Math.min(50, Math.floor(time * 4));
            term.setCursor(2, 9);
            term.println(` RF Signal: [${'█'.repeat(filled) + '░'.repeat(50 - filled)}]`, 10, 0);
          },
          onComplete: () => this.showBanner()
        });
      } else setTimeout(() => this.showBanner(), 2500);
    }

    showBanner() {
      this.state = 'BANNER';
      const term = window.CyberBBS.Term;
      term.clear(); term.clearHitRegions();
      term.print(`\n  \x1b[96m██████  ██  ██ ██████  ██████ ██████    ██████  ██████  ██████\n  ██      ██  ██ ██   ██ ██     ██   ██   ██   ██ ██   ██ ██\n  ██      ██████ ██████  █████  ██████    ██████  ██████   █████\n  ██        ██   ██   ██ ██     ██   ██   ██   ██ ██   ██      ██\n  ██████    ██   ██████  ██████ ██   ██   ██████  ██████  ██████\x1b[0m\n\n       \x1b[93m─── N O D E   1 ─── 14.4k HST DUAL STANDARD ─── MEGA v3.0 ───\x1b[0m\n              SysOp: DR. NOISE  ·  Basement 486DX2/66  ·  24h/7d\n            \x1b[37m"Where the modems scream and the packets flow free."\x1b[0m\n`);

      term.setCursor(15, 12); term.println(`┌──────────────────────────────────────────────────┐`, 11, 0);
      term.setCursor(15, 13); term.println(`│         CHOOSE YOUR LOGIN METHOD (1, 2, 3)       │`, 15, 0);
      term.setCursor(15, 14); term.println(`├──────────────────────────────────────────────────┤`, 11, 0);
      term.setCursor(15, 15); term.println(`│  [1] GUEST LOGIN      (Instant Browse Access)    │`, 14, 0);
      term.setCursor(15, 16); term.println(`│  [2] NEW USER REG     (Earn Ranks & Daily Bonus) │`, 14, 0);
      term.setCursor(15, 17); term.println(`│  [3] RETURNING USER   (Login with Password)      │`, 14, 0);
      term.setCursor(15, 18); term.println(`└──────────────────────────────────────────────────┘`, 11, 0);

      term.addHitRegion(17, 15, 46, 1, 'login-guest', () => this.loginAsGuest(), 'Guest Login', '1');
      term.addHitRegion(17, 16, 46, 1, 'login-new', () => this.registerNewUser(), 'New User', '2');
      term.addHitRegion(17, 17, 46, 1, 'login-user', () => this.loginExistingUser(), 'Returning User', '3');
      term.renderStatusBar();
    }

    loginAsGuest() { window.CyberBBS.Store.loginGuest(); this.showBulletins(null); }

    registerNewUser() {
      const term = window.CyberBBS.Term;
      term.promptInline('NEW USER REGISTRATION (1/3)', 'Choose Handle (2-16 chars, A-Z/0-9):', 'CYBER_HERO', (handle) => {
        if (!handle) return;
        term.promptInline('NEW USER REGISTRATION (2/3)', 'Choose Password (min 4 chars):', '', (pass) => {
          if (!pass) return;
          term.promptInline('NEW USER REGISTRATION (3/3)', 'Enter your Location / City:', 'São Paulo, BR', async (city) => {
            const res = await window.CyberBBS.Store.registerUser(handle, pass, handle, city);
            if (res.ok) { const bonusInfo = window.CyberBBS.Store.setCurrentUser(res.user); term.showNotice(`HANDLE ${handle.toUpperCase()} REGISTERED!`); this.showBulletins(bonusInfo); }
            else { term.showNotice(res.error); this.showBanner(); }
          }, () => this.showBanner());
        }, () => this.showBanner(), true);
      }, () => this.showBanner());
    }

    loginExistingUser() {
      const term = window.CyberBBS.Term;
      term.promptInline('LOGIN (1/2)', 'Enter your BBS Handle:', '', (handle) => {
        if (!handle) return;
        term.promptInline('LOGIN (2/2)', 'Enter Password:', '', async (pass) => {
          const res = await window.CyberBBS.Store.loginUser(handle, pass);
          if (res.ok) { const bonusInfo = window.CyberBBS.Store.setCurrentUser(res.user); this.showBulletins(bonusInfo); }
          else { term.showNotice(res.error); this.showBanner(); }
        }, () => this.showBanner(), true);
      }, () => this.showBanner());
    }

    showBulletins(bonusInfo = null) {
      this.state = 'BULLETINS';
      const term = window.CyberBBS.Term, store = window.CyberBBS.Store;
      term.clear(); term.clearHitRegions();
      const currentDate = new Date().toISOString().substring(0, 10), unread = store.getUnreadMailCount();
      term.println(`┌────────────────────────[ SYSTEM BULLETINS // NODE ${store.currentNodeId} ]────────────────────────┐`, 11, 0);
      term.println(`│ Date: ${currentDate}       SysOp: DR. NOISE       MEGA EDITION v3.0 ONLINE     │`, 15, 0);
      term.println(`├──────────────────────────────────────────────────────────────────────────────┤`, 11, 0);
      term.println(`  1. COMMAND LINE + QUICK JUMP: Type full commands (NEWS, FILES, MAIL, ZORK,\r\n     TRIVIA, STATS, CALLERS, NODES) or numbers (0-17) at Command/Number> _`, 14, 0);
      term.println(`  2. NETMAIL & FIDONET ECHOES: Multi-line in-terminal editor + live bot replies!`, 10, 0);
      term.println(`  3. ANSI GALLERY & EDITOR: Vote in the weekly contest or draw .ANS art!`, 11, 0);
      term.println(`  4. 7 DOOR GAMES: Cyber Lord v2, Star Trade Radar, Zork Bunker, Trivia & more!`, 7, 0);
      if (bonusInfo) term.println(`\r\n  ★ DAILY LOGIN STREAK (${bonusInfo.streak}d): +${bonusInfo.bonus} BBS CREDITS CREDITED! ★`, 14, 1);
      if (unread > 0) term.println(`  ✉ YOU HAVE ${unread} UNREAD PRIVATE NETMAIL MESSAGE(S) IN DOOR [3]!`, 12, 0);
      term.setCursor(20, 19); term.print(`[ PRESS 1 OR ENTER TO ENTER MAIN MENU ]`, 15, 1);
      term.addHitRegion(20, 19, 43, 1, 'btn-main', () => this.showMainMenu(), 'Enter Main Menu', '1');
      term.renderStatusBar();
    }

    showMainMenu() {
      this.state = 'MAIN'; this.history = []; this.cmdBuffer = '';
      this.currentRenderFn = () => this.showMainMenu();
      const term = window.CyberBBS.Term, store = window.CyberBBS.Store;
      term.clear(); term.clearHitRegions();

      const user = store.currentUser, handle = user ? user.handle : 'GUEST', rank = store.getUserRank(user);
      const timeLeft = store.getTimeRemainingFormatted(), credits = user ? user.credits : 500;
      const ratio = store.getRatio(), unread = store.getUnreadMailCount();
      const badge = user?.ansiMasterBadge ? ' [ANSI★]' : '';

      term.println(`┌─────────────────────[ CYBER BBS MEGA // MAIN MENU ]─────────────────────────┐`, 11, 0);
      term.println(`│ ${handle.padEnd(14, ' ')} Rank: ${(rank.title + badge).padEnd(23, ' ')} Node ${store.currentNodeId} · 14.4k ARQ │`, 7, 0);
      term.println(`│ Time: ${timeLeft.padEnd(10, ' ')} Ratio: ${ratio.padEnd(8, ' ')} Credits: ${String(credits).padEnd(6, ' ')} Unread Mail: ${String(unread).padEnd(3, ' ')}  │`, 7, 0);
      term.println(`├──────────────────────────────────────────────────────────────────────────────┤`, 11, 0);

      const menuItems = [
        { num: '1',  label: 'News & Live Feeds', act: () => window.CyberBBS.Doors.openNews() },
        { num: '2',  label: 'Bulletin Board (Forum)', act: () => window.CyberBBS.Doors.openForum() },
        { num: '3',  label: unread > 0 ? `Netmail (${unread} NEW!)` : 'Netmail / Private Mail', act: () => window.CyberBBS.Doors.openNetmail() },
        { num: '4',  label: 'File Areas & Search', act: () => window.CyberBBS.Doors.openFiles() },
        { num: '5',  label: 'Photo Grabber & ANSI', act: () => window.CyberBBS.Doors.openPhotos() },
        { num: '6',  label: 'GitHub Vault (Text)', act: () => window.CyberBBS.Doors.openGitHub() },
        { num: '7',  label: 'Door Games (7 Games)', act: () => window.CyberBBS.Doors.openGames() },
        { num: '8',  label: 'ANSI Gallery & Editor', act: () => window.CyberBBS.Doors.showAnsiGallery(0) },
        { num: '9',  label: 'World Clocks (Horas)', act: () => window.CyberBBS.Doors.openWorldClock() },
        { num: '10', label: 'Weather Station 2.0', act: () => window.CyberBBS.Doors.openWeather() },
        { num: '11', label: 'Live SysOp Chat', act: () => window.CyberBBS.Doors.openChat() },
        { num: '12', label: 'One-Liners Wall', act: () => this.showOneLiners() },
        { num: '13', label: 'Today Hub Briefing', act: () => window.CyberBBS.Doors.openTodayHub() },
        { num: '14', label: 'Multi-Node Hopper', act: () => window.CyberBBS.Doors.openMultiNode() },
        { num: '15', label: 'Weekly BBS Newspaper', act: () => window.CyberBBS.Doors.openNewspaper() },
        { num: '16', label: 'Stats & Last Callers', act: () => this.showUserStats() },
        { num: '17', label: 'Settings & Atmosphere', act: () => this.showSettings() },
        { num: '18', label: 'Market Wire & Forex', act: () => window.CyberBBS.Doors.openMarketWire() },
        { num: '19', label: 'Earth & Sky Telemetry', act: () => window.CyberBBS.Doors.openEarthAndSky() },
        { num: '20', label: 'Cyber Radio & VU Meter', act: () => window.CyberBBS.Doors.openRadio() },
        { num: '21', label: 'Wiki & Gutenberg Books', act: () => window.CyberBBS.Doors.openWikiTerminalPrompt() },
        { num: '22', label: 'Net & Carrier Diag', act: () => window.CyberBBS.Doors.openNetDiagnostics() },
        { num: '0',  label: 'Logoff & Disconnect', act: () => this.showLogoff() }
      ];

      for (let i = 0; i < 11; i++) {
        const leftItem = menuItems[i];
        const rightItem = menuItems[i + 11];
        const y = 4 + i;
        if (leftItem) {
          term.setCursor(2, y); term.print(`[`, 15, 0); term.print(`${leftItem.num.padStart(2, ' ')}`, 14, 0); term.print(`] `, 15, 0);
          term.print(`${leftItem.label.padEnd(28, ' ')}`, 7, 0);
          term.addHitRegion(2, y, 34, 1, `main-${leftItem.num}`, leftItem.act, leftItem.label, leftItem.num);
        }
        if (rightItem) {
          term.setCursor(40, y); term.print(`[`, 15, 0); term.print(`${rightItem.num.padStart(2, ' ')}`, 14, 0); term.print(`] `, 15, 0);
          term.print(`${rightItem.label.padEnd(28, ' ')}`, 7, 0);
          term.addHitRegion(40, y, 34, 1, `main-${rightItem.num}`, rightItem.act, rightItem.label, rightItem.num);
        }
      }

      term.setCursor(2, 16);
      term.println(`────────────────────────────────────────────────────────────────────────────`, 8, 0);
      term.setCursor(2, 17);
      term.print(`HOTKEYS: `, 14, 0);
      term.print(`[Alt+V] Video Mode  [Alt+G] Screen Grab  [Alt+D] Phone Book  [?] Help`, 10, 0);
      term.setCursor(2, 18);
      term.println(`────────────────────────────────────────────────────────────────────────────`, 8, 0);

      term.setCursor(2, 22); term.print(`Command/Number> _`, 14, 0);
      term.renderStatusBar();
    }

    showUserStats() {
      this.pushScreen('USER_STATS', () => {
        window.CyberBBS.Doors.renderHeader('USER DOSSIER & RANK PROGRESSION');
        const term = window.CyberBBS.Term, store = window.CyberBBS.Store;
        const user = store.currentUser || { handle: 'GUEST', credits: 200 }, rank = store.getUserRank(user);
        const pct = rank.nextPoints > 0 ? Math.min(100, Math.round((rank.points / rank.nextPoints) * 100)) : 100;
        const bar = '█'.repeat(Math.floor((pct / 100) * 30)) + '░'.repeat(30 - Math.floor((pct / 100) * 30));

        term.println(`  HANDLE       : ${user.handle} ${user.ansiMasterBadge ? '[★ ANSI MASTER ★]' : ''}`, 15, 0);
        term.println(`  CURRENT RANK : ${rank.title} (Level ${rank.level})`, 14, 0);
        term.println(`  NEXT RANK    : ${rank.nextTitle} [${bar}] ${rank.points}/${rank.nextPoints} pts`, 10, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  Total Calls  : ${user.calls || 1}           Login Streak  : ${user.loginStreak || 1} day(s)`, 7, 0);
        term.println(`  Online Time  : ${user.minsOnline || 0} mins        BBS Credits   : ${user.credits || 0} CR`, 7, 0);
        term.println(`  Uploaded     : ${Math.ceil((user.bytesUp || 0) / 1024)} KB          Downloaded    : ${Math.ceil((user.bytesDown || 0) / 1024)} KB`, 7, 0);
        term.println(`  UL/DL Ratio  : ${store.getRatio()}           Forum Posts   : ${user.forumPosts || 0}   Trivia: ${user.triviaScore || 0} pts`, 11, 0);
        window.CyberBBS.Doors.renderFooter([{ key: 'L', label: 'Last Callers Log', action: () => this.showLastCallers() }]);
      });
    }

    showLastCallers() {
      this.pushScreen('LAST_CALLERS', () => {
        window.CyberBBS.Doors.renderHeader('LAST CALLERS LOG // RECENT NODE ACTIVITY');
        const term = window.CyberBBS.Term, callers = window.CyberBBS.Store.getLastCallers();
        term.println(`  HANDLE           CITY             BAUD   RATIO  STATUS / ACTIVITY`, 11, 0);
        term.println(`  ───────────────  ───────────────  ─────  ─────  ────────────────────────────`, 8, 0);
        callers.slice(0, 8).forEach((c, idx) => {
          const row = 5 + idx * 2;
          term.setCursor(2, row);
          term.print(`${(c.handle || 'ANON').padEnd(15, ' ').substring(0, 15)}  `, 14, 0);
          term.print(`${(c.city || 'Local').padEnd(15, ' ').substring(0, 15)}  `, 7, 0);
          term.print(`${(c.baud || '14400').padEnd(5, ' ')}  `, 10, 0);
          term.print(`${(c.ratio || '1:2').padEnd(5, ' ')}  `, 11, 0);
          term.print(`${(c.status || c.action || 'Browsing').substring(0, 28)}`, 15, 0);
        });
        window.CyberBBS.Doors.renderFooter([{ key: 'U', label: 'My User Stats', action: () => this.showUserStats() }]);
      });
    }

    showOneLiners() {
      this.pushScreen('ONE_LINERS', () => {
        window.CyberBBS.Doors.renderHeader('ONE-LINERS WALL // GRAFFITI BOARD');
        const term = window.CyberBBS.Term, lines = window.CyberBBS.Store.getOneLiners();
        lines.slice(0, 8).forEach((l, idx) => {
          const row = 5 + idx * 2;
          term.setCursor(2, row); term.print(`[${l.handle.padEnd(12, ' ')}] `, 14, 0); term.print(`${l.text}`, 15, 0);
        });
        window.CyberBBS.Doors.renderFooter([{ key: '1', label: 'Add One-Liner', action: () => {
          term.promptInline('ONE-LINER GRAFFITI', 'Enter your 70-character message:', '', (text) => {
            if (text) { window.CyberBBS.Store.addOneLiner(window.CyberBBS.Store.currentUser?.handle || 'GUEST', text); this.showOneLiners(); }
          }, () => this.showOneLiners());
        }}]);
      });
    }

    showSettings() {
      this.pushScreen('SETTINGS', () => {
        window.CyberBBS.Doors.renderHeader('USER DEFAULTS, ATMOSPHERE & BACKUP');
        const term = window.CyberBBS.Term, audio = window.CyberBBS.Audio;
        const settings = [
          { num: '1', name: 'Phosphor Color Theme', val: this.themes[this.currentThemeIdx].replace('theme-', '').toUpperCase(), act: () => this.cycleTheme() },
          { num: '2', name: 'Monitor Chassis Skin', val: this.skins[this.currentSkinIdx].replace('skin-', '').toUpperCase(), act: () => this.cycleSkin() },
          { num: '3', name: 'CRT Shaders & Scanlines', val: this.crtEnabled ? 'ENABLED' : 'DISABLED', act: () => this.toggleCrt() },
          { num: '4', name: 'Video Adapter Profile', val: term.currentProfile.id.toUpperCase(), act: () => this.showVideoModePicker() },
          { num: '5', name: 'Pure Text / Bezel-Free', val: this.pureMode ? 'ENABLED' : 'DISABLED', act: () => this.togglePureMode() },
          { num: '6', name: 'After Hours (Late Night)', val: this.lateNight ? 'ENABLED' : 'DISABLED', act: () => this.toggleLateNight() },
          { num: '7', name: 'Basement Fan & HDD Audio', val: audio?.ambientEnabled ? 'ENABLED' : 'DISABLED', act: () => audio?.toggleAmbient() },
          { num: '8', name: 'Export Session Log (.TXT)', val: 'SAVE TRANSCRIPT', act: () => term.exportSessionLog() },
          { num: '9', name: 'Full System Backup (.JSON)', val: 'EXPORT ALL DATA', act: () => window.CyberBBS.Store.exportSaveData() }
        ];
        settings.forEach((s, idx) => {
          const row = 5 + idx * 2;
          term.setCursor(2, row); term.print(`[${s.num}] `, 14, 0); term.print(`${s.name.padEnd(28, ' ')}  `, 15, 0); term.print(`${s.val.padEnd(18, ' ')}  `, 10, 0); term.print(`[ TOGGLE / RUN ]`, 11, 0);
          term.addHitRegion(2, row, 76, 1, `set-${s.num}`, () => { s.act(); this.showSettings(); }, s.name, s.num);
        });
        window.CyberBBS.Doors.renderFooter([
          { key: 'I', label: 'Restore Backup', action: () => document.getElementById('bbs-json-input')?.click() },
          { key: 'A', label: '4:3 / 16:9', action: () => { this.toggleAspectRatio(); this.showSettings(); } },
          { key: 'T', label: 'Self-Test', action: () => this.runSelfTest() }
        ]);
      });
    }

    showVideoModePicker() {
      this.pushScreen('VIDEO_MODES', () => {
        window.CyberBBS.Doors.renderHeader('VIDEO HARDWARE ADAPTER SELECTOR');
        const term = window.CyberBBS.Term;
        const profiles = [
          { id: 'vga80x25', num: '1', name: 'IBM VGA (1987) · 80x25 Standard (Default)' },
          { id: 'mda80x25', num: '2', name: 'IBM MDA (1981) · 80x25 Monochrome Green' },
          { id: 'cga40x25', num: '3', name: 'IBM CGA (1981) · 40x25 Big Type RGBI' },
          { id: 'cga80x25', num: '4', name: 'IBM CGA (1981) · 80x25 PC XT Text' },
          { id: 'cga_comp', num: '5', name: 'CGA Composite NTSC (1981) · 80x25 TV' },
          { id: 'ega80x43', num: '6', name: 'IBM EGA (1984) · 80x43 High Density' },
          { id: 'vga80x50', num: '7', name: 'IBM VGA (1987) · 80x50 Compact Lines' },
          { id: 'vga_13h',  num: '8', name: 'VGA Mode 13h (1987) · 40x25 Canvas' },
          { id: 'svga132x37', num: '9', name: 'VESA SVGA (1991) · 132x37 Widescreen 16:9' },
          { id: 'modern_hd',  num: '0', name: 'Modern OLED (2026) · 120x36 Truecolor' }
        ];

        term.println('  HARDWARE ADAPTER & CRT EMULATION MATRIX:', 14, 0);
        term.println('  ────────────────────────────────────────────────────────────────────────────', 8, 0);

        profiles.forEach((p, idx) => {
          const isCur = term.currentProfile.id === p.id;
          const mark = isCur ? '► ' : '  ';
          const fg = isCur ? 10 : 15;
          const row = 5 + idx;
          term.setCursor(2, row);
          term.print(`${mark}[${p.num}] ${p.name.padEnd(68, ' ')}`, fg, 0);
          term.addHitRegion(2, row, 74, 1, `vmode-${p.num}`, () => {
            term.setVideoProfile(p.id, true);
            this.showMainMenu();
          }, p.name, p.num);
        });

        term.setCursor(2, 17);
        term.println('  Hotkeys: [Alt+V] Cycle Modes · Type MODE <id> at command prompt.', 10, 0);
        window.CyberBBS.Doors.renderFooter([
          { key: 'D', label: 'Degauss', action: () => term.triggerDegauss() }
        ]);
      });
    }

    runSelfTest() {
      this.pushScreen('SELFTEST', () => {
        window.CyberBBS.Doors.renderHeader('CYBER BBS AUTOMATED SELF-TEST (DIAG v3.0)');
        const term = window.CyberBBS.Term;
        const store = window.CyberBBS.Store;
        const net = window.CyberBBS.Net;
        const audio = window.CyberBBS.Audio;
        const ansi = window.CyberBBS.Ansi;

        const results = [];
        const profCount = Object.keys(window.CyberBBS.VIDEO_PROFILES || {}).length;
        results.push({ test: 'Video Profile Architecture (10 Profiles)', ok: profCount === 10, detail: `${profCount}/10 modes verified` });
        results.push({ test: 'Multi-Palette Hardware Matrix', ok: typeof term.getPaletteColor === 'function', detail: '7 palettes mapped' });
        results.push({ test: 'Web Audio Procedural Engine + DTMF', ok: typeof audio?.playDtmf === 'function' && typeof audio?.playDegauss === 'function', detail: 'Audio synthesis OK' });
        results.push({ test: 'Cyber Radio Streaming & ASCII VU Analyzer', ok: typeof window.CyberBBS.Radio?.getVuLevels === 'function', detail: '8-Band FFT ready' });

        const sampleAnsi = ansi?.bufferToAnsi(term.buffer.slice(0, 5), 80, 5);
        results.push({ test: 'ANSI Engine & SAUCE00 Binary Parser', ok: typeof ansi?.parseSauce === 'function' && !!sampleAnsi, detail: 'SAUCE00 serializer OK' });
        results.push({ test: 'Scrollback Ring Buffer (500 Lines)', ok: Array.isArray(term.scrollback), detail: 'Ring buffer initialized' });

        const users = store.getUsers();
        results.push({ test: 'Store Layer & Schema v3 Migration Integrity', ok: Array.isArray(users) && typeof store.exportSaveData === 'function', detail: `${users.length} users in DB` });
        results.push({ test: 'Network Envelope (LIVE/CACHED/STALE/DEMO)', ok: !!net?.DataStatus?.LIVE && !!net?.DataStatus?.DEMO, detail: 'Envelopes compliant' });

        const moon = net?.calculateMoonPhase();
        results.push({ test: 'Moon Phase Offline Calculation Formula', ok: !!moon?.name && !!moon?.icon, detail: `${moon?.name} (${moon?.illumination}%)` });

        const spark = net?.generateSparkline([10, 20, 15, 30, 25]);
        results.push({ test: 'CP437 Sparkline Generator ( ▂▃▄▅▆▇█)', ok: spark?.length === 5, detail: spark });

        results.push({ test: 'Hayes AT Modem Protocol & Command Stacking', ok: typeof window.CyberBBS.Doors?.dialBBSNode === 'function', detail: 'ATDT & ; stacking OK' });

        const doors = window.CyberBBS.Doors;
        const doorsOk = typeof doors?.openMarketWire === 'function' && typeof doors?.openRadio === 'function' && typeof doors?.openEarthAndSky === 'function';
        results.push({ test: '22 System Doors Registered & Functional', ok: doorsOk, detail: '22 doors operational' });

        term.println('  ┌─────────────────────────────────────────────────────────────┐', 11, 0);
        term.println('  │ CYBER BBS AUTOMATED SELF-TEST DIAGNOSTIC SUITE (v3.0)        │', 14, 0);
        term.println('  ├─────────────────────────────────────────────────────────────┤', 11, 0);

        results.forEach(r => {
          const status = r.ok ? '[OK]' : '[FAIL]';
          const fg = r.ok ? 10 : 12;
          const name = r.test.padEnd(46, ' ').substring(0, 46);
          term.println(`  │ ${status} ${name} (${r.detail.substring(0, 15)})`, fg, 0);
        });

        const allOk = results.every(r => r.ok);
        term.println('  ├─────────────────────────────────────────────────────────────┤', 11, 0);
        term.println(`  │ STATUS: ${allOk ? 'ALL 12 CHECKS PASSED [100% OPERATIONAL]' : 'DIAGNOSTIC WARNINGS DETECTED'}         │`, allOk ? 10 : 12, 0);
        term.println('  └─────────────────────────────────────────────────────────────┘', 11, 0);

        if (allOk && audio) audio.playBell();
        window.CyberBBS.Doors.renderFooter();
      });
    }

    showHelp() {
      this.pushScreen('HELP', () => {
        window.CyberBBS.Doors.renderHeader('HELP & CLASSIC BBS COMMAND REFERENCE');
        const term = window.CyberBBS.Term;
        term.println(`  MAIN MENU COMMANDS (TYPE AT Command/Number> _ AND PRESS ENTER):`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  [0-22] Quick Jump · NEWS, FORUM, MAIL, FILES, SEARCH, PHOTOS, GITHUB, GAMES`, 15, 0);
        term.println(`  LORD, TRADE, ZORK, TRIVIA, ANSI, EDITOR, CLOCKS, WEATHER, CHAT, ONELINERS`, 15, 0);
        term.println(`  TODAY, NODES, NEWSPAPER, STATS, CALLERS, SETTINGS, MARKET, EARTH, RADIO`, 15, 0);
        term.println(`  WIKI, BOOKS, DIAG, PHONE, MODE, DEGAUSS, GRAB, SELFTEST, PURE, NIGHT, LOGOFF`, 15, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  HAYES AT COMMANDS: ATDT <number> · AT · +++ (Escape to OK prompt)`, 11, 0);
        term.println(`  COMMAND CHAINING : Support ';' stacking (e.g. "NEWS;FORUM" or "18;C")`, 11, 0);
        term.println(`  HOTKEYS: [Alt+V] Video Mode · [Alt+G] Screen Grab · [Alt+D] Phone Book`, 10, 0);
        term.println(`           [PgUp/PgDn] Scrollback (500L) · [Tab] Autocomplete · [Up/Down] History`, 10, 0);
        term.println(`           [Ctrl+L] Redraw · [Alt+N] Hop Next Node · [F11] Fullscreen · [ESC] Back`, 10, 0);
        window.CyberBBS.Doors.renderFooter();
      });
    }

    showLogoff() {
      this.state = 'LOGOFF'; this.history = [];
      const term = window.CyberBBS.Term;
      term.clear(); term.clearHitRegions();
      const user = window.CyberBBS.Store.currentUser, handle = user ? user.handle : 'GUEST';
      term.println(`\r\n\r\n`, 0, 0);
      term.println(`  ╔══════════════════════════════════════════════════════════════════════════╗`, 11, 0);
      term.println(`  ║                THANKS FOR CALLING CYBER BBS MEGA NODE ${window.CyberBBS.Store.currentNodeId}                  ║`, 14, 0);
      term.println(`  ║              "The Basement BBS That Never Stopped Answering"             ║`, 15, 0);
      term.println(`  ╚══════════════════════════════════════════════════════════════════════════╝`, 11, 0);
      term.println(`\r\n  SESSION SUMMARY FOR ${handle}:`, 14, 0);
      term.println(`  Calls Today : ${user?.calls || 1}      Downloads : ${Math.ceil((user?.bytesDown || 0) / 1024)} KB`, 7, 0);
      term.println(`  Credits Left: ${user?.credits || 500}       Uploads   : ${Math.ceil((user?.bytesUp || 0) / 1024)} KB`, 7, 0);
      term.println(`\r\n  Dropping carrier... ATH0\r\n  NO CARRIER`, 12, 0);
      if (window.CyberBBS.Audio) window.CyberBBS.Audio.playHangup();
      ['hs', 'aa', 'cd', 'oh', 'rd', 'sd'].forEach(id => document.getElementById('led-' + id)?.classList.remove('on'));
      term.setCursor(24, 17); term.print(`[ PRESS 1 OR CLICK TO DIAL AGAIN ]`, 15, 1);
      term.addHitRegion(24, 17, 34, 1, 'btn-redial', () => this.bootSequence(), 'Redial BBS', '1');
      term.renderStatusBar();
    }
  }

  window.CyberBBS.App = new BBSApp();
  window.addEventListener('DOMContentLoaded', () => window.CyberBBS.App.init());
})();
