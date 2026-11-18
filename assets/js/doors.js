/**
 * CYBER BBS — Functional Real & Atmospheric Doors (Mega Edition v3.0)
 */
(function() {
  window.CyberBBS = window.CyberBBS || {};

  class BBSDoors {
    constructor() {
      this.pageIndex = 0;
      this.items = [];
      this.activeTimer = null;
      this.chatHistory = [
        { who: 'DR. NOISE', text: 'Hello caller. You caught me between compiling kernel 1.2.13 modules.' },
        { who: 'DR. NOISE', text: 'Ask me about ratio, credits, rank, games, ansi, modems, or just say hello!' }
      ];
    }

    stopActiveTimer() {
      if (this.activeTimer) { clearInterval(this.activeTimer); this.activeTimer = null; }
    }

    renderHeader(title) {
      this.stopActiveTimer();
      if (window.CyberBBS.Games) window.CyberBBS.Games.clearKeyHandler();
      const term = window.CyberBBS.Term, store = window.CyberBBS.Store;
      term.clear(); term.clearHitRegions(); term.announceLive(title);

      const user = store.currentUser;
      const handle = user ? user.handle : 'GUEST';
      const credits = user ? user.credits : 500;
      const rank = store.getUserRank(user);

      const titleStr = ` CYBER BBS // ${title.toUpperCase()} `;
      const leftDashes = Math.max(1, Math.floor((76 - titleStr.length) / 2));
      const rightDashes = Math.max(1, 76 - titleStr.length - leftDashes);
      const topBar = `┌${'─'.repeat(leftDashes)}[${titleStr}]${'─'.repeat(rightDashes)}┐`;

      const infoLeft = ` ${handle.substring(0, 12)} [${rank.title.substring(0, 14)}]`;
      const infoRight = `CR: ${credits} · Node ${store.currentNodeId} · 14.4k `;
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
        const label = `[${a.key}] ${a.label} `;
        if (col + label.length < 70) {
          term.print(`[`, 15, 0); term.print(`${a.key}`, 14, 0); term.print(`] ${a.label} `, 7, 0);
          term.addHitRegion(col, 23, label.length, 1, `action-${a.key}`, a.action, a.label, a.key);
          col += label.length;
        }
      });
      const backLabel = `[ESC] Back`;
      term.print(`[`, 15, 0); term.print(`ESC`, 12, 0); term.print(`] Back`, 7, 0);
      term.addHitRegion(col, 23, backLabel.length, 1, 'action-back', () => window.CyberBBS.App.goBack(), 'Back', 'ESC');
      term.renderStatusBar();
    }

    renderPagedTextView(headerTitle, subHeader, rawLines, footerActions = [], page = 0) {
      const term = window.CyberBBS.Term;
      const linesPerPage = 15;
      const totalPages = Math.max(1, Math.ceil(rawLines.length / linesPerPage));
      const curPage = Math.max(0, Math.min(totalPages - 1, page));

      this.renderHeader(`${headerTitle} (PG ${curPage + 1}/${totalPages})`);
      if (subHeader) {
        term.println(`  ${subHeader.substring(0, 76)}`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
      }
      rawLines.slice(curPage * linesPerPage, (curPage + 1) * linesPerPage).forEach(l => term.println(`  ${l.substring(0, 76)}`, 7, 0));

      term.onWheelHandler = (dir) => {
        const next = curPage + dir;
        if (next >= 0 && next < totalPages) this.renderPagedTextView(headerTitle, subHeader, rawLines, footerActions, next);
      };

      this.renderFooter([
        { key: 'N', label: 'Next Pg', action: () => { if (curPage + 1 < totalPages) this.renderPagedTextView(headerTitle, subHeader, rawLines, footerActions, curPage + 1); } },
        { key: 'P', label: 'Prev Pg', action: () => { if (curPage > 0) this.renderPagedTextView(headerTitle, subHeader, rawLines, footerActions, curPage - 1); } },
        ...footerActions
      ]);
    }

    wrapTextToLines(text, maxWidth = 74) {
      const result = [];
      String(text || '').split(/\r?\n/).forEach(p => {
        if (!p.trim()) { result.push(''); return; }
        let line = '';
        p.split(' ').forEach(w => {
          if (line.length + w.length + 1 > maxWidth) { result.push(line); line = w; }
          else line = line ? line + ' ' + w : w;
        });
        if (line) result.push(line);
      });
      return result;
    }

    // 1. NEWS & LIVE RSS
    openNews() { window.CyberBBS.App.pushScreen('NEWS_CATS', () => this.renderNewsCategories()); }

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
        term.setCursor(2, row); term.print(`[${c.num}] `, 14, 0); term.print(`${c.name.padEnd(44, ' ')} `, 15, 0); term.print(`${c.src}`, 10, 0);
        term.addHitRegion(2, row, 76, 1, `newscat-${c.num}`, () => this.loadNewsCategory(c), c.name, c.num);
      });
      term.setCursor(2, 19); term.print(`Type number (1-6) or click to open category. [ESC] Main Menu.`, 14, 0);
      this.renderFooter();
    }

    async loadNewsCategory(cat, forceRefresh = false) {
      window.CyberBBS.App.pushScreen(`NEWS_LIST_${cat.src}`, async () => {
        this.renderHeader(`NEWS // ${cat.src}`);
        const term = window.CyberBBS.Term;
        term.println(`\r\n  Querying satellite downlink for ${cat.name}...`, 14, 0);
        const net = window.CyberBBS.Net;
        const res = cat.url ? await net.fetchRssFeed(cat.url, cat.src, forceRefresh) : { ok: true, items: net.archiveDigest, isLive: false, status: 'DEMO', sourceName: 'ARCHIVE' };
        this.items = res.items || [];
        this.lastNewsEnvelope = res;
        this.pageIndex = 0;
        this.renderNewsList(cat);
      });
    }

    renderNewsList(cat) {
      this.renderHeader(`NEWS // ${cat.src}`);
      const term = window.CyberBBS.Term;
      const net = window.CyberBBS.Net;
      const badge = net ? net.renderSourceBadge(this.lastNewsEnvelope) : '';
      if (badge) {
        term.setCursor(50, 2);
        term.print(badge);
      }
      const start = this.pageIndex * 7;
      const slice = this.items.slice(start, start + 7);
      term.println(`  #   DATE & TIME       HEADLINE (USE WHEEL OR N/P TO SCROLL)`, 11, 0);
      term.println(`  ──  ────────────────  ──────────────────────────────────────────────────────`, 8, 0);
      slice.forEach((item, idx) => {
        const row = 5 + idx * 2, num = idx + 1;
        const date = (item.date || '').padEnd(16, ' ').substring(0, 16);
        const title = (item.title || '').padEnd(54, ' ').substring(0, 54);
        term.setCursor(2, row); term.print(`[${num}] `, 14, 0); term.print(`${date}  `, 10, 0); term.print(`${title}`, 15, 0);
        term.addHitRegion(2, row, 76, 1, `news-${num}`, () => this.readNewsItem(item), title, num);
      });
      term.onWheelHandler = (dir) => {
        if (dir > 0 && (this.pageIndex + 1) * 7 < this.items.length) { this.pageIndex++; this.renderNewsList(cat); }
        else if (dir < 0 && this.pageIndex > 0) { this.pageIndex--; this.renderNewsList(cat); }
      };
      term.setCursor(2, 20); term.print(`Type (1-${slice.length}) to read article · [R] Refresh Wire · [ESC] Back`, 14, 0);
      this.renderFooter([
        { key: 'N', label: 'Next Pg', action: () => { if ((this.pageIndex + 1) * 7 < this.items.length) { this.pageIndex++; this.renderNewsList(cat); } } },
        { key: 'P', label: 'Prev Pg', action: () => { if (this.pageIndex > 0) { this.pageIndex--; this.renderNewsList(cat); } } },
        { key: 'R', label: 'Refresh', action: () => this.loadNewsCategory(cat, true) }
      ]);
    }

    readNewsItem(item) {
      window.CyberBBS.App.pushScreen('NEWS_DETAIL', () => {
        const lines = [`SOURCE: ${item.source}   |   DATE: ${item.date}`, `LINK  : ${item.link || 'Internal Archive'}`, '', ...this.wrapTextToLines(item.summary || item.title, 74)];
        this.renderPagedTextView('NEWS DISPATCH', item.title, lines, [
          { key: '1', label: 'Open Browser', action: () => { if (item.link) window.open(item.link, '_blank', 'noopener'); } },
          { key: '2', label: 'Save .TXT', action: () => {
            const blob = new Blob([`${item.title}\r\nDate: ${item.date}\r\nSource: ${item.source}\r\n\r\n${item.summary}\r\n`], { type: 'text/plain' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'NEWS_ARTICLE.TXT'; a.click(); URL.revokeObjectURL(url);
            window.CyberBBS.Term.showNotice('ARTICLE SAVED AS NEWS_ARTICLE.TXT');
          }}
        ]);
      });
    }

    // 2. BULLETIN BOARD / FORUM
    openForum() { window.CyberBBS.App.pushScreen('FORUM_CATEGORIES', () => this.renderForumCategories()); }

    renderForumCategories() {
      this.renderHeader('BULLETIN BOARD // FIDONET ECHOES & FORUMS');
      const term = window.CyberBBS.Term, store = window.CyberBBS.Store;
      const categories = store.getForumCategories();
      term.println(`  #  BOARD CATEGORY                   THREADS  DESCRIPTION`, 11, 0);
      term.println(`  ─  ───────────────────────────────  ───────  ───────────────────────────────`, 8, 0);
      categories.forEach((cat, idx) => {
        const row = 5 + idx * 2, count = store.getForumThreads(cat.id).length;
        term.setCursor(2, row); term.print(`[${cat.num}] `, 14, 0); term.print(`${cat.title.padEnd(31, ' ')}  `, 15, 0); term.print(`${count.toString().padEnd(7, ' ')}  `, 10, 0); term.print(`${cat.desc.substring(0, 31)}`, 7, 0);
        term.addHitRegion(2, row, 76, 1, `forum-cat-${cat.num}`, () => this.openForumCategory(cat), cat.title, cat.num);
      });
      term.setCursor(2, 19); term.print(`Select board (1-${categories.length}) · [E] Export JSON · [I] Import JSON File`, 14, 0);
      this.renderFooter([
        { key: 'E', label: 'Export JSON', action: () => { store.exportForumJson(); term.showNotice('BULLETIN_BOARD_FORUM.JSON EXPORTED!'); } },
        { key: 'I', label: 'Import JSON', action: () => document.getElementById('bbs-json-input')?.click() }
      ]);
    }

    openForumCategory(cat) { window.CyberBBS.App.pushScreen(`FORUM_CAT_${cat.id}`, () => this.renderForumCategoryThreads(cat)); }

    renderForumCategoryThreads(cat) {
      this.renderHeader(`FORUM // ${cat.title}`);
      const term = window.CyberBBS.Term, threads = window.CyberBBS.Store.getForumThreads(cat.id);
      term.println(`  #   REPLIES  AUTHOR           TITLE / TOPIC`, 11, 0);
      term.println(`  ──  ───────  ───────────────  ──────────────────────────────────────────────`, 8, 0);
      if (!threads.length) term.println(`\r\n  NO THREADS IN THIS BOARD YET. PRESS [N] TO CREATE THE FIRST ONE!`, 14, 0);
      else {
        threads.slice(0, 7).forEach((t, idx) => {
          const row = 5 + idx * 2, num = idx + 1;
          const replies = `${(t.posts?.length || 1) - 1} rpls`.padEnd(7, ' ');
          const author = (t.author || 'ANON').padEnd(15, ' ').substring(0, 15);
          const tagsStr = t.tags && t.tags.length > 0 ? `[${t.tags.join(',')}] ` : '';
          const title = (tagsStr + t.title).padEnd(46, ' ').substring(0, 46);
          term.setCursor(2, row); term.print(`[${num}] `, 14, 0); term.print(`${replies}  `, 10, 0); term.print(`${author}  `, 7, 0); term.print(`${title}`, 15, 0);
          term.addHitRegion(2, row, 76, 1, `thread-${num}`, () => this.readForumThread(t, cat), t.title, num);
        });
      }
      term.setCursor(2, 20); term.print(`Type (1-${Math.min(7, threads.length)}) to read · [N] New Thread (Multi-Line Editor)`, 14, 0);
      this.renderFooter([{ key: 'N', label: 'New Thread', action: () => this.createForumThread(cat) }]);
    }

    readForumThread(thread, cat, page = 0) {
      window.CyberBBS.App.pushScreen(`FORUM_THREAD_${thread.id}`, () => {
        const lines = [];
        (thread.posts || []).forEach(p => {
          const badge = p.role === 'SYSOP' ? '[SYSOP]' : '[MEMBER]';
          lines.push(`#${p.postNum} by ${p.author} ${badge} (${p.date}):`);
          this.wrapTextToLines(p.body, 72).forEach(wl => lines.push('  ' + wl));
          lines.push('· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·');
        });
        this.renderPagedTextView(`THREAD #${thread.id}`, thread.title, lines, [{ key: 'R', label: 'Reply (Editor)', action: () => this.replyToForumThread(thread, cat) }], page);
      });
    }

    createForumThread(cat) {
      const term = window.CyberBBS.Term;
      term.promptInline('NEW THREAD (1/3)', 'Enter Thread Title:', '', (title) => {
        if (!title) { this.renderForumCategoryThreads(cat); return; }
        term.promptInline('NEW THREAD (2/3)', 'Enter Tags (comma-separated):', 'retro, bbs', (tags) => {
          term.promptMultiline('NEW THREAD (3/3) // MULTI-LINE EDITOR', `Board: ${cat.title}`, (body) => {
            if (!body) { this.renderForumCategoryThreads(cat); return; }
            const user = window.CyberBBS.Store.currentUser;
            const author = user ? user.handle : 'GUEST';
            const tagArray = tags ? tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
            const newThread = window.CyberBBS.Store.createThread(cat.id, title, author, body, tagArray);
            term.showNotice('THREAD POSTED (+15 BBS CREDITS)!');
            if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
            setTimeout(() => {
              const bots = ['ACID_BURN', 'ZERO_COOL', 'LORD_NIKON', 'PHANTOM_PHREAK', 'CRASH_OVERRIDE'];
              const botName = bots[Math.floor(Math.random() * bots.length)];
              window.CyberBBS.Store.replyToThread(newThread.id, botName, `Great write-up on "${title.substring(0, 28)}"! FidoNet echo propagation working smoothly!`);
              window.CyberBBS.Term.showNotice(`*** ECHO BOT ${botName} REPLIED TO THREAD #${newThread.id}! ***`);
              if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
            }, 8500);
            this.renderForumCategoryThreads(cat);
          }, () => this.renderForumCategoryThreads(cat));
        }, () => this.renderForumCategoryThreads(cat));
      }, () => this.renderForumCategoryThreads(cat));
    }

    replyToForumThread(thread, cat) {
      const term = window.CyberBBS.Term;
      term.promptMultiline('REPLY TO THREAD // MULTI-LINE EDITOR', `Re: ${thread.title.substring(0, 48)}`, (body) => {
        if (!body) { this.readForumThread(thread, cat); return; }
        const author = window.CyberBBS.Store.currentUser ? window.CyberBBS.Store.currentUser.handle : 'GUEST';
        window.CyberBBS.Store.replyToThread(thread.id, author, body);
        term.showNotice('REPLY POSTED (+10 BBS CREDITS)!');
        if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
        this.readForumThread(thread, cat);
      }, () => this.readForumThread(thread, cat));
    }

    // 3. NETMAIL PRIVATE MAIL
    openNetmail() { window.CyberBBS.App.pushScreen('NETMAIL_INBOX', () => this.renderNetmailInbox()); }

    renderNetmailInbox() {
      const store = window.CyberBBS.Store, term = window.CyberBBS.Term;
      const handle = store.currentUser ? store.currentUser.handle : 'GUEST';
      const mails = store.getNetmail().filter(m => m.to === 'ALL' || m.to === handle || m.from === handle);

      this.renderHeader(`NETMAIL // PRIVATE MAILBOX (${store.getUnreadMailCount()} UNREAD)`);
      term.println(`  #   ST   FROM             TO               SUBJECT`, 11, 0);
      term.println(`  ──  ───  ───────────────  ───────────────  ─────────────────────────────────`, 8, 0);
      if (!mails.length) term.println(`\r\n  NO PRIVATE MESSAGES IN YOUR MAILBOX. PRESS [C] TO COMPOSE!`, 14, 0);
      else {
        mails.slice(0, 7).forEach((m, idx) => {
          const row = 5 + idx * 2, num = idx + 1;
          term.setCursor(2, row);
          term.print(`[${num}] `, 14, 0);
          term.print(`${m.read ? '   ' : 'NEW'}  `, m.read ? 8 : 12, 0);
          term.print(`${m.from.padEnd(15, ' ').substring(0, 15)}  `, 10, 0);
          term.print(`${m.to.padEnd(15, ' ').substring(0, 15)}  `, 7, 0);
          term.print(`${m.subject.padEnd(33, ' ').substring(0, 33)}`, m.read ? 7 : 15, 0);
          term.addHitRegion(2, row, 76, 1, `mail-${num}`, () => this.readNetmail(m), m.subject, num);
        });
      }
      term.setCursor(2, 20); term.print(`Type (1-${Math.min(7, mails.length)}) to read · [C] Compose Netmail · [ESC] Back`, 14, 0);
      this.renderFooter([{ key: 'C', label: 'Compose Mail', action: () => this.composeNetmail('DR. NOISE', '') }]);
    }

    readNetmail(mail) {
      window.CyberBBS.Store.markMailRead(mail.id);
      window.CyberBBS.App.pushScreen(`NETMAIL_READ_${mail.id}`, () => {
        const lines = [`FROM   : ${mail.from}    TO: ${mail.to}`, `DATE   : ${mail.date}`, `SUBJECT: ${mail.subject}`, '────────────────────────────────────────────────────────────────────────────', ...this.wrapTextToLines(mail.body, 74)];
        this.renderPagedTextView('NETMAIL MESSAGE', mail.subject, lines, [
          { key: 'R', label: 'Reply', action: () => this.composeNetmail(mail.from, `Re: ${mail.subject}`) },
          { key: 'D', label: 'Delete', action: () => { window.CyberBBS.Store.deleteNetmail(mail.id); window.CyberBBS.Term.showNotice('NETMAIL DELETED.'); window.CyberBBS.App.goBack(); } }
        ]);
      });
    }

    composeNetmail(defaultTo = 'DR. NOISE', defaultSubj = '') {
      const term = window.CyberBBS.Term;
      term.promptInline('COMPOSE NETMAIL (1/3)', 'Recipient Handle (e.g. DR. NOISE, ACID_BURN):', defaultTo, (to) => {
        if (!to) { this.renderNetmailInbox(); return; }
        term.promptInline('COMPOSE NETMAIL (2/3)', 'Subject Line:', defaultSubj, (subj) => {
          if (!subj) { this.renderNetmailInbox(); return; }
          term.promptMultiline('COMPOSE NETMAIL (3/3) // EDITOR', `To: ${to.toUpperCase()} | Subj: ${subj}`, (body) => {
            if (!body) { this.renderNetmailInbox(); return; }
            window.CyberBBS.Store.sendNetmailWithBotReply(to, subj, body);
            term.showNotice(`NETMAIL QUEUED FOR ${to.toUpperCase()}!`);
            if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
            this.renderNetmailInbox();
          }, () => this.renderNetmailInbox());
        }, () => this.renderNetmailInbox());
      }, () => this.renderNetmailInbox());
    }

    // 4. FILE AREAS, SEARCH, FILE_ID.DIZ & ZMODEM THEATER
    openFiles() { window.CyberBBS.App.pushScreen('FILE_AREAS', () => this.renderFileAreas()); }

    renderFileAreas() {
      this.renderHeader('FILE AREAS // NUMBERED CATALOG & SEARCH');
      const term = window.CyberBBS.Term, store = window.CyberBBS.Store;
      term.println(`  #  AREA NAME                       FILES  DESCRIPTION`, 11, 0);
      term.println(`  ─  ──────────────────────────────  ─────  ──────────────────────────────────`, 8, 0);
      store.fileAreas.forEach((a, idx) => {
        const row = 5 + idx * 2;
        const count = a.code === '08' ? 'LOCAL' : `${store.getCatalogFiles(a.code).length} DIZ`;
        term.setCursor(2, row); term.print(`[${a.num}] `, 14, 0); term.print(`${a.name.padEnd(30, ' ')}  `, 15, 0); term.print(`${count.padEnd(5, ' ')}  `, 10, 0); term.print(`${a.desc}`, 7, 0);
        term.addHitRegion(2, row, 76, 1, `area-${a.num}`, () => this.browseFileArea(a), a.name, a.num);
      });
      this.renderFooter([
        { key: 'S', label: 'Search FILES.BBS', action: () => this.searchFilesPrompt() },
        { key: 'U', label: 'Upload File', action: () => document.getElementById('bbs-file-input')?.click() }
      ]);
    }

    searchFilesPrompt() {
      const term = window.CyberBBS.Term;
      term.promptInline('FILES.BBS GLOBAL SEARCH', 'Enter filename or keyword (e.g. PKZIP, ANSI, LORD):', '', (kw) => {
        this.browseFileList(`SEARCH RESULTS: "${kw.toUpperCase()}"`, window.CyberBBS.Store.searchCatalogFiles(kw));
      }, () => this.renderFileAreas());
    }

    async browseFileArea(area) {
      window.CyberBBS.App.pushScreen(`FILE_AREA_${area.code}`, async () => {
        let files = [];
        if (area.code === '08') {
          const userUploads = await window.CyberBBS.Store.getUploadFiles();
          files = (userUploads || []).map(u => ({
            name: u.name, size: u.size, cost: 0, uploader: u.uploader, downloads: 1, desc: `Uploaded on ${u.date}`,
            diz: `╔═══════════════════════════════════════════╗\n║ LOCAL SANDBOX UPLOAD: ${u.name.padEnd(19, ' ')} ║\n║ Uploader: ${u.uploader.padEnd(31, ' ')} ║\n╚═══════════════════════════════════════════╝`,
            blobData: u.data
          }));
        } else files = window.CyberBBS.Store.getCatalogFiles(area.code);
        this.browseFileList(`AREA ${area.code} : ${area.name}`, files);
      });
    }

    browseFileList(headerSub, files) {
      this.renderHeader(`FILES // ${headerSub}`);
      const term = window.CyberBBS.Term;
      if (!files.length) term.println(`\r\n  NO MATCHING FILES FOUND. PRESS [U] TO UPLOAD OR [S] TO SEARCH!`, 14, 0);
      else {
        term.println(`  #  FILENAME       SIZE     COST   UPLOADER        DESCRIPTION`, 11, 0);
        term.println(`  ─  ─────────────  ───────  ─────  ──────────────  ──────────────────────────`, 8, 0);
        files.slice(0, 7).forEach((f, idx) => {
          const row = 5 + idx * 2, num = idx + 1;
          term.setCursor(2, row);
          term.print(`[${num}] `, 14, 0);
          term.print(`${f.name.padEnd(14, ' ')} `, 15, 0);
          term.print(`${`${Math.ceil(f.size / 1024)}K`.padEnd(7, ' ')} `, 7, 0);
          term.print(`${`${f.cost}CR`.padEnd(5, ' ')} `, 10, 0);
          term.print(`${(f.uploader || 'SYSOP').padEnd(14, ' ').substring(0, 14)} `, 11, 0);
          term.print(`${f.desc.substring(0, 26)}`, 7, 0);
          term.addHitRegion(2, row, 76, 1, `file-${num}`, () => this.inspectFileDiz(f), f.name, num);
        });
      }
      term.setCursor(2, 20); term.print(`Select file (1-${Math.min(7, files.length)}) to view FILE_ID.DIZ & Download.`, 14, 0);
      this.renderFooter([
        { key: 'S', label: 'Search', action: () => this.searchFilesPrompt() },
        { key: 'U', label: 'Upload File', action: () => document.getElementById('bbs-file-input')?.click() }
      ]);
    }

    inspectFileDiz(file) {
      window.CyberBBS.App.pushScreen(`FILE_DIZ_${file.name}`, () => {
        this.renderHeader(`FILE_ID.DIZ // ${file.name}`);
        const term = window.CyberBBS.Term;
        term.println(`  FILENAME : ${file.name}   |   SIZE: ${file.size} bytes (${Math.ceil(file.size / 1024)} KB)`, 15, 0);
        term.println(`  UPLOADER : ${file.uploader || 'DR. NOISE'}   |   COST: ${file.cost} CR   |   PROTOCOL: ZMODEM-90`, 10, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        (file.diz || file.desc).split('\n').forEach(dl => term.println(`    ${dl}`, 11, 0));
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  Press [1] to start ZMODEM-90 streaming transfer.`, 14, 0);
        this.renderFooter([
          { key: '1', label: 'Download (ZMODEM)', action: () => this.startZmodemDownload(file) },
          { key: '2', label: 'Back to List', action: () => window.CyberBBS.App.goBack() }
        ]);
      });
    }

    startZmodemDownload(file) {
      this.renderHeader(`ZMODEM RECEIVE // ${file.name}`);
      const term = window.CyberBBS.Term, audio = window.CyberBBS.Audio;
      let progress = 0;
      const totalBlocks = Math.max(10, Math.ceil(file.size / 1024));
      this.stopActiveTimer();
      this.activeTimer = setInterval(() => {
        progress += 10;
        const currentBlock = Math.min(totalBlocks, Math.ceil((progress / 100) * totalBlocks));
        if (audio) audio.playTransferTick();
        term.setCursor(2, 6);
        term.println(`  Initiating ZMODEM-90 handshake with remote node...`, 10, 0);
        term.println(`  Receiving: ${file.name.padEnd(20, ' ')} Block ${currentBlock}/${totalBlocks} · CRC-32: OK`, 14, 0);
        const filled = Math.floor((progress / 100) * 50);
        term.setCursor(2, 9);
        term.println(`  Progress: [${'▓'.repeat(filled) + '░'.repeat(50 - filled)}] ${progress}%`, 11, 0);
        term.println(`  Baud Rate: 14,400 bps  ·  Throughput: 1,420 cps  ·  Errors: 0`, 7, 0);

        if (progress >= 100) {
          this.stopActiveTimer();
          if (audio) audio.playBell();
          window.CyberBBS.Store.recordTransfer(file.size, false);
          term.setCursor(2, 13);
          term.println(`  ==============================================================`, 10, 0);
          term.println(`  *** TRANSFER COMPLETE — CRC-32 VERIFIED (0 ERRORS) ***`, 10, 0);
          term.println(`  File saved to your local downloads folder!`, 15, 0);
          term.println(`  ==============================================================`, 10, 0);
          const blob = file.blobData ? new Blob([file.blobData]) : new Blob([`${file.diz || ''}\r\n\r\nCYBER BBS ARCHIVE FILE: ${file.name}\r\nDescription: ${file.desc}\r\n`], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = file.blobData ? file.name : file.name + '.TXT'; a.click();
          URL.revokeObjectURL(url);
          this.renderFooter([{ key: '1', label: 'Done', action: () => window.CyberBBS.App.goBack() }]);
        }
      }, 240);

      this.renderFooter([{ key: 'C', label: 'Abort Transfer', action: () => { this.stopActiveTimer(); term.showNotice('ZMODEM TRANSFER ABORTED.'); window.CyberBBS.App.goBack(); } }]);
    }

    runUploadTheater(fileName, fileSize, rewardCredits) {
      this.renderHeader(`ZMODEM TRANSMIT // UPLOADING ${fileName}`);
      const term = window.CyberBBS.Term, audio = window.CyberBBS.Audio;
      let progress = 0;
      const totalBlocks = Math.max(8, Math.ceil(fileSize / 1024));
      this.stopActiveTimer();
      this.activeTimer = setInterval(() => {
        progress += 12.5;
        const pct = Math.min(100, Math.round(progress));
        const curBlock = Math.min(totalBlocks, Math.ceil((pct / 100) * totalBlocks));
        if (audio) audio.playTransferTick();
        term.setCursor(2, 6);
        term.println(`  Sending ZMODEM stream to Cyber BBS File Area 08...`, 10, 0);
        term.println(`  Transmitting: ${fileName.padEnd(20, ' ')} Block ${curBlock}/${totalBlocks} · CRC-32: OK`, 14, 0);
        const filled = Math.floor((pct / 100) * 50);
        term.setCursor(2, 9);
        term.println(`  Progress: [${'▓'.repeat(filled) + '░'.repeat(50 - filled)}] ${pct}%`, 11, 0);
        if (pct >= 100) {
          this.stopActiveTimer();
          if (audio) audio.playFanfare();
          term.setCursor(2, 13);
          term.println(`  ==============================================================`, 10, 0);
          term.println(`  *** UPLOAD VERIFIED! DR. NOISE REWARDED +${rewardCredits} CREDITS! ***`, 14, 0);
          term.println(`  Your UL/DL Ratio is now ${window.CyberBBS.Store.getRatio()}!`, 15, 0);
          term.println(`  ==============================================================`, 10, 0);
          this.renderFooter([{ key: '1', label: 'View Area 08', action: () => this.browseFileArea({ code: '08', name: 'YOUR UPLOADS (LOCAL SANDBOX)' }) }]);
        }
      }, 220);
    }

    // 5. PHOTO GRABBER & IMAGE-TO-ANSI
    async openPhotos() {
      window.CyberBBS.App.pushScreen('PHOTOS_LIST', async () => {
        this.renderHeader('PHOTO GRABBER // REAL IMAGE SEARCH & ANSI CONVERTER');
        const term = window.CyberBBS.Term;
        term.println(`\r\n  Connecting to Wikimedia Commons image archive...`, 14, 0);
        const res = await window.CyberBBS.Net.searchImages('vintage computer terminal');
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
        const row = 5 + idx * 2, num = idx + 1;
        term.setCursor(2, row); term.print(`[${num}] `, 14, 0); term.print(`${(img.title || 'Photo').padEnd(40, ' ').substring(0, 40)}  `, 15, 0); term.print(`${(img.license || 'Public Domain').padEnd(14, ' ').substring(0, 14)}  `, 10, 0); term.print(`${img.width || 640}x${img.height || 480}`, 7, 0);
        term.addHitRegion(2, row, 76, 1, `photo-${num}`, () => this.renderAnsiPreview(img), img.title, num);
      });
      this.renderFooter([{ key: 'S', label: 'Search Topic', action: () => {
        term.promptInline('WIKIMEDIA SEARCH', 'Enter Image Search Topic:', 'space shuttle', async (q) => {
          if (q) { const r = await window.CyberBBS.Net.searchImages(q); this.items = r.images || []; this.renderPhotoList(); }
        }, () => this.renderPhotoList());
      }}]);
    }

    async renderAnsiPreview(img) {
      window.CyberBBS.App.pushScreen('PHOTO_PREVIEW', async () => {
        this.renderHeader('PHOTO // CONVERTING TO CP437 ANSI');
        const term = window.CyberBBS.Term;
        term.println(`\r\n  Downsampling image to 78x30 CP437 half-blocks (16-color VGA)...`, 14, 0);
        try {
          const ansiText = await window.CyberBBS.Ansi.convertImageToAnsi(img.url, 78, 30);
          term.clear();
          term.println(`  PHOTO PREVIEW: ${img.title.substring(0, 45)}  [${img.license}]`, 14, 0);
          term.print(ansiText);
          this.renderFooter([
            { key: '1', label: 'Open Image', action: () => window.open(img.url, '_blank', 'noopener') },
            { key: '2', label: 'Save .ANS (SAUCE)', action: () => {
              const blob = window.CyberBBS.Ansi.createAnsiBlob(ansiText, img.title);
              const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'PHOTO.ANS'; a.click(); URL.revokeObjectURL(url);
              term.showNotice('SAVED AS PHOTO.ANS WITH SAUCE00 METADATA');
            }}
          ]);
        } catch (err) {
          term.println(`\r\n  *** CROSS-ORIGIN IMAGE PROTECTED — OPEN DIRECTLY IN BROWSER ***`, 12, 0);
          term.println(`  ${img.url}`, 11, 0);
          this.renderFooter([{ key: '1', label: 'Open Image', action: () => window.open(img.url, '_blank', 'noopener') }]);
        }
      });
    }

    // 6. GITHUB VAULT
    async openGitHub() {
      window.CyberBBS.App.pushScreen('GITHUB_LIST', async () => {
        this.renderHeader('GITHUB VAULT // PURE TEXT REPOSITORY BROWSER');
        const term = window.CyberBBS.Term;
        term.println(`\r\n  Querying GitHub REST API v3 for retro computing repositories...`, 14, 0);
        const res = await window.CyberBBS.Net.searchGitHubRepos('retro computing terminal dos');
        this.items = res.repos || [];
        this.renderGitHubList();
      });
    }

    renderGitHubList() {
      this.renderHeader('GITHUB VAULT // TEXT REPOSITORY DIRECTORY');
      const term = window.CyberBBS.Term;
      term.println(`  #   STARS   LANG      TAGS / TOPICS      REPOSITORY & DESCRIPTION`, 11, 0);
      term.println(`  ──  ──────  ────────  ─────────────────  ──────────────────────────────────`, 8, 0);
      this.items.slice(0, 7).forEach((repo, idx) => {
        const row = 5 + idx * 2, num = idx + 1;
        const stars = `★${repo.stargazers_count}`.padEnd(6, ' ');
        const lang = (repo.language || 'Code').padEnd(8, ' ').substring(0, 8);
        const tags = (repo.topics && repo.topics.length > 0 ? `#${repo.topics.slice(0, 2).join(' #')}` : '#retro').padEnd(17, ' ').substring(0, 17);
        const name = (repo.full_name || repo.name).padEnd(34, ' ').substring(0, 34);
        term.setCursor(2, row); term.print(`[${num}] `, 14, 0); term.print(`${stars}  `, 14, 0); term.print(`${lang}  `, 10, 0); term.print(`${tags}  `, 11, 0); term.print(`${name}`, 15, 0);
        term.addHitRegion(2, row, 76, 1, `repo-${num}`, () => this.viewRepoDetail(repo), repo.name, num);
      });
      this.renderFooter([
        { key: 'S', label: 'Search Query', action: () => {
          term.promptInline('GITHUB SEARCH', 'Enter Repository Keyword:', '', (q) => {
            if (q) window.CyberBBS.Net.searchGitHubRepos(q).then(r => { this.items = r.repos || []; this.renderGitHubList(); });
          }, () => this.renderGitHubList());
        }},
        { key: 'T', label: 'Filter Tags', action: () => {
          term.promptInline('FILTER TAGS', 'Enter Topic/Tag (e.g. dos, emulator):', 'dos', (tag) => {
            if (tag) window.CyberBBS.Net.searchGitHubRepos('retro', tag).then(r => { this.items = r.repos || []; this.renderGitHubList(); });
          }, () => this.renderGitHubList());
        }}
      ]);
    }

    viewRepoDetail(repo) {
      window.CyberBBS.App.pushScreen(`GITHUB_REPO_${repo.name}`, () => {
        this.renderHeader(`GITHUB // ${repo.name.toUpperCase()}`);
        const term = window.CyberBBS.Term, branch = repo.default_branch || 'main';
        term.println(`\r\n  REPOSITORY OVERVIEW`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  Name        : ${repo.full_name || repo.name}  (Branch: ${branch})`, 15, 0);
        term.println(`  Stars       : ★${repo.stargazers_count}    Forks: ${repo.forks_count || 0}    Language: ${repo.language || 'Various'}`, 14, 0);
        term.println(`  Tags/Topics : ${(repo.topics && repo.topics.length > 0 ? repo.topics.join(', ') : 'retro, computing')}`, 11, 0);
        term.println(`  Description : ${(repo.description || 'No description provided.').substring(0, 62)}`, 7, 0);
        term.println(`  URL         : ${repo.html_url || `https://github.com/${repo.owner?.login}/${repo.name}`}`, 8, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`\r\n  Select action (1-4):`, 15, 0);
        this.renderFooter([
          { key: '1', label: 'Read README.md', action: () => this.readRepoReadme(repo) },
          { key: '2', label: 'Browse Files (DIR)', action: () => this.browseRepoContents(repo, '') },
          { key: '3', label: `Download ZIP (${branch})`, action: () => {
            window.open(`https://github.com/${repo.owner?.login}/${repo.name}/archive/refs/heads/${branch}.zip`, '_blank', 'noopener');
            term.showNotice(`DOWNLOADING ${branch.toUpperCase()}.ZIP ARCHIVE...`);
          }},
          { key: '4', label: 'Back', action: () => window.CyberBBS.App.goBack() }
        ]);
      });
    }

    async readRepoReadme(repo) {
      window.CyberBBS.App.pushScreen(`README_${repo.name}`, async () => {
        this.renderHeader(`GITHUB // README : ${repo.name.toUpperCase()}`);
        const term = window.CyberBBS.Term;
        term.println(`\r\n  Streaming README.md from GitHub API...`, 14, 0);
        const text = await window.CyberBBS.Net.fetchRepoReadme(repo.owner?.login || 'dosbox-staging', repo.name);
        this.renderPagedTextView(`README: ${repo.name}`, `${repo.full_name} — Scroll with Wheel or [N]/[P]`, this.wrapTextToLines(text, 74), [
          { key: 'G', label: 'Open GitHub', action: () => window.open(repo.html_url || `https://github.com/${repo.owner?.login}/${repo.name}`, '_blank', 'noopener') }
        ]);
      });
    }

    async browseRepoContents(repo, path = '', page = 0) {
      window.CyberBBS.App.pushScreen(`DIR_${repo.name}_${path}`, async () => {
        this.renderHeader(`GITHUB DIR // ${repo.name.toUpperCase()}/${path}`);
        const term = window.CyberBBS.Term;
        term.println(`\r\n  Fetching directory listing for /${path}...`, 14, 0);
        const owner = repo.owner?.login || 'dosbox-staging';
        const files = await window.CyberBBS.Net.fetchRepoContents(owner, repo.name, path);
        term.clear();
        this.renderHeader(`DIR: ${repo.name}/${path}`);
        term.println(`  #   ENTRY NAME                            TYPE       SIZE`, 11, 0);
        term.println(`  ──  ────────────────────────────────────  ─────────  ───────────────────────`, 8, 0);
        const entries = [];
        if (path) {
          const parentPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
          entries.push({ name: '.. (PARENT DIRECTORY)', path: parentPath, isDir: true, type: '<DIR>', size: 0 });
        }
        entries.push(...files);
        const slice = entries.slice(page * 7, (page + 1) * 7);
        slice.forEach((f, idx) => {
          const row = 5 + idx * 2, num = idx + 1;
          term.setCursor(2, row); term.print(`[${num}] `, 14, 0); term.print(`${f.name.padEnd(36, ' ').substring(0, 36)}  `, f.isDir ? 11 : 15, 0); term.print(`${f.type.padEnd(9, ' ')}  `, 10, 0); term.print(`${f.size ? `${f.size} bytes` : ''}`, 7, 0);
          term.addHitRegion(2, row, 76, 1, `dirent-${num}`, async () => {
            if (f.isDir) this.browseRepoContents(repo, f.path, 0);
            else {
              const fileText = await window.CyberBBS.Net.fetchRepoFileText(f, owner, repo.name);
              this.renderPagedTextView(`FILE: ${f.name}`, `${repo.full_name}/${f.path}`, fileText.split('\n'));
            }
          }, f.name, num);
        });
        term.setCursor(2, 20); term.print(`Select [1-${slice.length}] to open folder or inspect source file.`, 14, 0);
        this.renderFooter([
          { key: 'N', label: 'Next Pg', action: () => { if ((page + 1) * 7 < entries.length) this.browseRepoContents(repo, path, page + 1); } },
          { key: 'P', label: 'Prev Pg', action: () => { if (page > 0) this.browseRepoContents(repo, path, page - 1); } }
        ]);
      });
    }

    // 7. DOOR GAMES LAUNCHER
    openGames() { window.CyberBBS.App.pushScreen('DOOR_GAMES', () => this.renderGamesMenu()); }

    renderGamesMenu() {
      this.renderHeader('DOOR GAMES // 7 COMPLETE ENTERTAINMENT MODULES');
      const term = window.CyberBBS.Term, games = window.CyberBBS.Games;
      const list = [
        { num: 1, name: 'CYBER LORD RPG v2', desc: 'Zones, Tavern, King\'s Armory & Red Dragon Boss', act: () => games.playCyberLord('TOWN') },
        { num: 2, name: 'STAR TRADE v2.0', desc: '30-Sector Space Commerce with Live ASCII Radar Map', act: () => games.playStarTrade() },
        { num: 3, name: 'BLACKJACK CASINO', desc: '52-Card Deck & ASCII Cards — Wager BBS Credits', act: () => games.playBlackjack() },
        { num: 4, name: 'RETRO HANGMAN', desc: 'Interactive A-Z Guessing with CP437 Gallows', act: () => games.playHangman() },
        { num: 5, name: 'ZORK: MAINFRAME', desc: 'Text Adventure in Dr. Noise\'s Bunker', act: () => games.playZork() },
        { num: 6, name: 'TRIVIA QUIZ NIGHT', desc: '1990s BBS/DOS Trivia + Top 10 Hall of Fame', act: () => games.playTrivia() },
        { num: 7, name: 'SYSOP FORTUNE', desc: 'Categorized Demoscene, Hacker & 90s Ad Quotes', act: () => games.playFortune() }
      ];
      term.println(`  #  GAME MODULE           DESCRIPTION`, 11, 0);
      term.println(`  ─  ────────────────────  ───────────────────────────────────────────────────`, 8, 0);
      list.forEach((g, idx) => {
        const row = 5 + idx * 2;
        term.setCursor(2, row); term.print(`[${g.num}] `, 14, 0); term.print(`${g.name.padEnd(20, ' ')}  `, 15, 0); term.print(`${g.desc}`, 7, 0);
        term.addHitRegion(2, row, 76, 1, `game-${g.num}`, g.act, g.name, g.num);
      });
      this.renderFooter();
    }

    // 8. ANSI ART GALLERY, CONTEST VOTING & INTERNAL ANSI EDITOR
    showAnsiGallery(artIdx = 0) {
      window.CyberBBS.App.pushScreen(`ANSI_GALLERY_${artIdx}`, () => {
        const term = window.CyberBBS.Term, store = window.CyberBBS.Store;
        const artworks = store.getAnsiArtworks(), votes = store.getAnsiVotes();
        const idx = ((artIdx % artworks.length) + artworks.length) % artworks.length;
        const art = artworks[idx];
        this.renderHeader(`ANSI GALLERY (${idx + 1}/${artworks.length}) // CONTEST VOTES: ★${votes[art.id] || 0}`);
        term.println(`  TITLE: ${art.title}  ·  AUTHOR: ${art.author}  ·  GROUP: ${art.group}`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.print(art.ansi + '\r\n');
        this.renderFooter([
          { key: 'N', label: 'Next Art', action: () => this.showAnsiGallery(idx + 1) },
          { key: 'V', label: 'Vote (+1)', action: () => {
            const total = store.voteAnsiArtwork(art.id);
            if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
            term.showNotice(`VOTED FOR "${art.title}" (TOTAL: ${total})! UNLOCKED [ANSI MASTER] BADGE!`);
            this.showAnsiGallery(idx);
          }},
          { key: 'S', label: 'SAUCE Info', action: () => this.showSauceInspector(art, idx) },
          { key: 'E', label: 'ANSI Editor', action: () => this.openAnsiEditor() },
          { key: 'D', label: 'Save .ANS', action: () => {
            const blob = window.CyberBBS.Ansi.createAnsiBlob(art.ansi, art.title, art.author);
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${art.id.toUpperCase()}.ANS`; a.click(); URL.revokeObjectURL(url);
            term.showNotice(`EXPORTED ${art.id.toUpperCase()}.ANS WITH SAUCE00 RECORD!`);
          }}
        ]);
      });
    }

    showSauceInspector(art, returnIdx) {
      this.renderHeader(`SAUCE00 METADATA INSPECTOR // ${art.title}`);
      const term = window.CyberBBS.Term;
      term.println(`\r\n  SAUCE RECORD HEADER (Standard Architecture for Universal Comment Extensions)`, 14, 0);
      term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
      term.println(`  ID / Version : SAUCE00`, 15, 0);
      term.println(`  Title        : ${art.title}`, 15, 0);
      term.println(`  Author       : ${art.author}`, 10, 0);
      term.println(`  Group        : ${art.group}`, 11, 0);
      term.println(`  Date         : ${art.date}`, 7, 0);
      term.println(`  Dimensions   : 80 Columns x 25 Rows   |   iCE Colors: ${art.iceColor ? 'ENABLED (16 BG)' : 'DISABLED'}`, 14, 0);
      this.renderFooter([{ key: '1', label: 'Back to Art', action: () => this.showAnsiGallery(returnIdx) }]);
    }

    openAnsiEditor() {
      window.CyberBBS.App.pushScreen('ANSI_EDITOR', () => {
        const term = window.CyberBBS.Term;
        const cols = 74, rows = 12;
        const brushes = ['█', '▓', '▒', '░', '▀', '▄', '╔', '═', '╗', '║', '╚', '╝', '♦', '★', ' '];
        let curBrushIdx = 0, curFg = 11, curBg = 0, curX = 10, curY = 5;
        const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ ch: ' ', fg: 7, bg: 0 })));

        const redrawEditor = () => {
          this.renderHeader(`ANSI ART EDITOR // BRUSH: [${brushes[curBrushIdx]}]  FG:${curFg}  BG:${curBg}`);
          term.println(`  Draw with Mouse Click/Drag or Arrows+Space · [B] Brush [C] FG Color [K] BG`, 14, 0);
          term.println(`  ┌${'─'.repeat(cols)}┐`, 8, 0);
          for (let r = 0; r < rows; r++) {
            term.setCursor(2, 5 + r); term.print('│', 8, 0);
            for (let c = 0; c < cols; c++) {
              const cell = grid[r][c];
              if (r === curY && c === curX) term.putChar(cell.ch === ' ' ? '+' : cell.ch, 14, 4);
              else term.putChar(cell.ch, cell.fg, cell.bg);
            }
            term.print('│', 8, 0);
          }
          term.setCursor(2, 5 + rows); term.print(`└${'─'.repeat(cols)}┘`, 8, 0);

          const plotAt = (c, r) => {
            const gx = c - 3, gy = r - 5;
            if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
              curX = gx; curY = gy;
              grid[gy][gx] = { ch: brushes[curBrushIdx], fg: curFg, bg: curBg };
              redrawEditor();
            }
          };
          term.onCustomMouseDown = (c, r) => { plotAt(c, r); return true; };
          term.onCustomMouseMove = (c, r) => { plotAt(c, r); };

          if (window.CyberBBS.Games) {
            window.CyberBBS.Games.customKeyHandler = (e) => {
              if (e.key === 'ArrowUp') { curY = Math.max(0, curY - 1); redrawEditor(); return true; }
              if (e.key === 'ArrowDown') { curY = Math.min(rows - 1, curY + 1); redrawEditor(); return true; }
              if (e.key === 'ArrowLeft') { curX = Math.max(0, curX - 1); redrawEditor(); return true; }
              if (e.key === 'ArrowRight') { curX = Math.min(cols - 1, curX + 1); redrawEditor(); return true; }
              if (e.key === ' ') {
                grid[curY][curX] = { ch: brushes[curBrushIdx], fg: curFg, bg: curBg };
                curX = Math.min(cols - 1, curX + 1); redrawEditor(); return true;
              }
              return false;
            };
          }

          const buildAnsiString = () => {
            let out = '';
            for (let r = 0; r < rows; r++) {
              let line = '  ';
              for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                const fgCode = cell.fg < 8 ? 30 + cell.fg : 90 + (cell.fg - 8);
                const bgCode = cell.bg < 8 ? 40 + cell.bg : 100 + (cell.bg - 8);
                line += `\x1b[${fgCode};${bgCode}m${cell.ch}`;
              }
              out += line + '\x1b[0m\r\n';
            }
            return out;
          };

          this.renderFooter([
            { key: 'B', label: 'Brush', action: () => { curBrushIdx = (curBrushIdx + 1) % brushes.length; redrawEditor(); } },
            { key: 'C', label: 'FG Color', action: () => { curFg = (curFg + 1) % 16; redrawEditor(); } },
            { key: 'K', label: 'BG Color', action: () => { curBg = (curBg + 1) % 8; redrawEditor(); } },
            { key: 'S', label: 'Save to Gallery', action: () => {
              const ansiStr = buildAnsiString(), author = window.CyberBBS.Store.currentUser?.handle || 'GUEST';
              term.promptInline('SAVE ANSI ART', 'Enter Artwork Title:', 'MY_ANSI_95', (title) => {
                window.CyberBBS.Store.saveCustomAnsi(title || 'CUSTOM_ART', author, ansiStr);
                window.CyberBBS.Store.rewardCredits(25);
                term.showNotice('ARTWORK SAVED TO GALLERY (+25 CR)!');
                this.showAnsiGallery(0);
              }, redrawEditor);
            }},
            { key: 'X', label: 'Clear', action: () => { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c] = { ch: ' ', fg: 7, bg: 0 }; redrawEditor(); } }
          ]);
        };
        redrawEditor();
      });
    }

    // 9. WORLD CLOCKS
    openWorldClock() {
      window.CyberBBS.App.pushScreen('WORLD_CLOCKS', () => {
        const term = window.CyberBBS.Term, store = window.CyberBBS.Store;
        const renderClocks = () => {
          const tzList = store.getClockCities();
          term.setCursor(2, 4);
          term.println(`  GLOBAL TIMEZONE TELEMETRY MATRIX (${tzList.length} HUBS ACTIVE)`, 14, 0);
          term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
          const now = new Date();
          for (let idx = 0; idx < 7; idx++) {
            const row = 6 + idx * 2;
            term.setCursor(2, row);
            const item = tzList[idx];
            if (item) {
              try {
                const timeStr = now.toLocaleTimeString('en-US', { timeZone: item.tz, hour12: false });
                const dateStr = now.toLocaleDateString('en-US', { timeZone: item.tz, month: 'short', day: '2-digit' });
                const isDay = parseInt(timeStr.split(':')[0], 10) >= 6 && parseInt(timeStr.split(':')[0], 10) < 19;
                term.print(`  ${item.city.padEnd(28, ' ').substring(0, 28)} `, 15, 0);
                term.print(`${item.code.padEnd(14, ' ')} `, 11, 0);
                term.print(`${dateStr}  `, 7, 0);
                term.print(`${timeStr}  `, 14, 0);
                term.print(`${isDay ? '☼ DAY  ' : '☽ NIGHT'}`, isDay ? 14 : 9, 0);
              } catch (e) {}
            } else term.print(' '.repeat(74), 7, 0);
          }
          term.setCursor(2, 20);
          term.print(`  UTC Master: ${now.toUTCString().substring(17, 25)}  ·  Press [A] Add City or [R] Remove Last`, 10, 0);
        };

        this.renderHeader('WORLD CLOCKS // HORAS MUNDIAIS TELEMETRY');
        renderClocks();
        this.activeTimer = setInterval(renderClocks, 1000);
        this.renderFooter([
          { key: 'A', label: 'Add Hub', action: () => {
            const presets = [
              { city: 'Seoul / Busan', tz: 'Asia/Seoul', code: 'KST (UTC+9)' },
              { city: 'Toronto / Montreal', tz: 'America/Toronto', code: 'EST (UTC-5)' },
              { city: 'Buenos Aires', tz: 'America/Argentina/Buenos_Aires', code: 'ART (UTC-3)' },
              { city: 'Lisbon / Madrid', tz: 'Europe/Lisbon', code: 'WET (UTC+0)' },
              { city: 'Singapore', tz: 'Asia/Singapore', code: 'SGT (UTC+8)' }
            ];
            const cur = store.getClockCities();
            const next = presets.find(p => !cur.some(c => c.tz === p.tz));
            if (next && cur.length < 7) { cur.push(next); store.saveClockCities(cur); term.showNotice(`ADDED ${next.city.toUpperCase()}!`); renderClocks(); }
            else term.showNotice('MAX 7 HUBS ACTIVE (PRESS [R] TO REMOVE ONE FIRST).');
          }},
          { key: 'R', label: 'Remove Hub', action: () => {
            const cur = store.getClockCities();
            if (cur.length > 1) { const removed = cur.pop(); store.saveClockCities(cur); term.showNotice(`REMOVED ${removed.city.toUpperCase()}.`); renderClocks(); }
          }}
        ]);
      });
    }

    // 10. WEATHER STATION 2.0 (HOURLY, 5-DAY, RAIN & MOON PHASES)
    async openWeather(city = '', forceRefresh = false) {
      window.CyberBBS.App.pushScreen('WEATHER_STATION', async () => {
        const net = window.CyberBBS.Net;
        const effectiveCity = (city && city.trim()) ? city.trim() : net.getUserCity();
        this.renderHeader('WEATHER STATION 2.0 // METEOROLOGICAL TELEMETRY');
        const term = window.CyberBBS.Term;
        term.println(`\r\n  Connecting to WMO Weather Satellite for ${effectiveCity.toUpperCase()}...`, 14, 0);

        const res = await net.fetchWeatherExtended(effectiveCity, forceRefresh);
        term.clear();
        this.renderHeader(`WEATHER STATION 2.0 // ${effectiveCity.toUpperCase()}`);

        const cur = res.current || {};
        const cond = net.weatherCodeToText(cur.weather_code || 0);
        const moon = res.moon || { name: 'Full Moon', icon: '🌕', illumination: 100, age: '14.8' };
        const badge = net.renderSourceBadge(res);

        term.println(`  CURRENT CONDITIONS: ${cond.toUpperCase()}  ·  ${badge}`, 15, 0);
        term.println(`  Temperature: ${cur.temperature_2m || 20}°C  Feels like: ${cur.apparent_temperature || cur.temperature_2m || 20}°C  Humidity: ${cur.relative_humidity_2m || 50}%`, 11, 0);
        term.println(`  Barometer: ${cur.surface_pressure || 1013} hPa  Wind: ${cur.wind_speed_10m || 8} km/h  Rain: ${cur.precipitation || 0} mm`, 7, 0);
        term.println(`  Moon Phase: ${moon.icon} ${moon.name.toUpperCase()} (Age: ${moon.age}d · Illum: ${moon.illumination}%)`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);

        // 24-Hour Forecast Sparkline
        if (res.hourly && res.hourly.temperature_2m && res.hourly.temperature_2m.length >= 8) {
          const temps = res.hourly.temperature_2m.slice(0, 12);
          const rainProb = (res.hourly.precipitation_probability || []).slice(0, 12);
          const spark = net.generateSparkline(temps);
          term.println(`  12-HOUR HOURLY TEMPERATURE TREND:`, 14, 0);
          term.println(`  [TEMP]: ${spark}  (Min: ${Math.min(...temps)}°C · Max: ${Math.max(...temps)}°C)`, 10, 0);
          const maxRain = rainProb.length ? Math.max(...rainProb) : 0;
          term.println(`  [RAIN]: Precip Chance: ${maxRain}% (Trend: ${rainProb.slice(0, 6).join('%, ')}%)`, 7, 0);
          term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        }

        // 5-Day Daily Outlook
        if (res.daily && res.daily.time) {
          term.println(`  5-DAY EXTENDED OUTLOOK:`, 14, 0);
          const days = res.daily.time.slice(0, 5);
          days.forEach((dayStr, i) => {
            const max = res.daily.temperature_2m_max?.[i] ?? 25;
            const min = res.daily.temperature_2m_min?.[i] ?? 15;
            const wCode = res.daily.weather_code?.[i] ?? 1;
            const wName = net.weatherCodeToText(wCode);
            const pChance = res.daily.precipitation_probability_max?.[i] ?? 0;
            term.println(`  · Day ${i + 1} (${dayStr}): ${wName.padEnd(20, ' ')} High: ${max}°C  Low: ${min}°C  Rain: ${pChance}%`, 7, 0);
          });
        }

        this.renderFooter([
          { key: '1', label: 'Change City', action: () => {
            term.promptInline('WEATHER TELEMETRY', 'Enter City Name (e.g. São Paulo, Tokyo):', effectiveCity, (nextCity) => {
              if (nextCity) this.openWeather(nextCity, true);
            }, () => this.openWeather(effectiveCity, false));
          }},
          { key: 'R', label: 'Refresh', action: () => this.openWeather(effectiveCity, true) }
        ]);
      });
    }

    // 11. CONTEXTUAL LIVE SYSOP CHAT
    openChat() {
      window.CyberBBS.App.pushScreen('SYSOP_CHAT', () => {
        const term = window.CyberBBS.Term, store = window.CyberBBS.Store, app = window.CyberBBS.App;
        term.clear(); term.clearHitRegions();
        const modeTag = app.lateNight ? 'AFTER HOURS 03:15 AM' : 'LIVE SPLIT SCREEN';
        term.println(`┌───────────────────[ SYSOP CHAT // ${modeTag} ]───────────────────┐`, 11, 0);
        term.println(`│ SysOp: DR. NOISE (Basement 486) · [1] Type Message · [ESC] Exit Chat     │`, 15, 0);
        term.println(`├────────────────────────────────────────────────────────────────────────────┤`, 11, 0);
        this.chatHistory.slice(-9).forEach((entry, idx) => {
          term.setCursor(1, 4 + idx);
          term.println(`${entry.who}> ${entry.text.substring(0, 66)}`, entry.who === 'DR. NOISE' ? 13 : 15, 0);
        });
        term.setCursor(0, 14); term.println(`├────────────────────────[ YOUR MESSAGE INPUT ]──────────────────────────────┤`, 11, 0);
        term.setCursor(1, 16); term.print(`Press [1] or ENTER to type a message to DR. NOISE...`, 14, 0);

        const generateSysOpReply = (msg) => {
          const m = msg.toLowerCase(), user = store.currentUser;
          const handle = user ? user.handle : 'GUEST', credits = user ? user.credits : 200;
          const ratio = store.getRatio(), rank = store.getUserRank(user);
          if (m.includes('ratio')) return `Your current UL/DL ratio is ${ratio}, ${handle}. Upload in Area 08 to boost it!`;
          if (m.includes('credit') || m.includes('cr')) return `You currently have ${credits} CR. Play Trivia Night or upload utilities for more!`;
          if (m.includes('rank') || m.includes('level')) return `You hold the rank of ${rank.title} (${rank.points} pts). Post in echoes to climb higher!`;
          if (m.includes('game') || m.includes('lord') || m.includes('zork')) return `Cyber Lord RPG v2 and the Zork Basement Mainframe adventure are online in Door [7]!`;
          if (m.includes('ansi') || m.includes('art')) return `Check out Door [8] — vote in the ANSI Contest or draw your own .ANS screen!`;
          if (m.includes('modem') || m.includes('14.4') || m.includes('baud')) return `This USRobotics Courier 14.4k HST Dual Standard has been humming since 1993.`;
          if (app.lateNight) return `*yawns* It's past 3 AM in the basement... glad to see another night owl on Node ${store.currentNodeId}!`;
          return `Copy that, ${handle}. Glad to have a ${rank.title} calling Node ${store.currentNodeId} today!`;
        };

        this.renderFooter([{ key: '1', label: 'Type Message', action: () => {
          term.promptInline('CHAT WITH DR. NOISE', 'Type your message to SysOp:', '', (msg) => {
            if (msg) {
              const handle = store.currentUser ? store.currentUser.handle : 'GUEST';
              this.chatHistory.push({ who: handle, text: msg });
              this.chatHistory.push({ who: 'DR. NOISE', text: generateSysOpReply(msg) });
              if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
            }
            this.openChat();
          }, () => this.openChat());
        }}]);
      });
    }

    // 12. MULTI-NODE STATUS & HOPPER
    openMultiNode() {
      window.CyberBBS.App.pushScreen('MULTI_NODE', () => {
        this.renderHeader('MULTI-NODE STATUS // 4-LINE HUNT GROUP');
        const term = window.CyberBBS.Term, store = window.CyberBBS.Store;
        term.println(`  #  NODE     MODEM / BAUD    ACTIVE CALLER     LOCATION        CURRENT DOOR`, 11, 0);
        term.println(`  ─  ───────  ──────────────  ────────────────  ──────────────  ──────────────`, 8, 0);
        store.nodes.forEach((n, idx) => {
          const row = 5 + idx * 2, isYou = n.id === store.currentNodeId;
          const callerName = isYou ? (store.currentUser?.handle || 'YOU') : n.user;
          const activity = isYou ? 'Multi-Node Status' : n.activity;
          term.setCursor(2, row);
          term.print(`[${n.id}] `, 14, 0);
          term.print(`${n.name.padEnd(7, ' ')}  `, isYou ? 10 : 15, 0);
          term.print(`${n.baud.padEnd(14, ' ')}  `, 11, 0);
          term.print(`${callerName.padEnd(16, ' ').substring(0, 16)}  `, isYou ? 14 : 15, 0);
          term.print(`${n.city.padEnd(14, ' ').substring(0, 14)}  `, 7, 0);
          term.print(`${activity.substring(0, 14)}`, 10, 0);
          term.addHitRegion(2, row, 76, 1, `node-${n.id}`, () => {
            store.switchNode(n.id);
            if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
            term.showNotice(`SWITCHED ACTIVE LINE TO ${n.name} (${n.baud})!`);
            this.openMultiNode();
          }, `Jump to ${n.name}`, String(n.id));
        });
        term.setCursor(2, 15); term.print(`Click or type [1-4] to hop between nodes · [W] Whisper · [S] Source Health`, 14, 0);
        this.renderFooter([
          { key: 'W', label: 'Whisper Node', action: () => {
            term.promptInline('INTER-NODE WHISPER', 'Send quick page to ACID_BURN (Node 2):', 'Hey, nice ANSI pack!', (msg) => {
              if (msg) {
                term.showNotice(`WHISPER SENT TO NODE 2: "${msg.substring(0, 35)}"`);
                setTimeout(() => {
                  term.showNotice('NODE 2 (ACID_BURN): "Thanks! Meet you in the ANSI Gallery!"');
                  if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
                }, 3000);
              }
            }, () => this.openMultiNode());
          }},
          { key: 'S', label: 'Source Health', action: () => this.openSourceHealth() }
        ]);
      });
    }

    openSourceHealth() {
      window.CyberBBS.App.pushScreen('SOURCE_HEALTH', async () => {
        this.renderHeader('NODE TELEMETRY // DATA LINK HEALTH & DIAGNOSTICS');
        const term = window.CyberBBS.Term;
        const net = window.CyberBBS.Net;
        const store = window.CyberBBS.Store;
        term.println(`\r\n  Probing satellite links & external carrier nodes...`, 14, 0);

        // Ping checks
        const tests = [
          { id: 'openmeteo', name: 'Open-Meteo API (Forecast & Geo)', url: 'https://geocoding-api.open-meteo.com/v1/search?name=London&count=1' },
          { id: 'github', name: 'GitHub REST API v3', url: 'https://api.github.com/zen' },
          { id: 'wikimedia', name: 'Wikimedia Commons API', url: 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' },
          { id: 'rss2json', name: 'RSS Gateway (rss2json.com)', url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fhnrss.org%2Ffrontpage' }
        ];

        const results = await Promise.all(tests.map(async (t) => {
          const t0 = performance.now();
          try {
            const res = await net.fetchWithTimeout(t.url);
            const latency = Math.round(performance.now() - t0);
            store.recordSourceHealth(t.id, res.ok ? 'ONLINE' : 'HTTP_ERROR', latency);
            return { ...t, status: res.ok ? 'ONLINE' : `HTTP ${res.status}`, latency, ok: res.ok };
          } catch (e) {
            const latency = Math.round(performance.now() - t0);
            store.recordSourceHealth(t.id, 'UNREACHABLE', latency, e.message);
            return { ...t, status: 'UNREACHABLE', latency, ok: false };
          }
        }));

        term.clear();
        this.renderHeader('NODE TELEMETRY // DATA LINK HEALTH & DIAGNOSTICS');
        term.println(`  SERVICE / ENDPOINT                  STATUS       LATENCY    PROTOCOL`, 11, 0);
        term.println(`  ──────────────────────────────────  ───────────  ─────────  ──────────────`, 8, 0);

        results.forEach((r, idx) => {
          const row = 4 + idx * 2;
          const statusColor = r.ok ? 10 : 12;
          const statusText = (r.status || 'UNKNOWN').padEnd(11, ' ');
          const latText = `${r.latency}ms`.padEnd(9, ' ');
          term.setCursor(2, row);
          term.print(`  ${r.name.padEnd(34, ' ')}  `, 15, 0);
          term.print(statusText, statusColor, 0);
          term.print(`  ${latText}  `, 14, 0);
          term.print(`HTTPS / CORS`, 7, 0);
        });

        // Local Storage Diagnostic
        const lsSize = Math.round((JSON.stringify(localStorage).length * 2) / 1024);
        term.setCursor(2, 14);
        term.println(`  LOCAL NODE STORAGE HEALTH:`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  IndexedDB Store: ${store.db ? 'INITIALIZED (ONLINE)' : 'UNAVAILABLE'} · Schema Version: 3.0`, 10, 0);
        term.println(`  localStorage Allocated: ~${lsSize} KB used of browser sandbox`, 10, 0);
        term.println(`  Active Carrier Profile: ${net.getUserCity()} · Node ID: ${store.currentNodeId}`, 10, 0);

        this.renderFooter([
          { key: 'R', label: 'Re-Check Links', action: () => this.openSourceHealth() },
          { key: 'B', label: 'Back to Nodes', action: () => this.openMultiNode() }
        ]);
      });
    }

    // 13. WEEKLY BBS NEWSPAPER
    openNewspaper() {
      window.CyberBBS.App.pushScreen('BBS_NEWSPAPER', () => {
        const store = window.CyberBBS.Store;
        const artworks = store.getAnsiArtworks(), votes = store.getAnsiVotes();
        const topArt = [...artworks].sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0))[0];
        const topTrivia = store.getTriviaLeaderboard()[0];
        const topOneLiner = store.getOneLiners()[0];
        const today = new Date().toISOString().substring(0, 10);

        const lines = [
          '╔════════════════════════════════════════════════════════════════════════╗',
          `║  THE CYBER CHRONICLE — WEEKLY NODE DIGEST         ISSUE DATE: ${today} ║`,
          '╚════════════════════════════════════════════════════════════════════════╝',
          '',
          '1. SYSOP EDITORIAL (BY DR. NOISE):',
          '   Welcome to another week on the 486DX2/66 basement mainline! Our USRobotics',
          '   14.4k & 28.8k lines have processed over 1,400 FidoNet packets with zero',
          '   dropped carriers. Upload shareware in Area 08 to boost your caller rank!',
          '',
          '2. WEEKLY ANSI ART CONTEST LEADER:',
          `   ★ "${topArt?.title || 'CYBER STATION 95'}" by ${topArt?.author || 'ACID_BURN'} (${votes[topArt?.id] || 18} votes)`,
          '   Visit Door [8] to cast your vote or draw your own CP437 screen!',
          '',
          '3. TRIVIA HALL OF FAME CHAMPION:',
          `   ★ ${topTrivia?.handle || 'ZERO_COOL'} leads the board with ${topTrivia?.score || 120} points!`,
          '',
          '4. FEATURED ONE-LINER GRAFFITI:',
          `   [${topOneLiner?.handle || 'ACID_BURN'}]: "${topOneLiner?.text || 'Hack the Planet!'}"`,
          '',
          '5. MOST DOWNLOADED UTILITY THIS WEEK:',
          '   PKZ204G.EXE (PKZIP 2.04g DOS Compression Suite) — 412 Downloads'
        ];

        this.renderPagedTextView('THE CYBER CHRONICLE', 'Weekly Automated BBS Newsletter', lines, [
          { key: 'E', label: 'Save .TXT', action: () => {
            const blob = new Blob([lines.join('\r\n')], { type: 'text/plain' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'CYBER_CHRONICLE.TXT'; a.click(); URL.revokeObjectURL(url);
            window.CyberBBS.Term.showNotice('NEWSPAPER SAVED AS CYBER_CHRONICLE.TXT!');
          }}
        ]);
      });
    }

    // 14. EXPANDED TODAY HUB
    openTodayHub(city = '', forceRefresh = false) {
      window.CyberBBS.App.pushScreen('TODAY_HUB', async () => {
        const net = window.CyberBBS.Net;
        const effectiveCity = (city && city.trim()) ? city.trim() : net.getUserCity();
        this.renderHeader('TODAY HUB // LIVE DAILY BRIEFING & QUICK LAUNCH');
        const term = window.CyberBBS.Term, store = window.CyberBBS.Store;
        term.println(`\r\n  ASSEMBLING DAILY BRIEFING FOR ${effectiveCity.toUpperCase()}...`, 14, 0);

        const brief = await net.fetchTodayBrief(effectiveCity, forceRefresh);
        term.clear();
        this.renderHeader('TODAY HUB // LIVE DAILY BRIEFING');

        const now = new Date();
        const dateText = now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        const timeText = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const artworks = store.getAnsiArtworks(), votes = store.getAnsiVotes();
        const topArt = [...artworks].sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0))[0];

        term.println(`  DATE: ${dateText.toUpperCase()} (${timeText})  ·  SYSOP NOTE: Node 2 V.34 28.8k Online!`, 15, 0);
        term.println(`  ANSI CONTEST LEADER: "${topArt?.title}" (${votes[topArt?.id] || 18} votes) · QUOTE: "Hack the Planet!"`, 11, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        const wBadge = net.renderSourceBadge(brief.weather);
        term.println(`  WEATHER // ${effectiveCity.toUpperCase()}  ${wBadge}:`, 14, 0);

        (brief.weather.ansiText || brief.weather.asciiText || '').replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).filter(l => l.trim()).slice(0, 3)
          .forEach(line => term.println(`  ${line.trim().substring(0, 76)}`, 7, 0));

        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  TOP HEADLINES TODAY:`, 14, 0);
        brief.headlines.slice(0, 5).forEach((item, idx) => term.println(`  ${idx + 1}. [${item.source}] ${(item.title || '').substring(0, 60)}`, 15, 0));

        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  QUICK DOORS: [1] City  [2] News  [3] Netmail  [4] Games  [5] Refresh`, 10, 0);

        this.renderFooter([
          { key: '1', label: 'City', action: () => { term.promptInline('TODAY HUB WEATHER', 'Enter city:', city, (nextCity) => { if (nextCity) this.openTodayHub(nextCity, true); }, () => this.openTodayHub(city, false)); } },
          { key: '2', label: 'News', action: () => this.openNews() },
          { key: '3', label: 'Netmail', action: () => this.openNetmail() },
          { key: '4', label: 'Games', action: () => this.openGames() },
          { key: '5', label: 'Refresh', action: () => this.openTodayHub(city, true) }
        ]);
      });
    }

    // ==========================================
    // 15. MARKET WIRE & CURRENCY CONVERTER
    // ==========================================
    async openMarketWire(forceRefresh = false) {
      window.CyberBBS.App.pushScreen('MARKET_WIRE', async () => {
        const net = window.CyberBBS.Net;
        this.renderHeader('MARKET WIRE // FINANCIAL TELEMETRY & FOREX');
        const term = window.CyberBBS.Term;
        term.println('\r\n  Polling Frankfurter ECB & AwesomeAPI Quotes Feed...', 14, 0);

        const res = await net.fetchMarketWire(forceRefresh);
        term.clear();
        this.renderHeader('MARKET WIRE // GLOBAL RATES & CRYPTO');

        const badge = net.renderSourceBadge(res);
        term.println(`  TICKER QUOTES FEED · ${badge} · CP437 SPARKLINE TRENDS:`, 14, 0);
        term.println('  ┌──────────┬──────────────────────────┬──────────┬──────────┬────────┬───────┐', 11, 0);
        term.println('  │ SYMBOL   │ ASSET NAME               │ BID      │ ASK      │ 24H %  │ TREND │', 11, 0);
        term.println('  ├──────────┼──────────────────────────┼──────────┼──────────┼────────┼───────┤', 11, 0);

        (res.quotes || []).slice(0, 8).forEach(q => {
          const sym = q.symbol.padEnd(8, ' ').substring(0, 8);
          const name = q.name.padEnd(24, ' ').substring(0, 24);
          const bid = q.bid.padEnd(8, ' ').substring(0, 8);
          const ask = q.ask.padEnd(8, ' ').substring(0, 8);
          const change = q.changePct.padEnd(6, ' ').substring(0, 6);
          const trend = (q.sparkline || '▄▄▄▄▄').padEnd(5, ' ').substring(0, 5);

          term.print('  │ ', 11, 0);
          term.print(sym, 15, 0);
          term.print(' │ ', 11, 0);
          term.print(name, 7, 0);
          term.print(' │ ', 11, 0);
          term.print(bid, 14, 0);
          term.print(' │ ', 11, 0);
          term.print(ask, 7, 0);
          term.print(' │ ', 11, 0);
          term.print(change, q.isUp ? 10 : 12, 0);
          term.print(' │ ', 11, 0);
          term.print(trend, q.isUp ? 10 : 12, 0);
          term.println(' │', 11, 0);
        });
        term.println('  └──────────┴──────────────────────────┴──────────┴──────────┴────────┴───────┘', 11, 0);
        term.println('  Type [C] to run instant currency exchange calculations.', 10, 0);

        this.renderFooter([
          { key: 'C', label: 'Convert', action: () => {
            term.promptInline('CURRENCY CONVERTER', 'Enter [AMOUNT FROM TO] (e.g. 100 USD BRL):', '100 USD BRL', (input) => {
              const parts = (input || '').trim().split(/\s+/);
              if (parts.length >= 3) {
                const amount = parseFloat(parts[0]) || 1;
                const from = parts[1].toUpperCase();
                const to = parts[2].toUpperCase();
                let rate = 1;
                const pair1 = `${from}/${to}`, pair2 = `${to}/${from}`;
                const match1 = (res.quotes || []).find(q => q.symbol === pair1);
                const match2 = (res.quotes || []).find(q => q.symbol === pair2);
                if (match1) rate = parseFloat(match1.bid);
                else if (match2) rate = 1 / (parseFloat(match2.bid) || 1);
                else if (from === 'USD' && res.rawRates && res.rawRates[to]) rate = res.rawRates[to];
                else rate = 5.85;

                const total = (amount * rate).toFixed(2);
                term.showNotice(`CONVERTED: ${amount} ${from} = ${total} ${to} (RATE: ${rate.toFixed(4)})`, 5000);
              }
              this.openMarketWire(false);
            }, () => this.openMarketWire(false));
          }},
          { key: 'R', label: 'Refresh', action: () => this.openMarketWire(true) }
        ]);
      });
    }

    // ==========================================
    // 16. EARTH & SKY TELEMETRY (USGS + ISS)
    // ==========================================
    async openEarthAndSky(forceRefresh = false) {
      window.CyberBBS.App.pushScreen('EARTH_AND_SKY', async () => {
        const net = window.CyberBBS.Net;
        this.renderHeader('EARTH & SKY // SEISMIC & ORBITAL TELEMETRY');
        const term = window.CyberBBS.Term;
        term.println('\r\n  Tracking USGS Global Seismic Network & ISS Spacecraft...', 14, 0);

        const res = await net.fetchEarthAndSky(forceRefresh);
        term.clear();
        this.renderHeader('EARTH & SKY // SATELLITE & SEISMIC RADAR');

        const badge = net.renderSourceBadge(res);
        term.println(`  ORBITAL TELEMETRY & EARTHQUAKE MAP · ${badge}`, 14, 0);

        // Build 74x9 ASCII World Map Grid
        const mapRows = 9, mapCols = 74;
        const grid = Array.from({ length: mapRows }, () => Array(mapCols).fill(' '));

        const continents = [
          { r: 1, c: 8, w: 18 }, { r: 2, c: 6, w: 22 }, { r: 3, c: 7, w: 16 },
          { r: 4, c: 14, w: 9 }, { r: 5, c: 15, w: 8 }, { r: 6, c: 16, w: 6 },
          { r: 1, c: 35, w: 12 }, { r: 2, c: 33, w: 14 },
          { r: 3, c: 34, w: 12 }, { r: 4, c: 35, w: 10 }, { r: 5, c: 36, w: 8 },
          { r: 1, c: 48, w: 22 }, { r: 2, c: 47, w: 24 }, { r: 3, c: 50, w: 18 },
          { r: 6, c: 58, w: 10 }, { r: 7, c: 59, w: 8 }
        ];
        continents.forEach(cnt => {
          for (let i = 0; i < cnt.w; i++) {
            if (grid[cnt.r] && grid[cnt.r][cnt.c + i] !== undefined) grid[cnt.r][cnt.c + i] = '·';
          }
        });

        (res.quakes || []).forEach(q => {
          const c = Math.max(0, Math.min(mapCols - 1, Math.floor(((q.lon + 180) / 360) * mapCols)));
          const r = Math.max(0, Math.min(mapRows - 1, Math.floor(((85 - q.lat) / 150) * mapRows)));
          if (grid[r] && grid[r][c]) grid[r][c] = '*';
        });

        const iss = res.iss || { lat: 0, lon: 0, altKm: 420, velKmh: 27600 };
        const issC = Math.max(0, Math.min(mapCols - 5, Math.floor(((iss.lon + 180) / 360) * mapCols)));
        const issR = Math.max(0, Math.min(mapRows - 1, Math.floor(((85 - iss.lat) / 150) * mapRows)));
        if (grid[issR]) {
          grid[issR][issC] = '[';
          grid[issR][issC + 1] = 'I';
          grid[issR][issC + 2] = 'S';
          grid[issR][issC + 3] = 'S';
          grid[issR][issC + 4] = ']';
        }

        term.println('  ┌' + '─'.repeat(mapCols) + '┐', 11, 0);
        grid.forEach(rowArr => {
          term.print('  │', 11, 0);
          const rowStr = rowArr.join('');
          for (let ch of rowStr) {
            if (ch === '*') term.print('*', 12, 0);
            else if ('[ISS]'.includes(ch)) term.print(ch, 14, 0);
            else if (ch === '·') term.print('·', 8, 0);
            else term.print(' ', 7, 0);
          }
          term.println('│', 11, 0);
        });
        term.println('  └' + '─'.repeat(mapCols) + '┘', 11, 0);

        term.println(`  [ISS] ORBIT: Lat: ${iss.lat.toFixed(1)}° Lon: ${iss.lon.toFixed(1)}° · Alt: ${iss.altKm}km · Vel: ${iss.velKmh} km/h (${iss.visibility})`, 14, 0);
        term.println('  RECENT M3.5+ SEISMIC ACTIVITY:', 11, 0);
        (res.quakes || []).slice(0, 3).forEach(q => {
          term.println(`  · Mag ${q.mag} - ${(q.place || 'Unknown').substring(0, 42)} at ${q.time} UTC`, 7, 0);
        });

        this.renderFooter([
          { key: 'R', label: 'Refresh', action: () => this.openEarthAndSky(true) }
        ]);
      });
    }

    // ==========================================
    // 17. CYBER RADIO WITH REAL-TIME ASCII VU METER
    // ==========================================
    async openRadio(genre = 'synthwave') {
      window.CyberBBS.App.pushScreen('CYBER_RADIO', async () => {
        const net = window.CyberBBS.Net;
        this.renderHeader('CYBER RADIO // WORLD STREAMING DIRECTORY');
        const term = window.CyberBBS.Term;
        term.println(`\r\n  Querying open stream stations for genre [${genre.toUpperCase()}]...`, 14, 0);

        const stations = await net.fetchRadioStations(genre);
        term.clear();
        this.renderHeader('CYBER RADIO // ASCII VU TUNER');

        const radio = window.CyberBBS.Radio;
        const curName = radio.currentStation ? radio.currentStation.name : 'NO STATION TUNED';
        const isPlay = radio.isPlaying;

        term.println(`  TUNER STATUS: [${isPlay ? 'PLAYING ▶' : 'MUTED / STOPPED ■'}]  ·  STATION: ${curName}`, 14, 0);
        term.println('  ────────────────────────────────────────────────────────────────────────────', 8, 0);
        term.println('  AVAILABLE STREAMS (Type 1-6 or click to tune in):', 11, 0);

        (stations || []).slice(0, 6).forEach((st, idx) => {
          const num = idx + 1;
          const mark = radio.currentStation?.url === st.url ? '► ' : '  ';
          const name = st.name.padEnd(36, ' ').substring(0, 36);
          const meta = `[${st.country}] ${st.bitrate}kbps ${st.tags.substring(0, 18)}`;
          term.print(`  ${mark}[${num}] ${name} ${meta}\r\n`, 15, 0);
          term.addHitRegion(4, 7 + idx, 70, 1, `radio-st-${num}`, () => {
            radio.play(st);
            term.showNotice(`TUNING TO "${st.name}"...`);
            this.openRadio(genre);
          }, st.name, String(num));
        });

        term.println('  ────────────────────────────────────────────────────────────────────────────', 8, 0);
        term.println('  REAL-TIME AUDIO FREQUENCY ANALYZER (8-BAND FFT):', 14, 0);

        this.stopActiveTimer();
        const blocks = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        this.activeTimer = setInterval(() => {
          if (window.CyberBBS.App.state !== 'CYBER_RADIO') {
            this.stopActiveTimer();
            return;
          }
          const levels = radio.getVuLevels();
          const vuBars = levels.map(l => blocks[l] || ' ').join(' ');
          term.setCursor(2, 16);
          term.print(`  [SPECTRUM]:  ${vuBars}   [VOL: ${Math.round(radio.volume * 100)}%]   `, 10, 0);
        }, 120);

        this.renderFooter([
          { key: 'P', label: isPlay ? 'Pause' : 'Play', action: () => { radio.toggle(); this.openRadio(genre); } },
          { key: 'S', label: 'Stop', action: () => { radio.pause(); this.openRadio(genre); } },
          { key: 'G', label: 'Genre', action: () => {
            const genres = ['synthwave', 'chiptune', 'ambient', '80s'];
            const nextIdx = (genres.indexOf(genre) + 1) % genres.length;
            this.openRadio(genres[nextIdx]);
          }},
          { key: '+', label: 'Vol +', action: () => { radio.setVolume(radio.volume + 0.1); this.openRadio(genre); } },
          { key: '-', label: 'Vol -', action: () => { radio.setVolume(radio.volume - 0.1); this.openRadio(genre); } }
        ]);
      });
    }

    // ==========================================
    // 18. WIKIPEDIA TERMINAL SEARCH & READER
    // ==========================================
    async openWikiTerminal(query = 'BBS') {
      window.CyberBBS.App.pushScreen('WIKI_TERMINAL', async () => {
        const net = window.CyberBBS.Net;
        this.renderHeader(`WIKI TERMINAL // ENCYCLOPEDIA ACCESS`);
        const term = window.CyberBBS.Term;
        term.println(`\r\n  Searching Wikipedia articles for "${query}"...`, 14, 0);

        const results = await net.searchWikipedia(query, 'pt');
        term.clear();
        this.renderHeader(`WIKI SEARCH RESULTS // "${query.toUpperCase()}"`);

        if (results.length === 0) {
          term.println('\r\n  No encyclopedia entries found. Try searching for "Internet", "Linux" or "BBS".', 12, 0);
        } else {
          term.println('  SELECT AN ARTICLE TO READ (Type 1-5 or click):', 14, 0);
          term.println('  ────────────────────────────────────────────────────────────────────────────', 8, 0);
          results.slice(0, 5).forEach((r, idx) => {
            const num = idx + 1;
            term.println(`  [${num}] ${r.title.toUpperCase()}`, 15, 0);
            term.println(`      ${(r.description || 'No description available').substring(0, 68)}`, 7, 0);
            term.addHitRegion(2, 5 + idx * 2, 72, 1, `wiki-${num}`, async () => {
              term.showNotice(`FETCHING "${r.title}"...`);
              const article = await net.fetchWikipediaArticle(r.title, 'pt');
              if (article) {
                const lines = this.wrapTextToLines(article.extract, 72);
                this.renderPagedTextView(`WIKIPEDIA: ${r.title.toUpperCase()}`, article.description, lines, [
                  { key: 'S', label: 'New Search', action: () => this.openWikiTerminalPrompt() }
                ]);
              }
            }, r.title, String(num));
          });
        }

        this.renderFooter([
          { key: 'S', label: 'New Search', action: () => this.openWikiTerminalPrompt() }
        ]);
      });
    }

    openWikiTerminalPrompt() {
      const term = window.CyberBBS.Term;
      term.promptInline('WIKIPEDIA TERMINAL', 'Search encyclopedia term (e.g. BBS, Retro, Linux):', 'BBS', (q) => {
        if (q) this.openWikiTerminal(q);
      }, () => window.CyberBBS.App.goBack());
    }

    // ==========================================
    // 19. PROJECT GUTENBERG CLASSIC LITERATURE
    // ==========================================
    openGutenberg() {
      window.CyberBBS.App.pushScreen('GUTENBERG_LIBRARY', () => {
        this.renderHeader('PROJECT GUTENBERG // VINTAGE E-TEXT ARCHIVE');
        const term = window.CyberBBS.Term;

        const books = [
          {
            id: 'FRANK', title: 'Frankenstein; or, The Modern Prometheus', author: 'Mary Wollstonecraft Shelley (1818)',
            desc: 'The gothic masterpiece of Victor Frankenstein and his synthetic creation.',
            filename: 'FRANK18.TXT',
            diz: 'FRANK18.TXT - Frankenstein by Mary Shelley (1818)\r\nClassic Gothic sci-fi novel. Public domain e-text.\r\nDownloaded from CYBER BBS Node 1 e-Text Shelf.',
            sample: [
              'FRANKENSTEIN; OR, THE MODERN PROMETHEUS',
              'By Mary Wollstonecraft Shelley',
              '',
              'Letter 1 — To Mrs. Saville, England.',
              'St. Petersburgh, Dec. 11th, 17--',
              '',
              'You will rejoice to hear that no disaster has accompanied the commencement',
              'of an enterprise which you have regarded with such evil forebodings. I arrived',
              'here yesterday, and my first task is to assure my dear sister of my welfare and',
              'increasing confidence in the success of my undertaking.',
              '',
              'I am already far north of London, and as I walk in the streets of Petersburgh,',
              'I feel a cold northern breeze play upon my cheeks, which braces my nerves and',
              'fills me with delight. Do you understand this feeling? This breeze, which has',
              'travelled from the regions towards which I am advancing, gives me a foretaste',
              'of those icy climes.'
            ]
          },
          {
            id: 'TIMEMACH', title: 'The Time Machine', author: 'H.G. Wells (1895)',
            desc: 'The foundational scientific romance of Victorian temporal travel.',
            filename: 'TIMEMACH.TXT',
            diz: 'TIMEMACH.TXT - The Time Machine by H.G. Wells (1895)\r\nFoundational science fiction romance of temporal travel.\r\nPreserved in 80-col ASCII for CYBER BBS readers.',
            sample: [
              'THE TIME MACHINE',
              'By H. G. Wells',
              '',
              'I. The Time Traveller was expounding a recondite matter to us. His grey eyes',
              'shone and twinkled, and his usually pale face was flushed and animated.',
              'The fire burnt brightly, and the soft radiance of the incandescent lights in the',
              'lilies of silver caught the bubbles that flashed and passed in our glasses.',
              '',
              '"You must follow me carefully. I shall have to controvert one or two ideas that',
              'are almost universally accepted. The geometry, for instance, they taught you at',
              'school is founded on a misconception."',
              '',
              '"Is not that rather a large thing to expect us to begin upon?" said Filby.',
              '"I do not mean to ask you to accept anything without reasonable ground for it."'
            ]
          },
          {
            id: 'ALICE', title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll (1865)',
            desc: 'Whimsical voyage down the rabbit-hole through mathematical absurdity.',
            filename: 'ALICE95.TXT',
            diz: 'ALICE95.TXT - Alice in Wonderland by Lewis Carroll\r\nWhimsical Victorian nonsense and mathematical puzzle.\r\nCurated by CYBER BBS File Division.',
            sample: [
              "ALICE'S ADVENTURES IN WONDERLAND",
              'By Lewis Carroll',
              '',
              'CHAPTER I. Down the Rabbit-Hole',
              '',
              'Alice was beginning to get very tired of sitting by her sister on the bank,',
              'and of having nothing to do: once or twice she had peeped into the book her',
              'sister was reading, but it had no pictures or conversations in it, "and what is',
              'the use of a book," thought Alice "without pictures or conversations?"',
              '',
              'So she was considering in her own mind whether the pleasure of making a daisy-chain',
              'would be worth the trouble of getting up and picking the daisies, when suddenly',
              'a White Rabbit with pink eyes ran close by her.'
            ]
          },
          {
            id: 'ARTWAR', title: 'The Art of War', author: 'Sun Tzu (~5th Century BC)',
            desc: 'Timeless military strategy, deception, and reconnaissance treatise.',
            filename: 'ARTWAR.TXT',
            diz: 'ARTWAR.TXT - The Art of War by Sun Tzu\r\nAncient military treatise on tactical supremacy.\r\nClean ASCII formatting for offline terminal study.',
            sample: [
              'THE ART OF WAR',
              'By Sun Tzu',
              '',
              'I. LAYING PLANS',
              '',
              '1. Sun Tzu said: The art of war is of vital importance to the State.',
              '2. It is a matter of life and death, a road either to safety or to ruin.',
              '   Hence it is a subject of inquiry which can on no account be neglected.',
              '3. The art of war, then, is governed by five constant factors, to be taken',
              '   into account in one\'s deliberations, when seeking to determine the conditions',
              '   obtaining in the field.',
              '4. These are: (1) The Moral Law; (2) Heaven; (3) Earth; (4) The Commander;',
              '   (5) Method and discipline.'
            ]
          }
        ];

        term.println('  CURATED PUBLIC DOMAIN LITERARY E-TEXTS:', 14, 0);
        term.println('  ────────────────────────────────────────────────────────────────────────────', 8, 0);

        books.forEach((b, idx) => {
          const num = idx + 1;
          term.println(`  [${num}] ${b.title.toUpperCase()}`, 15, 0);
          term.println(`      Author: ${b.author} · ${b.desc}`, 7, 0);
          term.addHitRegion(2, 5 + idx * 2, 74, 1, `book-${num}`, () => {
            this.renderPagedTextView(b.title.toUpperCase(), b.author, b.sample, [
              { key: 'D', label: 'Download .TXT', action: () => {
                const content = b.sample.join('\r\n') + '\r\n\r\n=========================================\r\nFILE_ID.DIZ:\r\n' + b.diz;
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = b.filename; a.click();
                URL.revokeObjectURL(a.href);
                term.showNotice(`DOWNLOADED ${b.filename} WITH FILE_ID.DIZ!`);
              }}
            ]);
          }, b.title, String(num));
        });

        this.renderFooter();
      });
    }

    // ==========================================
    // 20. CALLER LINE & CARRIER DIAGNOSTICS
    // ==========================================
    async openNetDiagnostics() {
      window.CyberBBS.App.pushScreen('CALLER_DIAG', async () => {
        this.renderHeader('CARRIER TELEMETRY // LINE NOISE & PING PROBE');
        const term = window.CyberBBS.Term, net = window.CyberBBS.Net;
        term.println('\r\n  Probing line impedance and querying carrier origin...', 14, 0);

        const diag = await net.fetchCallerDiagnostics();
        term.clear();
        this.renderHeader('CARRIER TELEMETRY // CALLER LINE ANALYZER');

        const geo = diag.geo || {};
        term.println('  CALLER TRACE IDENTIFICATION (CALLER ID / B-CHANNEL):', 14, 0);
        term.println(`  · Remote IP Address : ${geo.ip}`, 15, 0);
        term.println(`  · Carrier / ISP     : ${geo.isp} (${geo.asn})`, 11, 0);
        term.println(`  · Calling Exchange  : ${geo.city}, ${geo.region} — ${geo.country}`, 7, 0);
        term.println('  · Modem Modulation  : CCITT V.32bis / V.42bis Data Compression Active', 10, 0);
        term.println('  · Line Quality      : 0 Retrains · SNR: 38.4 dB · COM2 FIFO: 16550A', 10, 0);
        term.println('  ────────────────────────────────────────────────────────────────────────────', 8, 0);

        term.println('  INTERNET CARRIER LATENCY MATRIX (HTTP PROBE):', 14, 0);
        (diag.pings || []).forEach(p => {
          const name = p.name.padEnd(32, ' ');
          const msStr = `${p.ms} ms`.padStart(7, ' ');
          const status = p.ok ? (p.ms < 150 ? '[EXCELLENT]' : '[ACCEPTABLE]') : '[UNREACHABLE]';
          const fg = p.ok ? (p.ms < 150 ? 10 : 14) : 12;
          term.println(`  · ${name} : ${msStr}  ${status}`, fg, 0);
        });

        this.renderFooter([
          { key: 'P', label: 'Ping Again', action: () => this.openNetDiagnostics() }
        ]);
      });
    }

    // ==========================================
    // 21. BBS PHONE BOOK & SPEED DIALER (HAYES AT)
    // ==========================================
    openPhoneBook() {
      window.CyberBBS.App.pushScreen('PHONE_BOOK', () => {
        this.renderHeader('PHONE BOOK // DIRECTORY OF DIAL-UP SYSTEMS');
        const term = window.CyberBBS.Term;

        const nodes = [
          { num: '1', name: 'CYBER BBS MAINLINE', phone: '1-800-555-CYBR', baud: '14.4k HST', profile: 'vga80x25', desc: 'Node 1 Flagship · VGA 80x25 · 486DX2/66' },
          { num: '2', name: 'WALL STREET WIRE', phone: '1-800-555-WALL', baud: '28.8k V.34', profile: 'svga132x37', desc: 'Node 2 Financial · SVGA 132x37 Widescreen' },
          { num: '3', name: 'RETRO UNDERGROUND', phone: '1-800-555-CGA4', baud: '2400 MNP5', profile: 'cga40x25', desc: 'Node 3 Vintage · CGA 40x25 Big Type CRT' },
          { num: '4', name: 'RESEARCH ARCHIVE', phone: '1-800-555-HERC', baud: '9600 V.32', profile: 'mda80x25', desc: 'Node 4 Academic · IBM MDA Green Phosphor' },
          { num: '5', name: 'MODERN FIBER WORKSTATION', phone: '1-800-555-OLED', baud: '56k V.90', profile: 'modern_hd', desc: 'Modern High Density · Truecolor OLED Clean' }
        ];

        term.println('  DIAL-UP DIRECTORY (Select 1-5 to execute ATDT and switch adapter):', 14, 0);
        term.println('  ────────────────────────────────────────────────────────────────────────────', 8, 0);

        nodes.forEach((n, idx) => {
          term.println(`  [${n.num}] ${n.name.padEnd(26, ' ')} ${n.phone.padEnd(16, ' ')} ${n.baud}`, 15, 0);
          term.println(`      Mode: ${n.desc}`, 7, 0);
          term.addHitRegion(2, 5 + idx * 2, 74, 1, `phone-${n.num}`, () => {
            this.dialBBSNode(n);
          }, n.name, n.num);
        });

        term.println('  ────────────────────────────────────────────────────────────────────────────', 8, 0);
        term.println('  Type [D] to dial custom phone number via Hayes ATDT commands.', 10, 0);

        this.renderFooter([
          { key: 'D', label: 'Custom Dial', action: () => {
            term.promptInline('HAYES AT DIALER', 'Enter Phone Number (e.g. 555-1234):', '555-0199', (ph) => {
              if (ph) this.dialCustomNumber(ph);
            }, () => this.openPhoneBook());
          }}
        ]);
      });
    }

    dialBBSNode(node) {
      const term = window.CyberBBS.Term;
      term.clear();
      term.println(`\r\n  ATDT ${node.phone}`, 15, 0);
      term.println(`  Dialing ${node.name} (${node.baud})...`, 14, 0);

      if (window.CyberBBS.Audio) {
        for (let i = 0; i < node.phone.length; i++) {
          const ch = node.phone[i];
          if (/[0-9]/.test(ch)) {
            setTimeout(() => {
              window.CyberBBS.Audio.playDtmf(ch, 0.08);
            }, i * 90);
          }
        }
      }

      setTimeout(() => {
        term.println('  RINGING...', 14, 0);
        setTimeout(() => {
          term.println(`  CONNECT ${node.baud.split(' ')[0]}/V.42BIS/LAPM`, 10, 0);
          if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
          term.setVideoProfile(node.profile, true);
          term.showNotice(`CONNECTED TO ${node.name} (${node.baud})!`);
          window.CyberBBS.App.showMainMenu();
        }, 1200);
      }, node.phone.length * 90 + 300);
    }

    dialCustomNumber(phone) {
      const term = window.CyberBBS.Term;
      term.clear();
      term.println(`\r\n  ATDT ${phone}`, 15, 0);
      term.println('  Dialing remote carrier...', 14, 0);
      if (window.CyberBBS.Audio) {
        for (let i = 0; i < phone.length; i++) {
          const ch = phone[i];
          if (/[0-9]/.test(ch)) {
            setTimeout(() => window.CyberBBS.Audio.playDtmf(ch, 0.08), i * 90);
          }
        }
      }
      setTimeout(() => {
        term.println('  NO CARRIER / BUSY', 12, 0);
        setTimeout(() => this.openPhoneBook(), 1500);
      }, phone.length * 90 + 800);
    }
  }

  window.CyberBBS.Doors = new BBSDoors();
})();
