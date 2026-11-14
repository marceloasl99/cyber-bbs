/**
 * CYBER BBS — Functional Real Doors
 * Enhanced with In-Terminal Interactive Typing (Zero Pop-ups),
 * Navigation History Stack (ESC always goes back cleanly),
 * Real Live RSS Feeds of Today, Bulletin Board / Forum JSON Engine,
 * Pure-Text GitHub Vault, and World Clocks (Horas Mundiais).
 */
(function() {
  window.CyberBBS = window.CyberBBS || {};

  class BBSDoors {
    constructor() {
      this.currentDoor = null;
      this.pageIndex = 0;
      this.items = [];
      this.activeTimer = null;
    }

    stopActiveTimer() {
      if (this.activeTimer) {
        clearInterval(this.activeTimer);
        this.activeTimer = null;
      }
    }

    renderHeader(title) {
      this.stopActiveTimer();
      const term = window.CyberBBS.Term;
      term.clear();
      term.clearHitRegions();

      const user = window.CyberBBS.Store.currentUser;
      const handle = user ? user.handle : 'GUEST';
      const credits = user ? user.credits : 500;

      const titleStr = ` CYBER BBS // ${title.toUpperCase()} `;
      const leftDashes = Math.max(1, Math.floor((76 - titleStr.length) / 2));
      const rightDashes = Math.max(1, 76 - titleStr.length - leftDashes);
      const topBar = `┌${'─'.repeat(leftDashes)}[${titleStr}]${'─'.repeat(rightDashes)}┐`;

      const infoLeft = ` User: ${handle.substring(0, 12)} · Level: MEMBER`;
      const infoRight = `Credits: ${credits} · Node 1 · 14.4k `;
      const midSpaces = Math.max(1, 78 - infoLeft.length - infoRight.length);
      const midBar = `│${infoLeft}${' '.repeat(midSpaces)}${infoRight}│`;

      term.println(topBar, 11, 0);
      term.println(midBar, 7, 0);
      term.println(`├${'─'.repeat(78)}┤`, 11, 0);
    }

    renderFooter(actions = []) {
      const term = window.CyberBBS.Term;
      term.setCursor(0, 22);
      term.println(`├──────────────────────────────────────────────────────────────────────────────┤`, 11, 0);

      let col = 1;
      actions.forEach(a => {
        const label = `[${a.key}] ${a.label}  `;
        term.print(`[`, 15, 0);
        term.print(`${a.key}`, 14, 0);
        term.print(`] ${a.label}  `, 7, 0);

        term.addHitRegion(col, 23, label.length, 1, `action-${a.key}`, a.action, a.label, a.key);
        col += label.length;
      });

      // Back action via ESC / Q
      const backLabel = `[ESC] Back`;
      term.print(`[`, 15, 0);
      term.print(`ESC`, 12, 0);
      term.print(`] Back`, 7, 0);
      term.addHitRegion(col, 23, backLabel.length, 1, 'action-back', () => window.CyberBBS.App.goBack(), 'Back', 'ESC');

      term.renderStatusBar();
    }

    // ==========================================
    // 1. [N] NEWS & LIVE WIRES (REAL FEEDS OF TODAY)
    // ==========================================
    openNews() {
      window.CyberBBS.App.pushScreen('NEWS_CATS', () => this.renderNewsCategories());
    }

    renderNewsCategories() {
      this.renderHeader('NEWS & LIVE WIRES // SELECT CATEGORY');
      const term = window.CyberBBS.Term;

      const cats = [
        { num: 1, name: 'Technology & Open Source (Hacker News)', url: 'https://hnrss.org/frontpage', src: 'HACKER NEWS' },
        { num: 2, name: 'BBC World News International', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', src: 'BBC WORLD' },
        { num: 3, name: 'Slashdot: News for Nerds & Computing', url: 'https://rss.slashdot.org/Slashdot/slashdotMain', src: 'SLASHDOT' },
        { num: 4, name: 'NASA Space & Science Releases', url: 'https://www.nasa.gov/news-release/feed/', src: 'NASA NEWS' },
        { num: 5, name: 'Ars Technica Lab & IT Analysis', url: 'https://feeds.arstechnica.com/arstechnica/index', src: 'ARS TECHNICA' },
        { num: 6, name: 'Retro Computing Archive Digest (1993-1996)', url: null, src: 'ARCHIVE DIGEST' }
      ];

      term.println(`  #  WIRE CATEGORY                               SOURCE FEED`, 11, 0);
      term.println(`  ─  ──────────────────────────────────────────  ─────────────────────────────`, 8, 0);

      cats.forEach((c, idx) => {
        const row = 5 + idx * 2;
        term.setCursor(2, row);
        term.print(`[${c.num}] `, 14, 0);
        term.print(`${c.name.padEnd(44, ' ')} `, 15, 0);
        term.print(`${c.src}`, 10, 0);

        term.addHitRegion(2, row, 76, 1, `newscat-${c.num}`, () => this.loadNewsCategory(c), c.name, c.num);
      });

      term.setCursor(2, 19);
      term.print(`Type number (1-6) or click to open category. [ESC] Main Menu.`, 14, 0);

      this.renderFooter();
    }

    async loadNewsCategory(cat) {
      window.CyberBBS.App.pushScreen(`NEWS_LIST_${cat.src}`, async () => {
        this.renderHeader(`NEWS // ${cat.src}`);
        const term = window.CyberBBS.Term;
        term.println(`\r\n  Querying live satellite link for ${cat.name}...`, 14, 0);
        term.println(`  Retrieving real current headlines from today...`, 8, 0);

        const net = window.CyberBBS.Net;
        let res;
        if (cat.url) {
          res = await net.fetchRssFeed(cat.url, cat.src);
        } else {
          res = { ok: true, items: net.archiveDigest, isLive: false };
        }

        this.items = res.items || [];
        this.pageIndex = 0;
        this.renderNewsList(cat.src);
      });
    }

    renderNewsList(sourceLabel) {
      this.renderHeader(`NEWS // ${sourceLabel} (LIVE TODAY)`);
      const term = window.CyberBBS.Term;
      const start = this.pageIndex * 7;
      const slice = this.items.slice(start, start + 7);

      term.println(`  #   DATE & TIME       HEADLINE (TODAY'S WIRES)`, 11, 0);
      term.println(`  ──  ────────────────  ──────────────────────────────────────────────────────`, 8, 0);

      slice.forEach((item, idx) => {
        const row = 5 + idx * 2;
        const num = idx + 1;
        const date = (item.date || '').padEnd(16, ' ').substring(0, 16);
        const title = (item.title || '').padEnd(54, ' ').substring(0, 54);

        term.setCursor(2, row);
        term.print(`[${num}] `, 14, 0);
        term.print(`${date}  `, 10, 0);
        term.print(`${title}`, 15, 0);

        term.addHitRegion(2, row, 76, 1, `news-${num}`, () => this.readNewsItem(item, sourceLabel), title, num);
      });

      term.setCursor(2, 20);
      term.print(`Type number (1-${slice.length}) to read article directly.`, 14, 0);

      this.renderFooter([
        { key: 'N', label: 'Next Page', action: () => { if ((this.pageIndex + 1) * 7 < this.items.length) { this.pageIndex++; this.renderNewsList(sourceLabel); } } },
        { key: 'P', label: 'Prev Page', action: () => { if (this.pageIndex > 0) { this.pageIndex--; this.renderNewsList(sourceLabel); } } }
      ]);
    }

    readNewsItem(item, sourceLabel) {
      window.CyberBBS.App.pushScreen('NEWS_DETAIL', () => {
        this.renderHeader('NEWS // DISPATCH DETAIL');
        const term = window.CyberBBS.Term;

        term.println(`\r\n  HEADLINE : ${item.title}`, 15, 0);
        term.println(`  SOURCE   : ${item.source}   DATE: ${item.date}`, 11, 0);
        term.println(`  LINK     : ${item.link || 'Internal Archive'}`, 8, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);

        const words = (item.summary || item.title).split(' ');
        let line = '  ';
        words.forEach(w => {
          if (line.length + w.length > 74) {
            term.println(line, 7, 0);
            line = '  ' + w + ' ';
          } else {
            line += w + ' ';
          }
        });
        if (line.trim().length > 0) term.println(line, 7, 0);

        this.renderFooter([
          { key: '1', label: 'Back to List', action: () => window.CyberBBS.App.goBack() },
          { key: '2', label: 'Open in Browser', action: () => { if (item.link) window.open(item.link, '_blank'); } },
          { key: '3', label: 'Save as .TXT', action: () => {
            const blob = new Blob([`${item.title}\r\nDate: ${item.date}\r\nSource: ${item.source}\r\n\r\n${item.summary}\r\n`], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'NEWS_ARTICLE.TXT'; a.click();
            URL.revokeObjectURL(url);
            term.showNotice('ARTICLE SAVED AS NEWS_ARTICLE.TXT');
          }}
        ]);
      });
    }

    // ==========================================
    // 2. [B] BULLETIN BOARD / FORUM (JSON ENGINE)
    // ==========================================
    openForum() {
      window.CyberBBS.App.pushScreen('FORUM_CATEGORIES', () => this.renderForumCategories());
    }

    renderForumCategories() {
      this.renderHeader('BULLETIN BOARD // INTERNET FORUMS (JSON DATABASE)');
      const term = window.CyberBBS.Term;

      const store = window.CyberBBS.Store;
      const categories = store.getForumCategories();

      term.println(`  #  BOARD CATEGORY                   THREADS  DESCRIPTION`, 11, 0);
      term.println(`  ─  ───────────────────────────────  ───────  ───────────────────────────────`, 8, 0);

      categories.forEach((cat, idx) => {
        const row = 5 + idx * 2;
        const count = store.getForumThreads(cat.id).length;

        term.setCursor(2, row);
        term.print(`[${cat.num}] `, 14, 0);
        term.print(`${cat.title.padEnd(31, ' ')}  `, 15, 0);
        term.print(`${count.toString().padEnd(7, ' ')}  `, 10, 0);
        term.print(`${cat.desc.substring(0, 31)}`, 7, 0);

        term.addHitRegion(2, row, 76, 1, `forum-cat-${cat.num}`, () => this.openForumCategory(cat), cat.title, cat.num);
      });

      term.setCursor(2, 19);
      term.print(`Type number (1-${categories.length}) or use arrows+Enter to open board.`, 14, 0);

      this.renderFooter([
        { key: 'E', label: 'Export JSON', action: () => {
          store.exportForumJson();
          term.showNotice('BULLETIN_BOARD_FORUM.JSON EXPORTED!');
        }},
        { key: 'I', label: 'Import JSON', action: () => {
          term.promptInline('IMPORT FORUM JSON', 'Paste JSON text:', '', (input) => {
            if (input) {
              const res = store.importForumJson(input);
              if (res.ok) {
                term.showNotice(res.message);
                this.renderForumCategories();
              } else {
                term.showNotice(res.error);
              }
            }
          }, () => this.renderForumCategories());
        }}
      ]);
    }

    openForumCategory(cat) {
      window.CyberBBS.App.pushScreen(`FORUM_CAT_${cat.id}`, () => this.renderForumCategoryThreads(cat));
    }

    renderForumCategoryThreads(cat) {
      this.renderHeader(`FORUM // ${cat.title}`);
      const term = window.CyberBBS.Term;

      const store = window.CyberBBS.Store;
      const threads = store.getForumThreads(cat.id);

      term.println(`  #   REPLIES  AUTHOR           TITLE / TOPIC`, 11, 0);
      term.println(`  ──  ───────  ───────────────  ──────────────────────────────────────────────`, 8, 0);

      if (threads.length === 0) {
        term.println(`\r\n  NO THREADS IN THIS BOARD YET. PRESS [N] TO CREATE THE FIRST ONE!`, 14, 0);
      } else {
        threads.slice(0, 7).forEach((t, idx) => {
          const row = 5 + idx * 2;
          const num = idx + 1;
          const replies = `${(t.posts?.length || 1) - 1} rpls`.padEnd(7, ' ');
          const author = (t.author || 'ANON').padEnd(15, ' ').substring(0, 15);
          const tagsStr = t.tags && t.tags.length > 0 ? `[${t.tags.join(',')}] ` : '';
          const title = (tagsStr + t.title).padEnd(46, ' ').substring(0, 46);

          term.setCursor(2, row);
          term.print(`[${num}] `, 14, 0);
          term.print(`${replies}  `, 10, 0);
          term.print(`${author}  `, 7, 0);
          term.print(`${title}`, 15, 0);

          term.addHitRegion(2, row, 76, 1, `thread-${num}`, () => this.readForumThread(t, cat), t.title, num);
        });
      }

      term.setCursor(2, 20);
      term.print(`Type number (1-${Math.min(7, threads.length)}) to read thread. [ESC] Back.`, 14, 0);

      this.renderFooter([
        { key: 'N', label: 'New Thread', action: () => this.createForumThread(cat) }
      ]);
    }

    readForumThread(thread, cat) {
      window.CyberBBS.App.pushScreen(`FORUM_THREAD_${thread.id}`, () => {
        this.renderHeader(`FORUM // THREAD #${thread.id}`);
        const term = window.CyberBBS.Term;

        term.println(`\r\n  TITLE   : ${thread.title}`, 15, 0);
        term.println(`  BOARD   : ${cat.title}    TAGS: [${(thread.tags || []).join(', ')}]`, 11, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);

        (thread.posts || []).slice(0, 4).forEach((p) => {
          const badge = p.role === 'SYSOP' ? '[SYSOP]' : '[MEMBER]';
          term.println(`  #${p.postNum} by ${p.author} ${badge} on ${p.date}:`, 14, 0);

          const lines = p.body.split('\n');
          lines.slice(0, 2).forEach(l => {
            term.println(`    ${l.trim()}`, 7, 0);
          });
          term.println(`  · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · `, 8, 0);
        });

        this.renderFooter([
          { key: '1', label: 'Reply to Thread', action: () => this.replyToForumThread(thread, cat) },
          { key: '2', label: 'Back to Threads', action: () => window.CyberBBS.App.goBack() }
        ]);
      });
    }

    createForumThread(cat) {
      const term = window.CyberBBS.Term;

      // In-Terminal Step 1: Title
      term.promptInline('NEW THREAD (1/3)', 'Enter Thread Title:', '', (title) => {
        if (!title) { this.renderForumCategoryThreads(cat); return; }

        // In-Terminal Step 2: Tags
        term.promptInline('NEW THREAD (2/3)', 'Enter Tags (e.g. dos, hardware):', 'retro', (tags) => {

          // In-Terminal Step 3: Body
          term.promptInline('NEW THREAD (3/3)', 'Enter Thread Content:', '', (body) => {
            if (!body) { this.renderForumCategoryThreads(cat); return; }

            const user = window.CyberBBS.Store.currentUser;
            const author = user ? user.handle : 'GUEST';
            const tagArray = tags ? tags.split(',').map(s => s.trim().toLowerCase()) : [];

            const newThread = window.CyberBBS.Store.createThread(cat.id, title, author, body, tagArray);
            term.showNotice('THREAD POSTED TO FORUM JSON DATABASE!');
            if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();

            // Echo Bot reply after 10s
            setTimeout(() => {
              const bots = ['ACID_BURN', 'ZERO_COOL', 'LORD_NIKON', 'PHANTOM_PHREAK'];
              const botName = bots[Math.floor(Math.random() * bots.length)];
              const botReplies = [
                'Excellent topic! I have been testing this on my 486 machine recently.',
                'Saved this post to my local diskette. Great information!',
                'Agreed with the original post. The baud rate makes all the difference.',
                'Checked the repository in GitHub Vault for this — works flawlessly!'
              ];
              window.CyberBBS.Store.replyToThread(newThread.id, botName, botReplies[Math.floor(Math.random() * botReplies.length)]);
              window.CyberBBS.Term.showNotice(`*** BOT ${botName} REPLIED TO THREAD #${newThread.id}! ***`);
              if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
            }, 10000);

            this.renderForumCategoryThreads(cat);
          }, () => this.renderForumCategoryThreads(cat));
        }, () => this.renderForumCategoryThreads(cat));
      }, () => this.renderForumCategoryThreads(cat));
    }

    replyToForumThread(thread, cat) {
      const term = window.CyberBBS.Term;
      term.promptInline('REPLY TO THREAD', `Enter Reply to "${thread.title.substring(0, 30)}...":`, '', (body) => {
        if (!body) { this.readForumThread(thread, cat); return; }

        const user = window.CyberBBS.Store.currentUser;
        const author = user ? user.handle : 'GUEST';

        window.CyberBBS.Store.replyToThread(thread.id, author, body);
        term.showNotice('REPLY POSTED TO FORUM!');
        if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();

        this.readForumThread(thread, cat);
      }, () => this.readForumThread(thread, cat));
    }

    // ==========================================
    // 3. [F] FILE AREAS & ZMODEM DOWNLOADS
    // ==========================================
    openFiles() {
      window.CyberBBS.App.pushScreen('FILE_AREAS', () => this.renderFileAreas());
    }

    renderFileAreas() {
      this.renderHeader('FILE AREAS // NUMBERED CATALOG');
      const term = window.CyberBBS.Term;

      const areas = [
        { num: 1, code: '01', name: 'SYSOP TEXTS & GUIDES', count: 12, desc: 'BBS manuals, phreaking, and computing docs' },
        { num: 2, code: '02', name: 'ANSI ART & ART PACKS', count: 24, desc: 'Original ANSI/ASCII releases and viewers' },
        { num: 3, code: '03', name: 'DOS UTILITIES & TOOLS', count: 18, desc: 'Archivers (PKZIP), file managers, disk tools' },
        { num: 4, code: '04', name: 'DEMOSCENE & RETRO DEMOS', count: 15, desc: 'Historic PC demoscene releases' },
        { num: 5, code: '05', name: 'DOCS & PROJECT GUTENBERG', count: 30, desc: 'Ebooks and public-domain literature' },
        { num: 6, code: '06', name: 'GITHUB RELEASES MIRROR', count: 20, desc: 'Open-source software binaries' },
        { num: 7, code: '07', name: 'YOUR UPLOADS (LOCAL SANDBOX)', count: 0, desc: 'Upload local files, earn BBS credits' }
      ];

      term.println(`  #  AREA NAME                       FILES  DESCRIPTION`, 11, 0);
      term.println(`  ─  ──────────────────────────────  ─────  ──────────────────────────────────`, 8, 0);

      areas.forEach((a) => {
        const row = 5 + (a.num - 1) * 2;
        term.setCursor(2, row);
        term.print(`[${a.num}] `, 14, 0);
        term.print(`${a.name.padEnd(30, ' ')}  `, 15, 0);
        term.print(`${a.count.toString().padEnd(5, ' ')}  `, 10, 0);
        term.print(`${a.desc}`, 7, 0);

        term.addHitRegion(2, row, 76, 1, `area-${a.num}`, () => this.browseFileArea(a), a.name, a.num);
      });

      term.setCursor(2, 20);
      term.print(`Type number (1-7) to browse file area directly. [ESC] Main Menu.`, 14, 0);

      this.renderFooter([
        { key: 'U', label: 'Upload File', action: () => {
          document.getElementById('bbs-file-input')?.click();
        }}
      ]);
    }

    async browseFileArea(area) {
      window.CyberBBS.App.pushScreen(`FILE_AREA_${area.code}`, async () => {
        this.renderHeader(`FILES // AREA ${area.code} : ${area.name}`);
        const term = window.CyberBBS.Term;

        let files = [
          { name: 'PKZ204G.EXE', size: 202574, cost: 20, desc: 'PKZIP 2.04g standard DOS compression tool' },
          { name: 'TELEDISK.ZIP', size: 145120, cost: 15, desc: 'TeleDisk 2.11 raw diskette copier and imager' },
          { name: 'ACID95.ANS', size: 8420, cost: 2, desc: 'Acid Productions 1995 demo art screen' },
          { name: 'JARGON3.TXT', size: 685400, cost: 68, desc: 'The Hacker Jargon File v3.0 by Eric S. Raymond' }
        ];

        if (area.code === '07') {
          const userUploads = await window.CyberBBS.Store.getUploadFiles();
          if (userUploads && userUploads.length > 0) {
            files = userUploads.map(u => ({
              name: u.name,
              size: u.size,
              cost: 0,
              desc: `User upload by ${u.uploader} on ${u.date}`,
              blobData: u.data
            }));
          } else {
            files = [];
          }
        }

        if (files.length === 0) {
          term.println(`\r\n  NO FILES FOUND IN THIS AREA. PRESS [U] TO UPLOAD ONE!`, 14, 0);
        } else {
          term.println(`  #  FILENAME       SIZE (BYTES)  CREDITS  DESCRIPTION`, 11, 0);
          term.println(`  ─  ─────────────  ────────────  ───────  ───────────────────────────────────`, 8, 0);

          files.forEach((f, idx) => {
            const row = 5 + idx * 2;
            const num = idx + 1;
            const kb = `${Math.ceil(f.size / 1024)} KB`.padEnd(12, ' ');
            const cost = `${f.cost} CR`.padEnd(7, ' ');

            term.setCursor(2, row);
            term.print(`[${num}] `, 14, 0);
            term.print(`${f.name.padEnd(14, ' ')} `, 15, 0);
            term.print(`${kb} `, 7, 0);
            term.print(`${cost} `, 10, 0);
            term.print(`${f.desc.substring(0, 36)}`, 7, 0);

            term.addHitRegion(2, row, 76, 1, `file-${num}`, () => this.confirmDownload(f), f.name, num);
          });
        }

        term.setCursor(2, 20);
        term.print(`Type number (1-${files.length}) to download file. [ESC] Back.`, 14, 0);

        this.renderFooter([
          { key: 'U', label: 'Upload File', action: () => {
            document.getElementById('bbs-file-input')?.click();
          }}
        ]);
      });
    }

    confirmDownload(file) {
      window.CyberBBS.App.pushScreen('DOWNLOAD_CONFIRM', () => {
        this.renderHeader('DOWNLOAD CONFIRMATION');
        const term = window.CyberBBS.Term;

        term.println(`\r\n  File Name     : ${file.name}`, 15, 0);
        term.println(`  File Size     : ${file.size} bytes (${Math.ceil(file.size / 1024)} KB)`, 7, 0);
        term.println(`  Download Cost : ${file.cost} credits`, 10, 0);
        term.println(`  Your Credits  : ${window.CyberBBS.Store.currentUser?.credits || 500} credits`, 11, 0);
        term.println(`  Protocol      : ZMODEM-90 Streaming (CRC-32 Error Correction)`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`\r\n  Initiate ZMODEM download now?`, 15, 0);

        this.renderFooter([
          { key: '1', label: 'Start ZMODEM Transfer', action: () => this.startZmodemDownload(file) },
          { key: '2', label: 'Back to Files', action: () => window.CyberBBS.App.goBack() }
        ]);
      });
    }

    startZmodemDownload(file) {
      this.renderHeader(`ZMODEM RECEIVE // ${file.name}`);
      const term = window.CyberBBS.Term;
      const audio = window.CyberBBS.Audio;

      let progress = 0;
      const totalBlocks = Math.max(10, Math.ceil(file.size / 1024));

      const timer = setInterval(() => {
        progress += 10;
        const currentBlock = Math.min(totalBlocks, Math.ceil((progress / 100) * totalBlocks));

        if (audio) audio.playTransferTick();

        term.setCursor(2, 6);
        term.println(`  Initiating ZMODEM handshake with remote node...`, 10, 0);
        term.println(`  Receiving: ${file.name.padEnd(20, ' ')} Block ${currentBlock}/${totalBlocks} · CRC-32: OK`, 14, 0);

        const barWidth = 50;
        const filled = Math.floor((progress / 100) * barWidth);
        const bar = '▓'.repeat(filled) + '░'.repeat(barWidth - filled);

        term.setCursor(2, 9);
        term.println(`  Progress: [${bar}] ${progress}%`, 11, 0);
        term.println(`  Baud Rate: 14,400 bps  ·  Throughput: 1,420 cps  ·  Errors: 0`, 7, 0);

        if (progress >= 100) {
          clearInterval(timer);
          if (audio) audio.playBell();

          window.CyberBBS.Store.recordTransfer(file.size, false);

          term.setCursor(2, 13);
          term.println(`  ==============================================================`, 10, 0);
          term.println(`  *** TRANSFER COMPLETE — CRC-32 VERIFIED (0 ERRORS) ***`, 10, 0);
          term.println(`  File saved to your browser downloads folder!`, 15, 0);
          term.println(`  ==============================================================`, 10, 0);

          if (file.blobData) {
            const blob = new Blob([file.blobData]);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
            URL.revokeObjectURL(url);
          } else {
            const sampleText = `CYBER BBS DOWNLOAD FILE: ${file.name}\r\nTimestamp: ${new Date().toISOString()}\r\nDownloaded via Cyber BBS Node 1.\r\n`;
            const blob = new Blob([sampleText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
            URL.revokeObjectURL(url);
          }

          this.renderFooter([
            { key: '1', label: 'Back to File Areas', action: () => window.CyberBBS.App.goBack() }
          ]);
        }
      }, 300);
    }

    // ==========================================
    // 4. [P] PHOTO GRABBER & ANSI CONVERTER
    // ==========================================
    async openPhotos() {
      window.CyberBBS.App.pushScreen('PHOTOS_LIST', async () => {
        this.renderHeader('PHOTO GRABBER // REAL IMAGE SEARCH & ANSI CONVERTER');
        const term = window.CyberBBS.Term;

        term.println(`\r\n  Connecting to Wikimedia Commons image archive...`, 14, 0);
        term.println(`  Please stand by...`, 8, 0);

        const net = window.CyberBBS.Net;
        const res = await net.searchImages('vintage computer terminal');
        this.items = res.images || [];

        this.renderPhotoList();
      });
    }

    renderPhotoList() {
      this.renderHeader('PHOTO GRABBER // SELECT IMAGE TO CONVERT');
      const term = window.CyberBBS.Term;

      term.println(`  #  TITLE                                     LICENSE         DIMENSIONS`, 11, 0);
      term.println(`  ─  ────────────────────────────────────────  ──────────────  ──────────`, 8, 0);

      this.items.slice(0, 7).forEach((img, idx) => {
        const row = 5 + idx * 2;
        const num = idx + 1;
        const title = (img.title || 'Photo').padEnd(40, ' ').substring(0, 40);
        const lic = (img.license || 'Public Domain').padEnd(14, ' ').substring(0, 14);
        const dims = `${img.width || 640}x${img.height || 480}`;

        term.setCursor(2, row);
        term.print(`[${num}] `, 14, 0);
        term.print(`${title}  `, 15, 0);
        term.print(`${lic}  `, 10, 0);
        term.print(`${dims}`, 7, 0);

        term.addHitRegion(2, row, 76, 1, `photo-${num}`, () => this.renderAnsiPreview(img), title, num);
      });

      term.setCursor(2, 20);
      term.print(`Type number (1-${Math.min(7, this.items.length)}) to generate ANSI preview. [ESC] Back.`, 14, 0);

      this.renderFooter([
        { key: 'G', label: 'Google Images (External)', action: () => window.open('https://www.google.com/search?tbm=isch&q=vintage+retro+computer+bbs', '_blank') }
      ]);
    }

    async renderAnsiPreview(img) {
      window.CyberBBS.App.pushScreen('PHOTO_PREVIEW', async () => {
        this.renderHeader(`PHOTO // CONVERTING TO CP437 ANSI`);
        const term = window.CyberBBS.Term;

        term.println(`\r\n  Downsampling image to 78x30 CP437 half-blocks...`, 14, 0);
        term.println(`  Applying 16-color IBM VGA perceptual color quantizer...`, 11, 0);

        try {
          const ansiText = await window.CyberBBS.Ansi.convertImageToAnsi(img.url, 78, 30);
          term.clear();
          term.println(`  PHOTO PREVIEW: ${img.title.substring(0, 45)}  [${img.license}]`, 14, 0);
          term.print(ansiText);

          this.renderFooter([
            { key: '1', label: 'Save Original Image', action: () => window.open(img.url, '_blank') },
            { key: '2', label: 'Save .ANS File', action: () => {
              const blob = window.CyberBBS.Ansi.createAnsiBlob(ansiText, img.title);
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'PHOTO.ANS'; a.click();
              URL.revokeObjectURL(url);
              term.showNotice('SAVED AS PHOTO.ANS WITH SAUCE METADATA');
            }},
            { key: '3', label: 'Back to Photos', action: () => window.CyberBBS.App.goBack() }
          ]);
        } catch (err) {
          term.println(`\r\n  *** NOTICE: Cross-origin image preview protected ***`, 12, 0);
          term.println(`  You can open and download the original file directly:`, 15, 0);
          term.println(`  ${img.url}`, 11, 0);

          this.renderFooter([
            { key: '1', label: 'Open Image', action: () => window.open(img.url, '_blank') },
            { key: '2', label: 'Back to Photos', action: () => window.CyberBBS.App.goBack() }
          ]);
        }
      });
    }

    // ==========================================
    // 5. [G] GITHUB VAULT (PURE TEXT, SEARCH, TAGS, README, DIR)
    // ==========================================
    async openGitHub() {
      window.CyberBBS.App.pushScreen('GITHUB_LIST', async () => {
        this.renderHeader('GITHUB VAULT // PURE TEXT REPOSITORY BROWSER');
        const term = window.CyberBBS.Term;

        term.println(`\r\n  Querying GitHub REST API v3 for retro computing repositories...`, 14, 0);
        term.println(`  Extracting tags, stars, descriptions, and file trees...`, 8, 0);

        const net = window.CyberBBS.Net;
        const res = await net.searchGitHubRepos('retro computing terminal dos');
        this.items = res.repos || [];

        this.renderGitHubList();
      });
    }

    renderGitHubList(searchQuery = '') {
      this.renderHeader('GITHUB VAULT // TEXT REPOSITORY DIRECTORY');
      const term = window.CyberBBS.Term;

      term.println(`  #   STARS   LANG      TAGS / TOPICS      REPOSITORY & DESCRIPTION`, 11, 0);
      term.println(`  ──  ──────  ────────  ─────────────────  ──────────────────────────────────`, 8, 0);

      this.items.slice(0, 7).forEach((repo, idx) => {
        const row = 5 + idx * 2;
        const num = idx + 1;
        const stars = `★${repo.stargazers_count}`.padEnd(6, ' ');
        const lang = (repo.language || 'Code').padEnd(8, ' ').substring(0, 8);
        const tags = (repo.topics && repo.topics.length > 0 ? `#${repo.topics.slice(0, 2).join(' #')}` : '#retro').padEnd(17, ' ').substring(0, 17);
        const name = (repo.full_name || repo.name).padEnd(34, ' ').substring(0, 34);

        term.setCursor(2, row);
        term.print(`[${num}] `, 14, 0);
        term.print(`${stars}  `, 14, 0);
        term.print(`${lang}  `, 10, 0);
        term.print(`${tags}  `, 11, 0);
        term.print(`${name}`, 15, 0);

        term.addHitRegion(2, row, 76, 1, `repo-${num}`, () => this.viewRepoDetail(repo), repo.name, num);
      });

      term.setCursor(2, 20);
      term.print(`Type number (1-${Math.min(7, this.items.length)}) to inspect repository. [ESC] Back.`, 14, 0);

      this.renderFooter([
        { key: 'S', label: 'Search Query', action: () => {
          term.promptInline('GITHUB SEARCH', 'Enter Repository Keyword:', '', (q) => {
            if (q) {
              window.CyberBBS.Net.searchGitHubRepos(q).then(r => {
                this.items = r.repos || [];
                this.renderGitHubList(q);
              });
            }
          }, () => this.renderGitHubList());
        }},
        { key: 'T', label: 'Filter Tags', action: () => {
          term.promptInline('FILTER TAGS', 'Enter Topic/Tag (e.g. dos, emulator):', 'dos', (tag) => {
            if (tag) {
              window.CyberBBS.Net.searchGitHubRepos('retro', tag).then(r => {
                this.items = r.repos || [];
                this.renderGitHubList(tag);
              });
            }
          }, () => this.renderGitHubList());
        }}
      ]);
    }

    viewRepoDetail(repo) {
      window.CyberBBS.App.pushScreen(`GITHUB_REPO_${repo.name}`, () => {
        this.renderHeader(`GITHUB // ${repo.name.toUpperCase()}`);
        const term = window.CyberBBS.Term;

        term.println(`\r\n  REPOSITORY OVERVIEW`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  Name        : ${repo.full_name || repo.name}`, 15, 0);
        term.println(`  Stars       : ★${repo.stargazers_count}    Forks: ${repo.forks_count || 0}    Language: ${repo.language || 'Various'}`, 14, 0);
        term.println(`  Tags/Topics : ${(repo.topics && repo.topics.length > 0 ? repo.topics.join(', ') : 'retro, computing')}`, 11, 0);
        term.println(`  Description : ${repo.description || 'No description provided.'}`, 7, 0);
        term.println(`  URL         : ${repo.html_url || `https://github.com/${repo.owner?.login}/${repo.name}`}`, 8, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`\r\n  Select action (1-4):`, 15, 0);

        this.renderFooter([
          { key: '1', label: 'Read README.md', action: () => this.readRepoReadme(repo) },
          { key: '2', label: 'Browse File Tree (DIR)', action: () => this.browseRepoContents(repo) },
          { key: '3', label: 'Download ZIP', action: () => {
            const zipUrl = `https://github.com/${repo.owner?.login}/${repo.name}/archive/refs/heads/main.zip`;
            window.open(zipUrl, '_blank');
            term.showNotice('DOWNLOADING REPO ARCHIVE (ZIP)...');
          }},
          { key: '4', label: 'Back to List', action: () => window.CyberBBS.App.goBack() }
        ]);
      });
    }

    async readRepoReadme(repo) {
      window.CyberBBS.App.pushScreen(`README_${repo.name}`, async () => {
        this.renderHeader(`GITHUB // README : ${repo.name.toUpperCase()}`);
        const term = window.CyberBBS.Term;

        term.println(`\r\n  Fetching and parsing README.md to formatted 78-col text...`, 14, 0);
        const text = await window.CyberBBS.Net.fetchRepoReadme(repo.owner?.login || 'dosbox-staging', repo.name);

        term.clear();
        term.println(`  README.md // ${repo.full_name || repo.name}`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);

        const lines = text.split('\n');
        lines.slice(0, 18).forEach(l => {
          term.println(`  ${l.substring(0, 76)}`, 7, 0);
        });

        this.renderFooter([
          { key: '1', label: 'Back to Repo', action: () => window.CyberBBS.App.goBack() },
          { key: '2', label: 'Open on GitHub', action: () => window.open(repo.html_url || `https://github.com/${repo.owner?.login}/${repo.name}`, '_blank') }
        ]);
      });
    }

    async browseRepoContents(repo) {
      window.CyberBBS.App.pushScreen(`DIR_${repo.name}`, async () => {
        this.renderHeader(`GITHUB // DIR : ${repo.name.toUpperCase()}`);
        const term = window.CyberBBS.Term;

        term.println(`\r\n  Fetching repository directory tree...`, 14, 0);
        const files = await window.CyberBBS.Net.fetchRepoContents(repo.owner?.login || 'dosbox-staging', repo.name);

        term.clear();
        term.println(`  DIRECTORY OF ${repo.name.toUpperCase()}/`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);

        files.slice(0, 14).forEach((f, idx) => {
          const row = 3 + idx;
          term.setCursor(2, row);
          term.print(`${f.name.padEnd(35, ' ')} `, 15, 0);
          term.print(`${f.type.padEnd(10, ' ')} `, 10, 0);
          term.print(`${f.size ? `${f.size} bytes` : ''}`, 7, 0);
        });

        this.renderFooter([
          { key: '1', label: 'Back to Repo', action: () => window.CyberBBS.App.goBack() }
        ]);
      });
    }

    // ==========================================
    // 6. [D] DOOR GAMES
    // ==========================================
    openGames() {
      window.CyberBBS.App.pushScreen('DOOR_GAMES', () => this.renderGamesMenu());
    }

    renderGamesMenu() {
      this.renderHeader('DOOR GAMES // ENTERTAINMENT MODULES');
      const term = window.CyberBBS.Term;

      const games = [
        { num: 1, name: 'CYBER LORD RPG', desc: 'Legend of the Red Dragon-style RPG. Forest fights, tavern, dragons' },
        { num: 2, name: 'STAR TRADE', desc: 'TradeWars-style space commerce across 30 sectors' },
        { num: 3, name: 'BLACKJACK TABLE', desc: 'Wager your BBS credits with the dealer' },
        { num: 4, name: 'HANGMAN', desc: 'Retro computing glossary puzzle' },
        { num: 5, name: 'SYSOP FORTUNE', desc: 'Curated archive of hacker quotes and wisdom' }
      ];

      term.println(`  #  GAME TITLE          DESCRIPTION`, 11, 0);
      term.println(`  ─  ──────────────────  ─────────────────────────────────────────────────────`, 8, 0);

      games.forEach((g) => {
        const row = 5 + (g.num - 1) * 2;
        term.setCursor(2, row);
        term.print(`[${g.num}] `, 14, 0);
        term.print(`${g.name.padEnd(20, ' ')} `, 15, 0);
        term.print(`${g.desc}`, 7, 0);

        term.addHitRegion(2, row, 76, 1, `game-${g.num}`, () => this.launchGame(g.name), g.name, g.num);
      });

      term.setCursor(2, 19);
      term.print(`Type number (1-5) to launch door game. [ESC] Main Menu.`, 14, 0);

      this.renderFooter();
    }

    launchGame(gameName) {
      if (gameName === 'CYBER LORD RPG') this.playCyberLord();
      else if (gameName === 'STAR TRADE') this.playStarTrade();
      else if (gameName === 'BLACKJACK TABLE') this.playBlackjack();
      else if (gameName === 'HANGMAN') this.playHangman();
      else this.playFortune();
    }

    playCyberLord() {
      window.CyberBBS.App.pushScreen('GAME_CYBER_LORD', () => {
        this.renderHeader('CYBER LORD // FOREST REALM v1.2');
        const term = window.CyberBBS.Term;

        let lordSave = window.CyberBBS.Store.getGameSave('cyberlord') || {
          hp: 30, maxHp: 30, gold: 50, weapon: 'Bronze Dagger', level: 1, kills: 0
        };

        term.println(`\r\n  WARRIOR: Level ${lordSave.level}  ·  HP: ${lordSave.hp}/${lordSave.maxHp}  ·  Gold: ${lordSave.gold} GP`, 14, 0);
        term.println(`  Weapon : ${lordSave.weapon}  ·  Forest Fights Won: ${lordSave.kills}`, 10, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  You stand at the edge of the Whispering Forest. Dark creatures lurk ahead.`, 7, 0);
        term.println(`\r\n  Choose your action (1-3):`, 15, 0);

        this.renderFooter([
          { key: '1', label: 'Fight Monster', action: () => {
            const monsters = [
              { name: 'Goblin Scout', hp: 12, gold: 15 },
              { name: 'Cyber Orc', hp: 20, gold: 30 },
              { name: 'Mutant Troll', hp: 35, gold: 60 }
            ];
            const m = monsters[Math.floor(Math.random() * monsters.length)];
            const monsterDmg = Math.floor(Math.random() * 6) + 2;

            lordSave.hp = Math.max(1, lordSave.hp - monsterDmg);
            lordSave.gold += m.gold;
            lordSave.kills++;
            window.CyberBBS.Store.saveGame('cyberlord', lordSave);

            if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
            term.showNotice(`VICTORY! Slew ${m.name} (+${m.gold} GP, took ${monsterDmg} dmg)!`);
            this.playCyberLord();
          }},
          { key: '2', label: 'Visit Healer (15 GP)', action: () => {
            if (lordSave.gold >= 15) {
              lordSave.gold -= 15;
              lordSave.hp = lordSave.maxHp;
              window.CyberBBS.Store.saveGame('cyberlord', lordSave);
              term.showNotice('HEALER RESTORED YOUR HEALTH TO 100%!');
            } else {
              term.showNotice('NOT ENOUGH GOLD FOR HEALER!');
            }
            this.playCyberLord();
          }},
          { key: '3', label: 'Back to Games', action: () => window.CyberBBS.App.goBack() }
        ]);
      });
    }

    playStarTrade() {
      window.CyberBBS.App.pushScreen('GAME_STAR_TRADE', () => {
        this.renderHeader('STAR TRADE // SECTOR 01 (EARTH STATION)');
        const term = window.CyberBBS.Term;

        let tradeSave = window.CyberBBS.Store.getGameSave('startrade') || {
          sector: 1, credits: 1000, cargo: { ore: 0, organics: 0, equipment: 0 }, ship: 'Scout Trader'
        };

        term.println(`\r\n  SHIP: ${tradeSave.ship}  ·  CREDITS: ${tradeSave.credits} CR  ·  SECTOR: #${tradeSave.sector}`, 14, 0);
        term.println(`  Cargo: Ore: ${tradeSave.cargo.ore}t · Organics: ${tradeSave.cargo.organics}t · Equip: ${tradeSave.cargo.equipment}t`, 10, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  COMMODITY PORT EXCHANGE:`, 11, 0);
        term.println(`  [1] Buy Ore (40 CR)     [2] Sell Ore (38 CR)     [3] Warp Sector`, 15, 0);

        this.renderFooter([
          { key: '1', label: 'Buy Ore', action: () => {
            if (tradeSave.credits >= 40) {
              tradeSave.credits -= 40;
              tradeSave.cargo.ore++;
              window.CyberBBS.Store.saveGame('startrade', tradeSave);
              term.showNotice('BOUGHT 1 TON OF ORE!');
            } else term.showNotice('INSUFFICIENT CREDITS!');
            this.playStarTrade();
          }},
          { key: '2', label: 'Sell Ore', action: () => {
            if (tradeSave.cargo.ore > 0) {
              tradeSave.cargo.ore--;
              tradeSave.credits += 38;
              window.CyberBBS.Store.saveGame('startrade', tradeSave);
              term.showNotice('SOLD 1 TON OF ORE!');
            } else term.showNotice('NO ORE TO SELL!');
            this.playStarTrade();
          }},
          { key: '3', label: 'Warp Sector', action: () => {
            tradeSave.sector = (tradeSave.sector % 30) + 1;
            window.CyberBBS.Store.saveGame('startrade', tradeSave);
            term.showNotice(`WARPED TO SECTOR #${tradeSave.sector}`);
            this.playStarTrade();
          }},
          { key: '4', label: 'Back to Games', action: () => window.CyberBBS.App.goBack() }
        ]);
      });
    }

    playBlackjack() {
      window.CyberBBS.App.pushScreen('GAME_BLACKJACK', () => {
        this.renderHeader('BLACKJACK TABLE // DEALER CASINO');
        const term = window.CyberBBS.Term;
        const user = window.CyberBBS.Store.currentUser;

        term.println(`\r\n  YOUR BBS CREDITS: ${user?.credits || 500} CR`, 14, 0);
        term.println(`  Dealer stands on 17. Blackjack pays 3 to 2.`, 7, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  Press [1] to deal cards for 25 credits wager!`, 15, 0);

        this.renderFooter([
          { key: '1', label: 'Deal Cards (25 CR)', action: () => {
            if (!window.CyberBBS.Store.chargeCredits(25)) {
              term.showNotice('NOT ENOUGH BBS CREDITS!');
              return;
            }
            const playerCard = Math.floor(Math.random() * 10) + 12;
            const dealerCard = Math.floor(Math.random() * 10) + 10;

            if (playerCard > dealerCard && playerCard <= 21) {
              window.CyberBBS.Store.rewardCredits(50);
              if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
              term.showNotice(`YOU WIN! You: ${playerCard}, Dealer: ${dealerCard} (+50 CR)!`);
            } else {
              term.showNotice(`DEALER WINS! Dealer: ${dealerCard}, You: ${playerCard}.`);
            }
            this.playBlackjack();
          }},
          { key: '2', label: 'Back to Games', action: () => window.CyberBBS.App.goBack() }
        ]);
      });
    }

    playHangman() {
      window.CyberBBS.App.pushScreen('GAME_HANGMAN', () => {
        this.renderHeader('HANGMAN // RETRO GLOSSARY');
        const term = window.CyberBBS.Term;

        const words = ['MODEM', 'TERMINAL', 'USROBOTICS', 'ZMODEM', 'BAUDRATE', 'FIDONET', 'SYSOP'];
        const chosen = words[Math.floor(Math.random() * words.length)];

        term.println(`\r\n  GUESS THE VINTAGE WORD:`, 14, 0);
        term.println(`  Word Length: ${chosen.length} letters`, 7, 0);
        term.println(`  Pattern    : ${chosen[0]} ${'_ '.repeat(chosen.length - 2)}${chosen[chosen.length - 1]}`, 15, 0);
        term.println(`\r\n  Answer: ${chosen}`, 10, 0);

        this.renderFooter([
          { key: '1', label: 'Next Word', action: () => this.playHangman() },
          { key: '2', label: 'Back to Games', action: () => window.CyberBBS.App.goBack() }
        ]);
      });
    }

    playFortune() {
      window.CyberBBS.App.pushScreen('GAME_FORTUNE', () => {
        this.renderHeader('SYSOP FORTUNE // HACKER QUOTES');
        const term = window.CyberBBS.Term;

        const quotes = [
          '"640K ought to be enough for anybody." — Bill Gates (attributed, 1981)',
          '"There are 10 types of people: those who understand binary, and those who don\'t."',
          '"Never trust a computer you can\'t throw out a window." — Steve Wozniak',
          '"The Net is a waste of time, and that\'s exactly what\'s right about it." — William Gibson',
          '"Hackers do not break into systems to destroy; they break in to explore the architecture."'
        ];

        const q = quotes[Math.floor(Math.random() * quotes.length)];
        term.println(`\r\n  TODAY\'S BBS FORTUNE:`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`\r\n  ${q}`, 15, 0);
        term.println(`\r\n  ────────────────────────────────────────────────────────────────────────────`, 8, 0);

        this.renderFooter([
          { key: '1', label: 'Another Fortune', action: () => this.playFortune() },
          { key: '2', label: 'Back to Games', action: () => window.CyberBBS.App.goBack() }
        ]);
      });
    }

    // ==========================================
    // 7. [W] WORLD CLOCKS // HORAS MUNDIAIS
    // ==========================================
    openWorldClock() {
      window.CyberBBS.App.pushScreen('WORLD_CLOCKS', () => {
        this.renderHeader('WORLD CLOCKS // HORAS MUNDIAIS TELEMETRY');
        const term = window.CyberBBS.Term;

        const renderClocks = () => {
          term.setCursor(2, 4);
          term.println(`  GLOBAL TIMEZONE TELEMETRY MATRIX (REAL-TIME TICKING)`, 14, 0);
          term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);

          const now = new Date();
          const tzList = [
            { city: 'São Paulo / Brasília', tz: 'America/Sao_Paulo', code: 'BRT (UTC-3)' },
            { city: 'New York / Boston', tz: 'America/New_York', code: 'EST (UTC-5)' },
            { city: 'Silicon Valley / Seattle', tz: 'America/Los_Angeles', code: 'PST (UTC-8)' },
            { city: 'London / Greenwich', tz: 'Europe/London', code: 'GMT (UTC+0)' },
            { city: 'Paris / Berlin / Frankfurt', tz: 'Europe/Berlin', code: 'CET (UTC+1)' },
            { city: 'Tokyo / Kyoto', tz: 'Asia/Tokyo', code: 'JST (UTC+9)' },
            { city: 'Sydney / Melbourne', tz: 'Australia/Sydney', code: 'AEST (UTC+10)' }
          ];

          tzList.forEach((item, idx) => {
            const row = 6 + idx * 2;
            try {
              const timeStr = now.toLocaleTimeString('en-US', { timeZone: item.tz, hour12: false });
              const dateStr = now.toLocaleDateString('en-US', { timeZone: item.tz, month: 'short', day: '2-digit' });
              const hour = parseInt(timeStr.split(':')[0], 10);
              const isDay = hour >= 6 && hour < 19;
              const sunMoon = isDay ? '☼ DAY  ' : '☽ NIGHT';

              term.setCursor(2, row);
              term.print(`  ${item.city.padEnd(28, ' ')} `, 15, 0);
              term.print(`${item.code.padEnd(14, ' ')} `, 11, 0);
              term.print(`${dateStr}  `, 7, 0);
              term.print(`${timeStr}  `, 14, 0);
              term.print(`${sunMoon}`, isDay ? 14 : 9, 0);
            } catch (e) {}
          });

          term.setCursor(2, 20);
          term.print(`  UTC Master: ${now.toUTCString().substring(17, 25)}  ·  Node COM2: 14400 ARQ Online`, 10, 0);
        };

        renderClocks();
        this.activeTimer = setInterval(renderClocks, 1000);

        this.renderFooter([
          { key: '1', label: 'Refresh Now', action: renderClocks }
        ]);
      });
    }

    // ==========================================
    // 8. [W] WEATHER TELEMETRY
    // ==========================================
    async openWeather() {
      window.CyberBBS.App.pushScreen('WEATHER_STATION', async () => {
        this.renderHeader('WEATHER STATION // METEOROLOGICAL TELEMETRY');
        const term = window.CyberBBS.Term;

        term.println(`\r\n  Requesting real meteorological observations from wttr.in...`, 14, 0);
        const res = await window.CyberBBS.Net.fetchWeather('New York');

        term.clear();
        this.renderHeader('WEATHER STATION // REAL OBSERVATION');
        if (res.ansiText) {
          term.print(res.ansiText);
        } else {
          term.print(res.asciiText);
        }

        this.renderFooter([
          { key: '1', label: 'Change City', action: () => {
            term.promptInline('WEATHER TELEMETRY', 'Enter City Name (e.g. London, Tokyo):', 'Tokyo', (city) => {
              if (city) {
                window.CyberBBS.Net.fetchWeather(city).then(r => {
                  term.clear();
                  this.renderHeader(`WEATHER // ${city.toUpperCase()}`);
                  term.print(r.ansiText || r.asciiText);
                  this.renderFooter();
                });
              }
            }, () => window.CyberBBS.App.goBack());
          }}
        ]);
      });
    }

    // ==========================================
    // 9. [C] CHAT WITH SYSOP
    // ==========================================
    openChat() {
      window.CyberBBS.App.pushScreen('SYSOP_CHAT', () => {
        const term = window.CyberBBS.Term;
        term.clear();
        term.clearHitRegions();

        term.println(`┌───────────────────[ LIVE SYSOP CHAT // SPLIT SCREEN ]────────────────────┐`, 11, 0);
        term.println(`│ Page Bell: Responded · SysOp: DR. NOISE (Basement) · [ESC] Exit Chat       │`, 15, 0);
        term.println(`├────────────────────────────────────────────────────────────────────────────┤`, 11, 0);
        term.println(` DR. NOISE> Hello caller. You caught me between compiling kernel modules.`, 13, 0);
        term.println(` DR. NOISE> What brings you to Node 1 today?`, 13, 0);
        term.setCursor(0, 13);
        term.println(`├────────────────────────[ YOUR MESSAGE INPUT ]──────────────────────────────┤`, 11, 0);
        term.setCursor(1, 15);
        term.print(`You> `, 14, 0);

        this.renderFooter([
          { key: '1', label: 'Type Message', action: () => {
            term.promptInline('CHAT WITH DR. NOISE', 'Type your message to SysOp:', '', (msg) => {
              if (msg) {
                term.setCursor(1, 16);
                term.println(`You> ${msg}`, 15, 0);
                if (window.CyberBBS.Audio) window.CyberBBS.Audio.playKeyClick();

                setTimeout(() => {
                  const replies = [
                    'Heh, good to know. Keep your ratio above 1:3 and you will stay in my good books.',
                    'The USRobotics line has been rock solid today. Glad you are enjoying the doors.',
                    'I am adding more demoscene artpacks this weekend. Stay tuned.',
                    'Need more credits? Upload a good DOS utility or post in the message echoes!'
                  ];
                  const reply = replies[Math.floor(Math.random() * replies.length)];
                  term.setCursor(1, 8);
                  term.println(` DR. NOISE> ${reply}`, 13, 0);
                  if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
                }, 1000);
              }
            }, () => this.openChat());
          }}
        ]);
      });
    }
  }

  window.CyberBBS.Doors = new BBSDoors();
})();
