/**
 * CYBER BBS — Persistence & Identity Layer
 * Handles local profiles, access levels, time bank, ratio economy, 
 * Bulletin Board / Forum JSON database, game saves, and IndexedDB local file storage.
 */
(function() {
  window.CyberBBS = window.CyberBBS || {};

  class BBSStore {
    constructor() {
      this.dbName = 'CyberBBS_DB';
      this.dbVersion = 1;
      this.db = null;
      this.currentUser = null;
      this.sessionMinutes = 30;
      this.timeRemainingSec = 30 * 60;
      this.timerInterval = null;

      this.initIndexedDB();
      this.initDefaultData();
      this.initForumData();
    }

    async initIndexedDB() {
      return new Promise((resolve) => {
        if (!window.indexedDB) {
          resolve(null);
          return;
        }
        const req = indexedDB.open(this.dbName, this.dbVersion);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('uploads')) {
            db.createObjectStore('uploads', { keyPath: 'id', autoIncrement: true });
          }
        };
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this.db);
        };
        req.onerror = () => resolve(null);
      });
    }

    initDefaultData() {
      // 1. Initial Callers Log
      const callers = this.getLastCallers();
      if (!callers || callers.length === 0) {
        const seedCallers = [
          { handle: 'ACID_BURN', city: 'Seattle, WA', baud: '14400', time: '28m', action: 'Files' },
          { handle: 'ZERO_COOL', city: 'New York, NY', baud: '14400', time: '14m', action: 'Doors' },
          { handle: 'CRASH_OVERRIDE', city: 'Chicago, IL', baud: '28800', time: '35m', action: 'Forum' },
          { handle: 'PHANTOM_PHREAK', city: 'Austin, TX', baud: '14400', time: '19m', action: 'Chat' },
          { handle: 'CEREAL_KILLER', city: 'Boston, MA', baud: '9600', time: '41m', action: 'News' }
        ];
        this.saveLastCallers(seedCallers);
      }

      // 2. One-Liners
      const oneliners = this.getOneLiners();
      if (!oneliners || oneliners.length === 0) {
        this.saveOneLiners([
          { handle: 'SYSOP', text: 'Node 2 upgrade coming next month!' },
          { handle: 'ACID_BURN', text: 'Hack the Planet!' },
          { handle: 'ZERO_COOL', text: 'Never send a boy to do a machine\'s job.' },
          { handle: 'CEREAL_KILLER', text: 'They\'re trashing our rights! Trashing!' }
        ]);
      }
    }

    // ==========================================
    // BULLETIN BOARD / FORUM JSON DATABASE
    // ==========================================
    initForumData() {
      const existing = localStorage.getItem('cyberbbs.forum.json');
      if (!existing) {
        const defaultForum = {
          version: '1.0',
          system: 'CYBER BBS FORUM & BULLETIN BOARD',
          updatedAt: new Date().toISOString(),
          categories: [
            {
              id: 'cat-1',
              num: 1,
              title: 'SYSOP ANNOUNCEMENTS & BULLETINS',
              desc: 'Official BBS notices, node upgrades, and sysop bulletins'
            },
            {
              id: 'cat-2',
              num: 2,
              title: 'RETRO COMPUTING & HARDWARE',
              desc: '386/486/Pentium, MS-DOS, OS/2, sound cards, modems'
            },
            {
              id: 'cat-3',
              num: 3,
              title: 'PROGRAMMING & GITHUB REPOS',
              desc: 'C, C++, Assembly, Pascal, Git repositories, terminal tools'
            },
            {
              id: 'cat-4',
              num: 4,
              title: 'TELECOMMUNICATIONS & PHREAKING',
              desc: 'FidoNet backbone, USRobotics modems, serial acoustics, BBS history'
            },
            {
              id: 'cat-5',
              num: 5,
              title: 'ANSI ART & DEMOSCENE',
              desc: 'VGA artpacks, SAUCE metadata, trackers, MOD music'
            },
            {
              id: 'cat-6',
              num: 6,
              title: 'GENERAL OFF-TOPIC LOUNGE',
              desc: 'Everyday banter, cyber-culture, science fiction, greetings'
            }
          ],
          threads: [
            {
              id: 101,
              catId: 'cat-1',
              title: 'Node 1 Upgraded to USRobotics 14.4k HST Dual Standard',
              author: 'DR. NOISE',
              date: '1995-10-12 18:00',
              tags: ['bulletin', 'hardware', 'modem'],
              views: 240,
              posts: [
                {
                  postNum: 1,
                  author: 'DR. NOISE',
                  role: 'SYSOP',
                  date: '1995-10-12 18:00',
                  body: 'Greetings callers!\r\nThe old 2400 baud modem on COM2 has officially been retired.\r\nWe now have a dedicated USRobotics Courier 14.4k HST Dual Standard.\r\nThroughput tests show sustained 1,420 cps with V.42bis compression.\r\nPlease remember the 1:3 upload:download ratio rule!\r\n\r\n--- Cyber BBS 1.0\r\n * Origin: The Basement Node (1:117/101)'
                },
                {
                  postNum: 2,
                  author: 'ACID_BURN',
                  role: 'MEMBER',
                  date: '1995-10-12 21:15',
                  body: 'Awesome upgrade Doc! Downloaded PKZ204G.EXE in under 2 minutes.\r\nCarrier was crystal clear without a single CRC retry.'
                }
              ]
            },
            {
              id: 102,
              catId: 'cat-2',
              title: 'Gravis Ultrasound vs Sound Blaster 16 in DOS Games',
              author: 'ZERO_COOL',
              date: '1995-10-14 14:30',
              tags: ['audio', 'hardware', 'dos'],
              views: 185,
              posts: [
                {
                  postNum: 1,
                  author: 'ZERO_COOL',
                  role: 'MEMBER',
                  date: '1995-10-14 14:30',
                  body: 'Just installed a Gravis Ultrasound (GUS) with 1MB RAM.\r\nListening to DOOM and tracker .MOD files is night and day compared to FM synthesis on the SB16.\r\nAnyone else rocking hardware wavetable in DOS?'
                },
                {
                  postNum: 2,
                  author: 'LORD_NIKON',
                  role: 'MEMBER',
                  date: '1995-10-14 16:42',
                  body: 'GUS is king for demoscene music, but watch out for games that only support Sound Blaster DMA.\r\nUse the SBOS emulator TSR if you get silence in older titles.'
                }
              ]
            },
            {
              id: 103,
              catId: 'cat-3',
              title: 'Writing Portable Terminal Emulators in C',
              author: 'CRASH_OVERRIDE',
              date: '1995-10-15 09:12',
              tags: ['programming', 'c', 'terminal'],
              views: 130,
              posts: [
                {
                  postNum: 1,
                  author: 'CRASH_OVERRIDE',
                  role: 'MEMBER',
                  date: '1995-10-15 09:12',
                  body: 'I am assembling a GitHub-style open repository for vintage terminal emulators.\r\nParsing ANSI escape sequences (CSI commands like SGR and cursor movement) cleanly is tricky when streams arrive in chunks.\r\nCheck out the GitHub Vault door for the source files!'
                }
              ]
            },
            {
              id: 104,
              catId: 'cat-5',
              title: 'Acid Productions October Artpack Released',
              author: 'ACID_BURN',
              date: '1995-10-16 01:20',
              tags: ['ansi', 'artpack', 'ice'],
              views: 310,
              posts: [
                {
                  postNum: 1,
                  author: 'ACID_BURN',
                  role: 'MEMBER',
                  date: '1995-10-16 01:20',
                  body: 'The new October artpack has been uploaded to File Area 02!\r\n25 screens of high-density CP437 box-drawing art with iCE bright backgrounds.\r\nUse the Photo Grabber door to preview or download the raw .ANS files.'
                }
              ]
            }
          ]
        };
        this.saveForumData(defaultForum);
      }
    }

    getForumData() {
      try {
        const raw = localStorage.getItem('cyberbbs.forum.json');
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }

    saveForumData(data) {
      try {
        data.updatedAt = new Date().toISOString();
        localStorage.setItem('cyberbbs.forum.json', JSON.stringify(data, null, 2));
      } catch (e) {}
    }

    getForumCategories() {
      const data = this.getForumData();
      return data ? data.categories : [];
    }

    getForumThreads(catId) {
      const data = this.getForumData();
      if (!data || !data.threads) return [];
      return data.threads.filter(t => !catId || t.catId === catId);
    }

    getThread(threadId) {
      const data = this.getForumData();
      if (!data || !data.threads) return null;
      return data.threads.find(t => t.id === parseInt(threadId, 10));
    }

    createThread(catId, title, author, content, tags = []) {
      const data = this.getForumData();
      if (!data) return null;

      const newId = (data.threads.length > 0 ? Math.max(...data.threads.map(t => t.id)) : 100) + 1;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

      const thread = {
        id: newId,
        catId: catId || 'cat-1',
        title: title.substring(0, 70),
        author: author || 'GUEST',
        date: now,
        tags: Array.isArray(tags) ? tags : [tags],
        views: 1,
        posts: [
          {
            postNum: 1,
            author: author || 'GUEST',
            role: author === 'DR. NOISE' ? 'SYSOP' : 'MEMBER',
            date: now,
            body: `${content}\r\n\r\n--- Cyber BBS 1.0\r\n * Origin: The Digital Frontier (1:117/101)`
          }
        ]
      };

      data.threads.unshift(thread);
      this.saveForumData(data);
      return thread;
    }

    replyToThread(threadId, author, content) {
      const data = this.getForumData();
      if (!data) return null;

      const thread = data.threads.find(t => t.id === parseInt(threadId, 10));
      if (!thread) return null;

      const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const postNum = thread.posts.length + 1;

      thread.posts.push({
        postNum,
        author: author || 'GUEST',
        role: author === 'DR. NOISE' ? 'SYSOP' : 'MEMBER',
        date: now,
        body: `${content}\r\n\r\n--- Cyber BBS 1.0\r\n * Origin: Echo Node (1:117/105)`
      });

      thread.views = (thread.views || 0) + 1;
      this.saveForumData(data);
      return thread;
    }

    exportForumJson() {
      const data = this.getForumData();
      if (!data) return;
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'BULLETIN_BOARD_FORUM.JSON';
      a.click();
      URL.revokeObjectURL(url);
    }

    importForumJson(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (parsed.categories && parsed.threads) {
          this.saveForumData(parsed);
          return { ok: true, message: 'Forum JSON imported successfully!' };
        }
        return { ok: false, error: 'Invalid Forum JSON schema: missing categories or threads.' };
      } catch (e) {
        return { ok: false, error: 'Failed to parse JSON: ' + e.message };
      }
    }

    // ==========================================
    // USER IDENTITY & PROFILES
    // ==========================================
    async hashPassword(password) {
      if (!window.crypto || !window.crypto.subtle) {
        return 'hash_' + password;
      }
      const msgBuffer = new TextEncoder().encode(password + 'cyberbbs_salt_1995');
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    getUsers() {
      try {
        const u = localStorage.getItem('cyberbbs.users');
        return u ? JSON.parse(u) : [];
      } catch (e) {
        return [];
      }
    }

    saveUsers(users) {
      try {
        localStorage.setItem('cyberbbs.users', JSON.stringify(users));
      } catch (e) {}
    }

    findUser(handle) {
      const users = this.getUsers();
      return users.find(u => u.handle.toUpperCase() === handle.toUpperCase());
    }

    async registerUser(handle, password, realName = '', city = '') {
      const users = this.getUsers();
      if (this.findUser(handle)) {
        return { ok: false, error: 'Handle already exists!' };
      }
      const hash = await this.hashPassword(password);
      const newUser = {
        handle: handle.toUpperCase(),
        passHash: hash,
        realName: realName || 'Classified',
        city: city || 'Cyberspace',
        level: 100, // MEMBER
        credits: 500,
        bytesDown: 0,
        bytesUp: 0,
        calls: 1,
        minsOnline: 0,
        created: new Date().toISOString()
      };
      users.push(newUser);
      this.saveUsers(users);
      return { ok: true, user: newUser };
    }

    async loginUser(handle, password) {
      const user = this.findUser(handle);
      if (!user) return { ok: false, error: 'User handle not found' };
      const hash = await this.hashPassword(password);
      if (user.passHash !== hash && user.passHash !== password) {
        return { ok: false, error: 'Invalid password' };
      }
      user.calls = (user.calls || 0) + 1;
      this.updateUser(user);
      return { ok: true, user };
    }

    loginGuest() {
      const guest = {
        handle: 'GUEST',
        realName: 'Visitor',
        city: 'Dial-up Node',
        level: 10, // GUEST
        credits: 100,
        bytesDown: 0,
        bytesUp: 0,
        calls: 1,
        minsOnline: 0
      };
      this.setCurrentUser(guest);
      return guest;
    }

    updateUser(user) {
      const users = this.getUsers();
      const idx = users.findIndex(u => u.handle.toUpperCase() === user.handle.toUpperCase());
      if (idx >= 0) {
        users[idx] = user;
        this.saveUsers(users);
      }
      if (this.currentUser && this.currentUser.handle === user.handle) {
        this.currentUser = user;
      }
    }

    setCurrentUser(user) {
      this.currentUser = user;
      this.timeRemainingSec = (user.level >= 255 ? 9999 : 30) * 60;
      this.startTimer();

      this.addCaller({
        handle: user.handle,
        city: user.city || 'Local',
        baud: '14400',
        time: 'Active',
        action: 'Main'
      });
    }

    startTimer() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        if (this.timeRemainingSec > 0) {
          this.timeRemainingSec--;
          if (this.timeRemainingSec === 300) {
            if (window.CyberBBS.Term) {
              window.CyberBBS.Term.showNotice('*** WARNING: 5 MINUTES REMAINING ON THIS CALL ***');
              if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
            }
          }
        }
      }, 1000);
    }

    getTimeRemainingFormatted() {
      if (!this.currentUser) return '30:00';
      if (this.currentUser.level >= 255) return 'UNLIMITED';
      const m = Math.floor(this.timeRemainingSec / 60).toString().padStart(2, '0');
      const s = (this.timeRemainingSec % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }

    getRatio() {
      if (!this.currentUser) return '1:3';
      const downKB = Math.round((this.currentUser.bytesDown || 0) / 1024);
      const upKB = Math.round((this.currentUser.bytesUp || 0) / 1024);
      if (downKB === 0) return '1:3';
      return `1:${Math.max(1, Math.round(downKB / Math.max(1, upKB)))}`;
    }

    chargeCredits(amount) {
      if (!this.currentUser) return true;
      if (this.currentUser.level >= 255) return true;
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
      if (!this.currentUser) return;
      if (isUpload) {
        this.currentUser.bytesUp = (this.currentUser.bytesUp || 0) + bytes;
        this.rewardCredits(Math.ceil(bytes / (1024 * 5)));
      } else {
        this.currentUser.bytesDown = (this.currentUser.bytesDown || 0) + bytes;
        this.chargeCredits(Math.ceil(bytes / (1024 * 10)));
      }
      this.updateUser(this.currentUser);
    }

    // Callers log
    getLastCallers() {
      try {
        const c = localStorage.getItem('cyberbbs.callers');
        return c ? JSON.parse(c) : [];
      } catch (e) {
        return [];
      }
    }

    saveLastCallers(callers) {
      try {
        localStorage.setItem('cyberbbs.callers', JSON.stringify(callers.slice(0, 15)));
      } catch (e) {}
    }

    addCaller(caller) {
      const list = this.getLastCallers();
      list.unshift(caller);
      this.saveLastCallers(list);
    }

    // One-Liners
    getOneLiners() {
      try {
        const o = localStorage.getItem('cyberbbs.oneliners');
        return o ? JSON.parse(o) : [];
      } catch (e) {
        return [];
      }
    }

    saveOneLiners(lines) {
      try {
        localStorage.setItem('cyberbbs.oneliners', JSON.stringify(lines.slice(0, 50)));
      } catch (e) {}
    }

    addOneLiner(handle, text) {
      const lines = this.getOneLiners();
      lines.unshift({ handle, text: text.substring(0, 70), ts: Date.now() });
      this.saveOneLiners(lines);
    }

    // Game saves
    getGameSave(doorName) {
      try {
        const g = localStorage.getItem(`cyberbbs.game.${doorName}`);
        return g ? JSON.parse(g) : null;
      } catch (e) {
        return null;
      }
    }

    saveGame(doorName, data) {
      try {
        localStorage.setItem(`cyberbbs.game.${doorName}`, JSON.stringify(data));
      } catch (e) {}
    }

    // IndexedDB User File Uploads
    async saveUploadFile(name, size, type, arrayBuffer) {
      if (!this.db) await this.initIndexedDB();
      if (!this.db) return null;

      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('uploads', 'readwrite');
        const store = tx.objectStore('uploads');
        const item = {
          name,
          size,
          type,
          data: arrayBuffer,
          date: new Date().toISOString().substring(0, 10),
          uploader: this.currentUser ? this.currentUser.handle : 'GUEST'
        };
        const req = store.add(item);
        req.onsuccess = () => {
          this.recordTransfer(size, true);
          resolve(item);
        };
        req.onerror = () => reject(req.error);
      });
    }

    async getUploadFiles() {
      if (!this.db) await this.initIndexedDB();
      if (!this.db) return [];

      return new Promise((resolve) => {
        const tx = this.db.transaction('uploads', 'readonly');
        const store = tx.objectStore('uploads');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    }

    exportSaveData() {
      const data = {
        version: '1.0',
        users: this.getUsers(),
        callers: this.getLastCallers(),
        oneliners: this.getOneLiners(),
        forum: this.getForumData(),
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CYBERBBS.SAV';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  window.CyberBBS.Store = new BBSStore();
})();
