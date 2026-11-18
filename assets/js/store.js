/**
 * CYBER BBS — Persistence, Ranks, Netmail, File Catalog & Backup Layer (Mega Edition v3.0)
 */
(function() {
  window.CyberBBS = window.CyberBBS || {};

  class BBSStore {
    constructor() {
      this.dbName = 'CyberBBS_DB';
      this.dbVersion = 1;
      this.db = null;
      this.currentUser = null;
      this.timeRemainingSec = 45 * 60;
      this.timerInterval = null;
      this.currentNodeId = 1;
      this.lowRatioWarned = false;

      this.nodes = [
        { id: 1, name: 'NODE 1', baud: '14400 HST', user: 'YOU', city: 'Local Line', activity: 'Main Menu', status: 'ONLINE' },
        { id: 2, name: 'NODE 2', baud: '28800 V.34', user: 'ACID_BURN', city: 'Seattle, WA', activity: 'Uploading ANSI', status: 'BUSY' },
        { id: 3, name: 'NODE 3', baud: '14400 OPTIMA', user: 'ZERO_COOL', city: 'New York, NY', activity: 'Cyber Lord RPG', status: 'BUSY' },
        { id: 4, name: 'NODE 4', baud: '9600 SUPRA', user: 'CEREAL_KILLER', city: 'Boston, MA', activity: 'FidoNet Echoes', status: 'BUSY' }
      ];

      this.initIndexedDB();
      this.initDefaultData();
      this.initForumData();
      this.initNetmailData();
      this.initFileCatalog();
      this.initAnsiGalleryData();
    }

    async initIndexedDB() {
      return new Promise((resolve) => {
        if (!window.indexedDB) { resolve(null); return; }
        const req = indexedDB.open(this.dbName, this.dbVersion);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('uploads')) {
            db.createObjectStore('uploads', { keyPath: 'id', autoIncrement: true });
          }
        };
        req.onsuccess = (e) => { this.db = e.target.result; resolve(this.db); };
        req.onerror = () => resolve(null);
      });
    }

    initDefaultData() {
      if (!this.getLastCallers().length) {
        this.saveLastCallers([
          { handle: 'ACID_BURN', city: 'Seattle, WA', baud: '28800', time: '28m', action: 'Files', ratio: '1:2', status: 'Uploading VGA artpacks' },
          { handle: 'ZERO_COOL', city: 'New York, NY', baud: '14400', time: '14m', action: 'Doors', ratio: '1:1', status: 'Slaying Red Dragons' },
          { handle: 'CRASH_OVERRIDE', city: 'Chicago, IL', baud: '28800', time: '35m', action: 'Forum', ratio: '1:3', status: 'Debating C vs Pascal' },
          { handle: 'PHANTOM_PHREAK', city: 'Austin, TX', baud: '14400', time: '19m', action: 'Netmail', ratio: '1:2', status: 'Routing FidoNet packets' },
          { handle: 'CEREAL_KILLER', city: 'Boston, MA', baud: '9600', time: '41m', action: 'News', ratio: '1:12', status: 'Ratio 1:12 — living dangerously' },
          { handle: 'LORD_NIKON', city: 'Detroit, MI', baud: '14400', time: '22m', action: 'GitHub', ratio: '1:1', status: 'Mirroring DOS sources' }
        ]);
      }

      if (!this.getOneLiners().length) {
        this.saveOneLiners([
          { handle: 'DR. NOISE', text: 'Node 2 V.34 28.8k line is live! Keep your upload ratio above 1:3!' },
          { handle: 'ACID_BURN', text: 'Hack the Planet! Check out the new ANSI Art Contest in Door [8]!' },
          { handle: 'ZERO_COOL', text: 'Never send a boy to do a machine\'s job.' },
          { handle: 'CEREAL_KILLER', text: 'They\'re trashing our rights! Trashing!' },
          { handle: 'LORD_NIKON', text: 'Gravis Ultrasound 1MB > Sound Blaster 16 forever.' }
        ]);
      }
    }

    computeRankPoints(user) {
      if (!user) return 0;
      return (user.calls || 1) * 10 + Math.floor((user.bytesUp || 0) / 1024) * 2 + (user.forumPosts || 0) * 25 + (user.triviaScore || 0);
    }

    getUserRank(user) {
      if (!user || user.handle === 'GUEST') return { level: 10, title: 'GUEST VISITOR', nextTitle: 'REGULAR NODE', points: 0, nextPoints: 50 };
      if (user.handle === 'DR. NOISE') return { level: 255, title: 'SYSTEM OPERATOR', nextTitle: 'MAX RANK', points: 9999, nextPoints: 9999 };
      const pts = this.computeRankPoints(user);
      if (pts >= 1000) return { level: 255, title: 'HONORARY CO-SYSOP', nextTitle: 'MAX RANK', points: pts, nextPoints: 1000 };
      if (pts >= 500) return { level: 200, title: 'SYSOP FRIEND', nextTitle: 'HONORARY CO-SYSOP', points: pts, nextPoints: 1000 };
      if (pts >= 200) return { level: 100, title: 'ELITE PHREAKER', nextTitle: 'SYSOP FRIEND', points: pts, nextPoints: 500 };
      if (pts >= 60) return { level: 50, title: 'REGULAR NODE', nextTitle: 'ELITE PHREAKER', points: pts, nextPoints: 200 };
      return { level: 20, title: 'NEWBIE CALLER', nextTitle: 'REGULAR NODE', points: pts, nextPoints: 60 };
    }

    checkDailyLoginBonus(user) {
      if (!user || user.handle === 'GUEST') return null;
      const today = new Date().toISOString().substring(0, 10);
      if (user.lastLoginDate === today) return null;

      const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
      user.loginStreak = user.lastLoginDate === yesterday ? (user.loginStreak || 1) + 1 : 1;
      user.lastLoginDate = today;

      const bonus = 50 * Math.min(7, user.loginStreak);
      user.credits = (user.credits || 500) + bonus;
      this.updateUser(user);

      this.addNetmail({
        from: 'DR. NOISE',
        to: user.handle,
        subject: `Daily Login Bonus: +${bonus} CR (Streak: ${user.loginStreak}d)`,
        body: `Welcome back to Cyber BBS Node ${this.currentNodeId}, ${user.handle}!\r\nYour daily caller streak is now ${user.loginStreak} consecutive day(s).\r\nThe system has credited +${bonus} CR to your account.\r\n\r\n--- Cyber BBS Automated Accounting`
      });

      return { bonus, streak: user.loginStreak };
    }

    initNetmailData() {
      if (localStorage.getItem('cyberbbs.netmail')) return;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
      this.saveNetmail([
        {
          id: 1, from: 'DR. NOISE', to: 'ALL',
          subject: 'Welcome to Cyber BBS Node 1 (14.4k HST)',
          date: now, read: false,
          body: 'Greetings Caller!\r\nWelcome to the basement 486DX2/66 node. Explore our live RSS wires, GitHub source vault, ZMODEM file library, and door games.\r\nMaintain a healthy 1:3 upload/download ratio to earn Co-SysOp rank!\r\n\r\n73s, DR. NOISE (1:117/101)'
        },
        {
          id: 2, from: 'ACID_BURN', to: 'ALL',
          subject: 'New VGA Artpack & Contest Voting Open!',
          date: now, read: false,
          body: 'Hey! Check out Door [8] (ANSI Art Gallery) — you can now vote for the weekly ANSI champion or draw your own CP437 screen in the built-in ANSI Editor and export with SAUCE00 tags!'
        }
      ]);
    }

    getNetmail() {
      try { return JSON.parse(localStorage.getItem('cyberbbs.netmail') || '[]'); } catch (e) { return []; }
    }

    saveNetmail(list) {
      try { localStorage.setItem('cyberbbs.netmail', JSON.stringify(list.slice(0, 100))); } catch (e) {}
    }

    getUnreadMailCount() {
      const handle = this.currentUser ? this.currentUser.handle : 'GUEST';
      return this.getNetmail().filter(m => !m.read && (m.to === 'ALL' || m.to === handle)).length;
    }

    addNetmail({ from, to, subject, body }) {
      const list = this.getNetmail();
      const newId = (list.length > 0 ? Math.max(...list.map(m => m.id)) : 0) + 1;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const msg = {
        id: newId,
        from: (from || 'GUEST').toUpperCase(),
        to: (to || 'DR. NOISE').toUpperCase(),
        subject: (subject || 'No Subject').substring(0, 58),
        date: now, read: false, body: body || ''
      };
      list.unshift(msg);
      this.saveNetmail(list);
      return msg;
    }

    markMailRead(id) {
      const list = this.getNetmail();
      const m = list.find(x => x.id === id);
      if (m) { m.read = true; this.saveNetmail(list); }
    }

    deleteNetmail(id) { this.saveNetmail(this.getNetmail().filter(x => x.id !== id)); }

    sendNetmailWithBotReply(to, subject, body) {
      const sender = this.currentUser ? this.currentUser.handle : 'GUEST';
      const sent = this.addNetmail({ from: sender, to, subject, body });
      this.markMailRead(sent.id);

      const target = to.toUpperCase();
      const botPersonas = {
        'DR. NOISE': `Received your netmail regarding "${subject}". Everything on Node ${this.currentNodeId} is humming along at 14.4k ARQ. Keep uploading good utilities and stay active on the echoes!`,
        'ACID_BURN': `Got your packet! Meet me on Node 2 or check the ANSI Gallery — I am working on a fresh 80x25 iCE-color logo right now.`,
        'ZERO_COOL': `Packet routed via FidoNet 1:117/104. Good message! Let me know if you beat my Cyber Lord RPG score.`,
        'CRASH_OVERRIDE': `Ack! Clean transmission, zero CRC errors. See you in the Programming & GitHub echo board.`,
        'LORD_NIKON': `Signal received loud and clear. Remember to check the Trivia Quiz Night leaderboard!`,
        'PHANTOM_PHREAK': `Blue-box routing confirmed. Your netmail arrived through the Austin hub cleanly.`
      };
      const replyText = botPersonas[target] || `Automated FidoNet receipt from ${target}: Message "${subject}" delivered.`;

      setTimeout(() => {
        this.addNetmail({
          from: target, to: sender, subject: `Re: ${subject}`,
          body: `${replyText}\r\n\r\n--- FidoNet Netmail Matrix (1:117/101)`
        });
        if (window.CyberBBS.Term) window.CyberBBS.Term.showNotice(`*** YOU HAVE NEW NETMAIL FROM ${target}! ***`);
        if (window.CyberBBS.Audio) window.CyberBBS.Audio.playMailChime();
      }, 4500);

      return sent;
    }

    initForumData() {
      if (localStorage.getItem('cyberbbs.forum.json')) return;
      this.saveForumData({
        version: '3.0',
        system: 'CYBER BBS FORUM & FIDONET ECHOES',
        updatedAt: new Date().toISOString(),
        categories: [
          { id: 'cat-1', num: 1, title: 'SYSOP ANNOUNCEMENTS & BULLETINS', desc: 'Official BBS notices, node upgrades, and sysop bulletins' },
          { id: 'cat-2', num: 2, title: 'RETRO COMPUTING & HARDWARE', desc: '386/486/Pentium, MS-DOS, OS/2, sound cards, modems' },
          { id: 'cat-3', num: 3, title: 'PROGRAMMING & GITHUB REPOS', desc: 'C, C++, Assembly, Pascal, Git repositories, terminal tools' },
          { id: 'cat-4', num: 4, title: 'TELECOMMUNICATIONS & FIDONET', desc: 'FidoNet backbone, USRobotics modems, serial acoustics' },
          { id: 'cat-5', num: 5, title: 'ANSI ART & DEMOSCENE', desc: 'VGA artpacks, SAUCE metadata, trackers, MOD music' },
          { id: 'cat-6', num: 6, title: 'GENERAL OFF-TOPIC LOUNGE', desc: 'Everyday banter, cyber-culture, sci-fi, greetings' }
        ],
        threads: [
          {
            id: 101, catId: 'cat-1',
            title: 'Node 1 & 2 Upgraded to USRobotics 14.4k/28.8k Dual Standard',
            author: 'DR. NOISE', date: '1995-10-12 18:00',
            tags: ['bulletin', 'hardware', 'modem'], views: 240,
            posts: [
              { postNum: 1, author: 'DR. NOISE', role: 'SYSOP', date: '1995-10-12 18:00', body: 'Greetings callers! The old 2400 baud modem on COM2 has officially been retired. We now run USRobotics Courier HST & V.34 lines with V.42bis compression. Please maintain a 1:3 upload:download ratio!' },
              { postNum: 2, author: 'ACID_BURN', role: 'MEMBER', date: '1995-10-12 21:15', body: 'Awesome upgrade Doc! Downloaded PKZ204G.EXE in under 2 minutes with zero CRC retries.' }
            ]
          },
          {
            id: 102, catId: 'cat-2',
            title: 'Gravis Ultrasound vs Sound Blaster 16 in DOS Games',
            author: 'ZERO_COOL', date: '1995-10-14 14:30',
            tags: ['audio', 'hardware', 'dos'], views: 185,
            posts: [
              { postNum: 1, author: 'ZERO_COOL', role: 'MEMBER', date: '1995-10-14 14:30', body: 'Just installed a Gravis Ultrasound (GUS) with 1MB RAM. Listening to DOOM and tracker .MOD files is night and day compared to FM synthesis on the SB16.' },
              { postNum: 2, author: 'LORD_NIKON', role: 'MEMBER', date: '1995-10-14 16:42', body: 'GUS is king for demoscene music! Use the SBOS emulator TSR if you get silence in older titles.' }
            ]
          },
          {
            id: 103, catId: 'cat-3',
            title: 'Writing Portable CP437 Terminal Emulators in C',
            author: 'CRASH_OVERRIDE', date: '1995-10-15 09:12',
            tags: ['programming', 'c', 'terminal'], views: 130,
            posts: [
              { postNum: 1, author: 'CRASH_OVERRIDE', role: 'MEMBER', date: '1995-10-15 09:12', body: 'Parsing ANSI escape sequences (CSI commands like SGR and cursor movement) cleanly is tricky when packets arrive over serial links. Check out the GitHub Vault door for live source trees!' }
            ]
          },
          {
            id: 104, catId: 'cat-5',
            title: 'Acid Productions October Artpack Released',
            author: 'ACID_BURN', date: '1995-10-16 01:20',
            tags: ['ansi', 'artpack', 'ice'], views: 310,
            posts: [
              { postNum: 1, author: 'ACID_BURN', role: 'MEMBER', date: '1995-10-16 01:20', body: 'The new October artpack has been uploaded to File Area 02! 25 screens of high-density CP437 box-drawing art with iCE bright backgrounds.' }
            ]
          }
        ]
      });
    }

    getForumData() {
      try { const raw = localStorage.getItem('cyberbbs.forum.json'); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    }

    saveForumData(data) {
      try { data.updatedAt = new Date().toISOString(); localStorage.setItem('cyberbbs.forum.json', JSON.stringify(data, null, 2)); } catch (e) {}
    }

    getForumCategories() { const d = this.getForumData(); return d ? d.categories : []; }

    getForumThreads(catId) {
      const d = this.getForumData();
      return d && d.threads ? d.threads.filter(t => !catId || t.catId === catId) : [];
    }

    createThread(catId, title, author, content, tags = []) {
      const data = this.getForumData();
      if (!data) return null;
      const newId = (data.threads.length > 0 ? Math.max(...data.threads.map(t => t.id)) : 100) + 1;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const thread = {
        id: newId, catId: catId || 'cat-1', title: title.substring(0, 70),
        author: author || 'GUEST', date: now, tags: Array.isArray(tags) ? tags : [tags], views: 1,
        posts: [{ postNum: 1, author: author || 'GUEST', role: author === 'DR. NOISE' ? 'SYSOP' : 'MEMBER', date: now, body: content }]
      };
      data.threads.unshift(thread);
      this.saveForumData(data);
      if (this.currentUser && this.currentUser.handle !== 'GUEST') {
        this.currentUser.forumPosts = (this.currentUser.forumPosts || 0) + 1;
        this.rewardCredits(15);
      }
      return thread;
    }

    replyToThread(threadId, author, content) {
      const data = this.getForumData();
      if (!data) return null;
      const thread = data.threads.find(t => t.id === parseInt(threadId, 10));
      if (!thread) return null;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
      thread.posts.push({ postNum: thread.posts.length + 1, author: author || 'GUEST', role: author === 'DR. NOISE' ? 'SYSOP' : 'MEMBER', date: now, body: content });
      thread.views = (thread.views || 0) + 1;
      this.saveForumData(data);
      if (this.currentUser && this.currentUser.handle === author && author !== 'GUEST') {
        this.currentUser.forumPosts = (this.currentUser.forumPosts || 0) + 1;
        this.rewardCredits(10);
      }
      return thread;
    }

    exportForumJson() {
      const data = this.getForumData();
      if (!data) return;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'BULLETIN_BOARD_FORUM.JSON'; a.click();
      URL.revokeObjectURL(url);
    }

    importForumJson(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (parsed.categories && parsed.threads) {
          this.saveForumData(parsed);
          return { ok: true, message: 'FORUM JSON IMPORTED SUCCESSFULLY!' };
        }
        return { ok: false, error: 'INVALID FORUM JSON SCHEMA.' };
      } catch (e) {
        return { ok: false, error: 'FAILED TO PARSE JSON: ' + e.message };
      }
    }

    initFileCatalog() {
      this.fileAreas = [
        { num: 1, code: '01', name: 'SYSOP TEXTS & PHREAK GUIDES', desc: 'BBS manuals, Hayes AT specs, computing lore' },
        { num: 2, code: '02', name: 'ANSI ART & VGA ARTPACKS', desc: 'ACiD, iCE & Mistigris CP437 releases' },
        { num: 3, code: '03', name: 'DOS UTILITIES & ARCHIVERS', desc: 'PKZIP, ARJ, Norton tools, memory managers' },
        { num: 4, code: '04', name: 'DEMOSCENE & TRACKER MODS', desc: 'Future Crew, Triton, S3M/XM/MOD classics' },
        { num: 5, code: '05', name: 'PROGRAMMING & COMPILERS', desc: 'Turbo Pascal, DJGPP, NASM, C libraries' },
        { num: 6, code: '06', name: 'TELECOM & TERMINAL SOFTWARE', desc: 'Telemate, Telix, Qmodem, ZMODEM drivers' },
        { num: 7, code: '07', name: 'SHAREWARE GAMES & DOORS', desc: 'LORD, TradeWars 2002, Doom shareware' },
        { num: 8, code: '08', name: 'YOUR UPLOADS (LOCAL SANDBOX)', desc: 'Upload local files, earn BBS credits & rank' }
      ];

      this.catalogFiles = [
        { area: '01', name: 'HAYES-AT.TXT', size: 48200, cost: 5, uploader: 'DR. NOISE', downloads: 142, desc: 'Complete USRobotics Courier 14.4k/28.8k AT Command Reference', diz: '╔═══════════════════════════════════════════╗\n║ USROBOTICS COURIER HST / V.34 AT REFERENCE ║\n║ Complete S-Registers, V.42bis & MNP5 Guide║\n╚═══════════════════════════════════════════╝' },
        { area: '01', name: 'JARGON3.TXT', size: 685400, cost: 35, uploader: 'ZERO_COOL', downloads: 98, desc: 'The Hacker Jargon File v3.0.0 by Eric S. Raymond', diz: '╔═══════════════════════════════════════════╗\n║ THE JARGON FILE v3.0.0 (ASCII EDITION)    ║\n║ Comprehensive Compendium of Hacker Slang  ║\n╚═══════════════════════════════════════════╝' },
        { area: '01', name: 'FIDONET.NFO', size: 32400, cost: 3, uploader: 'PHANTOM_PHREAK', downloads: 76, desc: 'FidoNet Zone 1 Nodelist & EchoMail Routing Primer', diz: '╔═══════════════════════════════════════════╗\n║ FIDONET ZONE 1 ROUTING & ECHOMAIL PRIMER  ║\n║ Configure FrontDoor, BinkleyTerm & Squish ║\n╚═══════════════════════════════════════════╝' },
        { area: '02', name: 'ACID9510.ZIP', size: 245000, cost: 18, uploader: 'ACID_BURN', downloads: 215, desc: 'ACiD Productions October 1995 Official VGA Artpack', diz: '╔═══════════════════════════════════════════╗\n║ ACiD Productions Official Artpack (10/95) ║\n║ 25 High-Density CP437 VGA ANSI Screens    ║\n╚═══════════════════════════════════════════╝' },
        { area: '02', name: 'THEDRAW4.ZIP', size: 189400, cost: 14, uploader: 'ACID_BURN', downloads: 164, desc: 'TheDraw v4.63 ANSI/ASCII Screen Editor for MS-DOS', diz: '╔═══════════════════════════════════════════╗\n║ THEDRAW v4.63 — THE INDUSTRY STANDARD     ║\n║ Full-Screen ANSI/ASCII Editor & Animation ║\n╚═══════════════════════════════════════════╝' },
        { area: '03', name: 'PKZ204G.EXE', size: 202574, cost: 15, uploader: 'DR. NOISE', downloads: 412, desc: 'PKZIP / PKUNZIP 2.04g Standard DOS Compression Utility', diz: '╔═══════════════════════════════════════════╗\n║ PKWARE PKZIP / PKUNZIP VERSION 2.04g      ║\n║ Essential DOS Archive & Compression Suite ║\n╚═══════════════════════════════════════════╝' },
        { area: '03', name: 'NC50DOS.ZIP', size: 418000, cost: 25, uploader: 'LORD_NIKON', downloads: 230, desc: 'Norton Commander 5.0 Dual-Pane DOS File Manager', diz: '╔═══════════════════════════════════════════╗\n║ NORTON COMMANDER 5.0 FOR MS-DOS           ║\n║ Legendary Dual-Pane Blue File Commander   ║\n╚═══════════════════════════════════════════╝' },
        { area: '04', name: '2NDREAL.ZIP', size: 980000, cost: 45, uploader: 'ZERO_COOL', downloads: 309, desc: 'Future Crew — Second Reality (Assembly 93 1st Place Demo)', diz: '╔═══════════════════════════════════════════╗\n║ FUTURE CREW — SECOND REALITY (ASM 93 #1)  ║\n║ 3D Vector Worlds, Glenz, Plasma & GUS     ║\n╚═══════════════════════════════════════════╝' },
        { area: '05', name: 'TP70FULL.ZIP', size: 740000, cost: 38, uploader: 'CRASH_OVERRIDE', downloads: 178, desc: 'Borland Turbo Pascal 7.0 IDE & Inline Assembler', diz: '╔═══════════════════════════════════════════╗\n║ BORLAND TURBO PASCAL 7.0 REAL/PROTECTED   ║\n║ Blazing Fast Compiler, Turbo Vision & ASM ║\n╚═══════════════════════════════════════════╝' },
        { area: '06', name: 'TM421.ZIP', size: 520000, cost: 28, uploader: 'DR. NOISE', downloads: 265, desc: 'Telemate 4.21 Multitasking Terminal with Backscroll & ANSI', diz: '╔═══════════════════════════════════════════╗\n║ TELEMATE 4.21 — MULTITASKING BBS TERMINAL ║\n║ Built-in Scrollback, Mouse, ZMODEM & RIP  ║\n╚═══════════════════════════════════════════╝' },
        { area: '07', name: 'LORD407.ZIP', size: 610000, cost: 30, uploader: 'ZERO_COOL', downloads: 332, desc: 'Legend of the Red Dragon (LORD) v4.07 BBS Door Game', diz: '╔═══════════════════════════════════════════╗\n║ LEGEND OF THE RED DRAGON v4.07 (SETH ABLE)║\n║ Classic Multi-Node BBS Fantasy Door RPG!  ║\n╚═══════════════════════════════════════════╝' },
        { area: '07', name: 'TW2002.ZIP', size: 820000, cost: 36, uploader: 'LORD_NIKON', downloads: 288, desc: 'TradeWars 2002 v3.09 Interstellar Space Commerce Door', diz: '╔═══════════════════════════════════════════╗\n║ TRADEWARS 2002 v3.09 — SPACE EMPIRE DOOR  ║\n║ Colonize Planets, Build Stardocks & Trade ║\n╚═══════════════════════════════════════════╝' }
      ];
    }

    getCatalogFiles(areaCode) { return this.catalogFiles.filter(f => f.area === areaCode); }

    searchCatalogFiles(keyword) {
      const q = (keyword || '').trim().toLowerCase();
      if (!q) return this.catalogFiles;
      return this.catalogFiles.filter(f => f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q) || f.uploader.toLowerCase().includes(q));
    }

    initAnsiGalleryData() {
      if (!localStorage.getItem('cyberbbs.ansiVotes')) {
        localStorage.setItem('cyberbbs.ansiVotes', JSON.stringify({ cyber95: 18, courier: 14, fidonet: 11, skull: 21, skyline: 16 }));
      }
    }

    getAnsiVotes() { try { return JSON.parse(localStorage.getItem('cyberbbs.ansiVotes') || '{}'); } catch (e) { return {}; } }

    voteAnsiArtwork(artId) {
      const votes = this.getAnsiVotes();
      votes[artId] = (votes[artId] || 0) + 1;
      localStorage.setItem('cyberbbs.ansiVotes', JSON.stringify(votes));
      if (this.currentUser && this.currentUser.handle !== 'GUEST') {
        this.currentUser.ansiMasterBadge = true;
        this.rewardCredits(10);
      }
      return votes[artId];
    }

    getCustomAnsiList() { try { return JSON.parse(localStorage.getItem('cyberbbs.customAnsi') || '[]'); } catch (e) { return []; } }

    saveCustomAnsi(title, author, ansiText) {
      const list = this.getCustomAnsiList();
      const id = 'custom-' + Date.now();
      list.unshift({ id, title: title || 'UNTITLED.ANS', author: author || 'GUEST', group: 'CYBER BBS', date: new Date().toISOString().substring(0, 10), ansi: ansiText });
      localStorage.setItem('cyberbbs.customAnsi', JSON.stringify(list.slice(0, 12)));
      const votes = this.getAnsiVotes();
      votes[id] = 1;
      localStorage.setItem('cyberbbs.ansiVotes', JSON.stringify(votes));
      return id;
    }

    getAnsiArtworks() {
      const builtIn = [
        {
          id: 'cyber95', title: 'CYBER STATION 95', author: 'ACID_BURN', group: 'ACiD Productions', date: '1995-10-12', iceColor: true,
          ansi: `\x1b[96m╔══════════════════════════════════════════════════════════════════════════════╗\r\n║ \x1b[93m▄▄█▀▀▀█▄▄  ▄█▀▀▀█▄   ▄█▀▀█▄   ██   ██ ██████  ▄█▀▀█▄   ▄████▄   ▄█▀▀▀█▄\x1b[96m      ║\r\n║ \x1b[93m██    ██   ██   ██  ██    ██  ██   ██ ██     ██    ██  ██  ▀██  ██   ██\x1b[96m      ║\r\n║ \x1b[93m██    ██   █████▀   ██    ██  ██   ██ █████  ██    ██  ██   ██  █████▀ \x1b[96m      ║\r\n║ \x1b[93m██    ██   ██  ██   ██    ██  ██   ██ ██     ██    ██  ██   ██  ██  ██ \x1b[96m      ║\r\n║ \x1b[93m▀▀█▄▄▄█▀▀  ██   ██   ▀█▄▄█▀    ▀███▀  ██████  ▀█▄▄█▀   ▀████▀   ██   ██\x1b[96m      ║\r\n╠══════════════════════════════════════════════════════════════════════════════╣\r\n║ \x1b[92m░░▒▒▓▓██  N O D E   1  ·  1 4 . 4 k   H S T  ·  B A S E M E N T   4 8 6 ██▓▓▒▒░░\x1b[96m ║\r\n╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`
        },
        {
          id: 'courier', title: 'USROBOTICS COURIER 14.4K', author: 'DR. NOISE', group: 'Cyber SysOp Team', date: '1994-11-04', iceColor: false,
          ansi: `\x1b[97m┌──────────────────────────────────────────────────────────────────────────────┐\r\n│ \x1b[91m■\x1b[90m USRobotics COURIER HST DUAL STANDARD 14,400 BPS DATA/FAX MODEM             \x1b[97m│\r\n├──────────────────────────────────────────────────────────────────────────────┤\r\n│  \x1b[93m[HS]  \x1b[92m[AA]  [CD]  \x1b[91m[OH]  \x1b[92m[RD]  \x1b[93m[SD]  \x1b[92m[TR]  [MR]   \x1b[96mV.32bis / V.42bis / MNP5 \x1b[97m│\r\n│   \x1b[93m●     \x1b[90m○     \x1b[92m●     \x1b[91m●     \x1b[92m●     \x1b[93m●     \x1b[92m●     ●     \x1b[37mCARRIER LOCKED 14400 ARQ \x1b[97m│\r\n├──────────────────────────────────────────────────────────────────────────────┤\r\n│ \x1b[36m░░░░▒▒▒▒▓▓▓▓████ CONNECT 14400/ARQ/V42B/LAPM — ZERO CRC ERRORS ████▓▓▓▓▒▒▒▒░░░░\x1b[97m│\r\n└──────────────────────────────────────────────────────────────────────────────┘\x1b[0m`
        },
        {
          id: 'skull', title: 'DEMOSCENE CYBER SKULL', author: 'ZERO_COOL', group: 'Future Crew Tribute', date: '1995-07-19', iceColor: true,
          ansi: `\x1b[95m                    ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄\r\n                 ▄██▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀██▄\r\n               ▄██▀   \x1b[97m▄▄▄▄▄                ▄▄▄▄▄\x1b[95m   ▀██▄\r\n              ██▀   \x1b[91m█████████            █████████\x1b[95m   ▀██\r\n              ██    \x1b[91m█████████     \x1b[93m▄▄\x1b[91m     █████████\x1b[95m    ██\r\n              ██▄    \x1b[97m▀▀▀▀▀▀▀     \x1b[93m████\x1b[97m     ▀▀▀▀▀▀▀\x1b[95m    ▄██\r\n               ▀██▄              \x1b[93m▀▀▀▀\x1b[95m              ▄██▀\r\n                 ▀██▄▄      \x1b[97m█ █ █ █ █ █ █\x1b[95m      ▄▄██▀\r\n                    ▀▀██▄▄▄▄\x1b[97m▀ ▀ ▀ ▀ ▀ ▀ ▀\x1b[95m▄▄▄▄██▀▀\r\n            \x1b[96m▓▓▓▒▒▒░░░ HACK THE PLANET // 1995 ░░░▒▒▒▓▓▓\x1b[0m`
        },
        {
          id: 'fidonet', title: 'FIDONET BACKBONE MATRIX', author: 'PHANTOM_PHREAK', group: 'Zone 1 EchoNet', date: '1995-03-28', iceColor: false,
          ansi: `\x1b[92m  [ZONE 1:117/101] ══════╦══════> [ZONE 1:117/104 NEW YORK]\r\n                         ║\r\n                         ╠══════> [ZONE 1:117/108 SEATTLE]\r\n                         ║\r\n                         ╠══════> [ZONE 2:292/854 LONDON]\r\n                         ║\r\n                         ╚══════> [ZONE 4:801/120 SAO PAULO]\r\n  \x1b[93mFidoNet Store-and-Forward Echomail Matrix · ZMODEM Batch Compressed\r\n  \x1b[37m"Connecting basements across continents before the Web existed."\x1b[0m`
        },
        {
          id: 'skyline', title: 'MIDNIGHT CYBER SKYLINE', author: 'LORD_NIKON', group: 'iCE Advertisements', date: '1995-09-02', iceColor: true,
          ansi: `\x1b[94m       ▄▄▄        \x1b[96m▄▄▄▄▄          \x1b[95m▄▄▄▄        \x1b[94m▄▄▄▄▄▄\r\n      █\x1b[93m▪\x1b[94m█\x1b[93m▪\x1b[94m█      \x1b[96m█\x1b[97m▪\x1b[96m█\x1b[97m▪\x1b[96m█\x1b[97m▪\x1b[96m█        \x1b[95m█\x1b[93m▪\x1b[95m█\x1b[93m▪\x1b[95m█      \x1b[94m█\x1b[96m▪\x1b[94m█\x1b[96m▪\x1b[94m█\x1b[96m▪\x1b[94m█\r\n    ▄▄█\x1b[93m▪\x1b[94m█\x1b[93m▪\x1b[94m█▄▄  ▄▄█\x1b[97m▪\x1b[96m█\x1b[97m▪\x1b[96m█\x1b[97m▪\x1b[96m█▄▄    ▄▄█\x1b[93m▪\x1b[95m█\x1b[93m▪\x1b[95m█▄▄  ▄▄█\x1b[96m▪\x1b[94m█\x1b[96m▪\x1b[94m█\x1b[96m▪\x1b[94m█\r\n  ███\x1b[93m▪\x1b[94m█\x1b[93m▪\x1b[94m█\x1b[93m▪\x1b[94m█\x1b[93m▪\x1b[94m████\x1b[97m▪\x1b[96m█\x1b[97m▪\x1b[96m█\x1b[97m▪\x1b[96m█\x1b[97m▪\x1b[96m█████\x1b[93m▪\x1b[95m█\x1b[93m▪\x1b[95m█\x1b[93m▪\x1b[95m████\x1b[96m▪\x1b[94m█\x1b[96m▪\x1b[94m█\x1b[96m▪\x1b[94m█\r\n  \x1b[96m════════════════════════════════════════════════════════════════════════\r\n  \x1b[93mAFTER HOURS DIAL-UP SECTOR · 03:14 AM · CARRIER STEADY\x1b[0m`
        }
      ];
      return [...this.getCustomAnsiList().map(c => ({ ...c, iceColor: true })), ...builtIn];
    }

    getTriviaLeaderboard() {
      try {
        const raw = localStorage.getItem('cyberbbs.triviaScores');
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return [
        { handle: 'ZERO_COOL', score: 120, date: '1995-10-15' },
        { handle: 'DR. NOISE', score: 105, date: '1995-10-14' },
        { handle: 'ACID_BURN', score: 90, date: '1995-10-13' },
        { handle: 'CRASH_OVERRIDE', score: 75, date: '1995-10-12' }
      ];
    }

    recordTriviaScore(handle, points) {
      const board = this.getTriviaLeaderboard();
      const existing = board.find(b => b.handle === handle);
      const today = new Date().toISOString().substring(0, 10);
      if (existing) { existing.score += points; existing.date = today; }
      else board.push({ handle, score: points, date: today });
      board.sort((a, b) => b.score - a.score);
      localStorage.setItem('cyberbbs.triviaScores', JSON.stringify(board.slice(0, 10)));
      if (this.currentUser && this.currentUser.handle === handle && handle !== 'GUEST') {
        this.currentUser.triviaScore = (this.currentUser.triviaScore || 0) + points;
        this.updateUser(this.currentUser);
      }
    }

    getClockCities() {
      try {
        const raw = localStorage.getItem('cyberbbs.clockCities');
        if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed) && parsed.length > 0) return parsed; }
      } catch (e) {}
      return [
        { city: 'São Paulo / Brasília', tz: 'America/Sao_Paulo', code: 'BRT (UTC-3)' },
        { city: 'New York / Boston', tz: 'America/New_York', code: 'EST (UTC-5)' },
        { city: 'Silicon Valley / Seattle', tz: 'America/Los_Angeles', code: 'PST (UTC-8)' },
        { city: 'London / Greenwich', tz: 'Europe/London', code: 'GMT (UTC+0)' },
        { city: 'Paris / Berlin / Frankfurt', tz: 'Europe/Berlin', code: 'CET (UTC+1)' },
        { city: 'Tokyo / Kyoto', tz: 'Asia/Tokyo', code: 'JST (UTC+9)' },
        { city: 'Sydney / Melbourne', tz: 'Australia/Sydney', code: 'AEST (UTC+10)' }
      ];
    }

    saveClockCities(cities) { try { localStorage.setItem('cyberbbs.clockCities', JSON.stringify(cities.slice(0, 7))); } catch (e) {} }

    switchNode(nodeId) {
      const target = this.nodes.find(n => n.id === nodeId);
      if (!target) return null;
      this.currentNodeId = nodeId;
      const badge = document.getElementById('node-badge-text');
      if (badge) badge.textContent = `${target.name} · ${target.baud} · 486DX2/66`;
      return target;
    }

    async hashPassword(password) {
      if (!window.crypto || !window.crypto.subtle) throw new Error('Secure hashing unavailable.');
      const msgBuffer = new TextEncoder().encode(password + 'cyberbbs_salt_1995');
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    getUsers() { try { return JSON.parse(localStorage.getItem('cyberbbs.users') || '[]'); } catch (e) { return []; } }
    saveUsers(users) { try { localStorage.setItem('cyberbbs.users', JSON.stringify(users)); } catch (e) {} }
    findUser(handle) { return this.getUsers().find(u => u.handle.toUpperCase() === handle.toUpperCase()); }

    async registerUser(handle, password, realName = '', city = '') {
      handle = String(handle || '').trim().toUpperCase();
      password = String(password || '');
      if (!/^[A-Z0-9_\-]{2,16}$/.test(handle)) return { ok: false, error: 'Handle must be 2-16 chars: A-Z, 0-9, _ or -.' };
      if (password.length < 4 || password.length > 64) return { ok: false, error: 'Password must contain 4-64 characters.' };
      const users = this.getUsers();
      if (this.findUser(handle)) return { ok: false, error: 'Handle already exists!' };
      const hash = await this.hashPassword(password);
      const newUser = {
        handle, passHash: hash, realName: realName || handle, city: city || 'Cyberspace',
        level: 50, credits: 500, bytesDown: 0, bytesUp: 0, calls: 1, minsOnline: 0,
        forumPosts: 0, triviaScore: 0, loginStreak: 1, lastLoginDate: '', created: new Date().toISOString()
      };
      users.push(newUser);
      this.saveUsers(users);
      return { ok: true, user: newUser };
    }

    async loginUser(handle, password) {
      const user = this.findUser(handle);
      if (!user) return { ok: false, error: 'User handle not found' };
      const hash = await this.hashPassword(password);
      if (user.passHash !== hash) return { ok: false, error: 'Invalid password' };
      user.calls = (user.calls || 0) + 1;
      this.updateUser(user);
      return { ok: true, user };
    }

    loginGuest() {
      const guest = {
        handle: 'GUEST', realName: 'Visitor', city: 'Dial-up Node', level: 10,
        credits: 200, bytesDown: 0, bytesUp: 0, calls: 1, minsOnline: 0, forumPosts: 0, triviaScore: 0, loginStreak: 1
      };
      this.setCurrentUser(guest);
      return guest;
    }

    updateUser(user) {
      const users = this.getUsers();
      const idx = users.findIndex(u => u.handle.toUpperCase() === user.handle.toUpperCase());
      if (idx >= 0) { users[idx] = user; this.saveUsers(users); }
      if (this.currentUser && this.currentUser.handle === user.handle) this.currentUser = user;
    }

    setCurrentUser(user) {
      this.currentUser = user;
      const rank = this.getUserRank(user);
      this.timeRemainingSec = (rank.level >= 255 ? 9999 : 45) * 60;
      this.startTimer();
      const bonusInfo = this.checkDailyLoginBonus(user);
      this.addCaller({ handle: user.handle, city: user.city || 'Local', baud: '14400', time: 'Active', action: 'Main', ratio: this.getRatio(), status: `${rank.title} · Online now` });
      return bonusInfo;
    }

    startTimer() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        if (this.timeRemainingSec > 0) {
          this.timeRemainingSec--;
          if (this.currentUser && this.timeRemainingSec % 60 === 0) {
            this.currentUser.minsOnline = (this.currentUser.minsOnline || 0) + 1;
            this.updateUser(this.currentUser);
          }
          if (this.timeRemainingSec === 0 && window.CyberBBS.App) {
            window.CyberBBS.Term?.showNotice('SESSION TIME EXPIRED — DISCONNECTING...');
            setTimeout(() => window.CyberBBS.App.showLogoff(), 900);
          } else if (this.timeRemainingSec === 300 && window.CyberBBS.Term) {
            window.CyberBBS.Term.showNotice('*** WARNING: 5 MINUTES REMAINING ON THIS CALL ***');
            if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
          }
        }
      }, 1000);
    }

    getTimeRemainingFormatted() {
      if (!this.currentUser) return '45:00';
      if (this.getUserRank(this.currentUser).level >= 255) return 'UNLIMITED';
      const m = Math.floor(this.timeRemainingSec / 60).toString().padStart(2, '0');
      const s = (this.timeRemainingSec % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }

    getRatioNumeric() {
      if (!this.currentUser) return 1;
      const downKB = Math.round((this.currentUser.bytesDown || 0) / 1024);
      const upKB = Math.round((this.currentUser.bytesUp || 0) / 1024);
      if (downKB === 0) return 1;
      return Math.max(1, Math.round(downKB / Math.max(1, upKB)));
    }

    getRatio() { return `1:${this.getRatioNumeric()}`; }

    chargeCredits(amount) {
      if (!this.currentUser) return true;
      if (this.getUserRank(this.currentUser).level >= 255) return true;
      if (this.currentUser.credits < amount) return false;
      this.currentUser.credits -= amount;
      this.updateUser(this.currentUser);
      return true;
    }

    rewardCredits(amount) {
      if (!this.currentUser) return;
      this.currentUser.credits = (this.currentUser.credits || 0) + amount;
      this.updateUser(this.currentUser);
    }

    recordTransfer(bytes, isUpload = false) {
      if (!this.currentUser) return 0;
      if (isUpload) {
        this.currentUser.bytesUp = (this.currentUser.bytesUp || 0) + bytes;
        const reward = Math.max(15, Math.ceil(bytes / (1024 * 4)));
        this.rewardCredits(reward);
        this.lowRatioWarned = false;
        return reward;
      } else {
        this.currentUser.bytesDown = (this.currentUser.bytesDown || 0) + bytes;
        this.chargeCredits(Math.ceil(bytes / (1024 * 12)));
        if (this.getRatioNumeric() > 3 && !this.lowRatioWarned) {
          this.lowRatioWarned = true;
          this.addNetmail({
            from: 'DR. NOISE', to: this.currentUser.handle,
            subject: 'RATIO ALERT: Your UL/DL Ratio dropped below 1:3!',
            body: `Heads up ${this.currentUser.handle},\r\nYour current ratio is ${this.getRatio()}.\r\nPlease upload a file in Area 08 or post in the Forum echoes to restore your ratio standing!\r\n\r\n73s, DR. NOISE`
          });
        }
        return 0;
      }
    }

    getLastCallers() { try { return JSON.parse(localStorage.getItem('cyberbbs.callers') || '[]'); } catch (e) { return []; } }
    saveLastCallers(callers) { try { localStorage.setItem('cyberbbs.callers', JSON.stringify(callers.slice(0, 15))); } catch (e) {} }
    addCaller(caller) { const list = this.getLastCallers(); list.unshift(caller); this.saveLastCallers(list); }

    getOneLiners() { try { return JSON.parse(localStorage.getItem('cyberbbs.oneliners') || '[]'); } catch (e) { return []; } }
    saveOneLiners(lines) { try { localStorage.setItem('cyberbbs.oneliners', JSON.stringify(lines.slice(0, 50))); } catch (e) {} }
    addOneLiner(handle, text) { const lines = this.getOneLiners(); lines.unshift({ handle, text: text.substring(0, 70), ts: Date.now() }); this.saveOneLiners(lines); }

    getGameSave(doorName) { try { const g = localStorage.getItem(`cyberbbs.game.${doorName}`); return g ? JSON.parse(g) : null; } catch (e) { return null; } }
    saveGame(doorName, data) { try { localStorage.setItem(`cyberbbs.game.${doorName}`, JSON.stringify(data)); } catch (e) {} }

    async saveUploadFile(name, size, type, arrayBuffer) {
      if (!this.db) await this.initIndexedDB();
      if (!this.db) return null;
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('uploads', 'readwrite');
        const store = tx.objectStore('uploads');
        const item = { name, size, type, data: arrayBuffer, date: new Date().toISOString().substring(0, 10), uploader: this.currentUser ? this.currentUser.handle : 'GUEST' };
        const req = store.add(item);
        req.onsuccess = () => { const reward = this.recordTransfer(size, true); resolve({ item, reward }); };
        req.onerror = () => reject(req.error);
      });
    }

    async getUploadFiles() {
      if (!this.db) await this.initIndexedDB();
      if (!this.db) return [];
      return new Promise((resolve) => {
        const tx = this.db.transaction('uploads', 'readonly');
        const req = tx.objectStore('uploads').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    }

    recordSourceHealth(sourceId, status, latencyMs = 0, error = null) {
      if (!this.sourceHealth) this.sourceHealth = {};
      this.sourceHealth[sourceId] = {
        sourceId,
        status,
        latencyMs,
        lastChecked: Date.now(),
        error: error ? String(error) : null
      };
      try {
        localStorage.setItem('cyberbbs.sourceHealth', JSON.stringify(this.sourceHealth));
      } catch (e) {}
    }

    getSourceHealthReport() {
      if (!this.sourceHealth) {
        try {
          this.sourceHealth = JSON.parse(localStorage.getItem('cyberbbs.sourceHealth') || '{}');
        } catch (e) {
          this.sourceHealth = {};
        }
      }
      return this.sourceHealth;
    }

    getVideoProfile() {
      return localStorage.getItem('cyberbbs.videoProfile') || 'vga80x25';
    }

    saveVideoProfile(id) {
      try { localStorage.setItem('cyberbbs.videoProfile', id); } catch (e) {}
    }

    exportSaveData() {
      const data = {
        schemaVersion: 3,
        version: '3.0',
        exportedAt: new Date().toISOString(),
        users: this.getUsers(),
        callers: this.getLastCallers(),
        oneliners: this.getOneLiners(),
        forum: this.getForumData(),
        netmail: this.getNetmail(),
        ansiVotes: this.getAnsiVotes(),
        customAnsi: this.getCustomAnsiList(),
        triviaScores: this.getTriviaLeaderboard(),
        clockCities: this.getClockCities(),
        games: {
          cyberlord: this.getGameSave('cyberlord'),
          startrade: this.getGameSave('startrade'),
          zork: this.getGameSave('zork')
        },
        sourceHealth: this.getSourceHealthReport()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CYBERBBS_BACKUP_V3_${new Date().toISOString().substring(0, 10)}.JSON`;
      a.click();
      URL.revokeObjectURL(url);
    }

    importFullBackup(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (!data || (!data.version && !data.schemaVersion)) {
          return { ok: false, error: 'INVALID BACKUP FORMAT: Missing schema/version header.' };
        }

        // Schema migration check
        const schema = data.schemaVersion || (parseFloat(data.version) < 3 ? 1 : 2);
        console.log(`[CyberBBS Store] Restoring backup (Schema v${schema})...`);

        if (Array.isArray(data.users)) this.saveUsers(data.users);
        if (Array.isArray(data.callers)) this.saveLastCallers(data.callers);
        if (Array.isArray(data.oneliners)) this.saveOneLiners(data.oneliners);
        if (data.forum) this.saveForumData(data.forum);
        if (Array.isArray(data.netmail)) this.saveNetmail(data.netmail);
        if (data.ansiVotes) localStorage.setItem('cyberbbs.ansiVotes', JSON.stringify(data.ansiVotes));
        if (Array.isArray(data.customAnsi)) localStorage.setItem('cyberbbs.customAnsi', JSON.stringify(data.customAnsi));
        if (Array.isArray(data.triviaScores)) localStorage.setItem('cyberbbs.triviaScores', JSON.stringify(data.triviaScores));
        if (Array.isArray(data.clockCities)) this.saveClockCities(data.clockCities);
        if (data.games) {
          if (data.games.cyberlord) this.saveGame('cyberlord', data.games.cyberlord);
          if (data.games.startrade) this.saveGame('startrade', data.games.startrade);
          if (data.games.zork) this.saveGame('zork', data.games.zork);
        }
        if (data.sourceHealth) {
          this.sourceHealth = data.sourceHealth;
          localStorage.setItem('cyberbbs.sourceHealth', JSON.stringify(data.sourceHealth));
        }
        return { ok: true, message: `FULL SYSTEM BACKUP (Schema v${schema}) RESTORED!` };
      } catch (e) {
        return { ok: false, error: 'BACKUP PARSE ERROR: ' + e.message };
      }
    }
  }

  window.CyberBBS.Store = new BBSStore();
})();
