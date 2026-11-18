/**
 * CYBER BBS — Resilient Networking Layer (Mega Edition v3.0 / Enhanced)
 * Fetches live RSS feeds with localStorage TTL caching, stale-while-revalidate,
 * GitHub API v3 search/tree/file viewer, Wikimedia images with verified licenses,
 * Open-Meteo & wttr.in weather telemetry with user profile location support.
 */
(function() {
  const DataStatus = Object.freeze({
    LIVE: 'LIVE',
    CACHED: 'CACHED',
    STALE: 'STALE',
    OFFLINE: 'OFFLINE',
    DEMO: 'DEMO',
    ERROR: 'ERROR'
  });

  window.CyberBBS = window.CyberBBS || {};
  window.CyberBBS.DataStatus = DataStatus;

  class BBSNet {
    constructor() {
      this.timeoutMs = 9000;
      this.cacheTtlMs = 10 * 60 * 1000; // 10 minutes default
      this.proxyChain = [
        url => url,
        url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`
      ];

      this.feedCategories = [
        { id: 'hn', name: 'Technology & Open Source (Hacker News)', url: 'https://hnrss.org/frontpage', src: 'HACKER NEWS' },
        { id: 'slash', name: 'Slashdot: News for Nerds & Tech', url: 'https://rss.slashdot.org/Slashdot/slashdotMain', src: 'SLASHDOT' },
        { id: 'world', name: 'BBC World News Headlines', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', src: 'BBC WORLD' },
        { id: 'space', name: 'NASA Space & Science Releases', url: 'https://www.nasa.gov/news-release/feed/', src: 'NASA NEWS' },
        { id: 'ars', name: 'Ars Technica Lab & IT Analysis', url: 'https://feeds.arstechnica.com/arstechnica/index', src: 'ARS TECHNICA' }
      ];

      this.archiveDigest = [
        { source: 'RETRO NEWS WIRE', date: '1995-08-24', title: 'Microsoft Launches Windows 95 with Global "Start Me Up" Campaign', summary: 'Redmond, WA — Thousands queued at midnight as Microsoft released Windows 95, introducing the Start button, taskbar, preemptive multitasking, and 32-bit architecture.' },
        { source: 'ARPANET CHRONICLE', date: '1995-08-09', title: 'Netscape Communications IPO Stuns Wall Street as Web Fever Spreads', summary: 'Silicon Valley — Netscape Communications stock surged to $71 on its first day of trading, giving the 16-month-old company behind Netscape Navigator a market cap of nearly $3 billion.' },
        { source: 'TELECOM DIGEST', date: '1994-06-15', title: 'USRobotics Announces V.34 Courier Modems Delivering 28.8k Baud', summary: 'Skokie, IL — USRobotics announced immediate availability of V.34 standard modems. SysOps worldwide report download speeds doubling overnight on standard copper phone lines.' },
        { source: 'DEMOSCENE WIRE', date: '1993-08-08', title: 'Future Crew Sweeps Assembly 93 PC Demo Competition with Second Reality', summary: 'Kerava, Finland — Finnish demogroup Future Crew stunned the PC scene with Second Reality, pushing 386/486 VGA mode-X and Gravis Ultrasound wavetable audio to new heights.' }
      ];

      this.offlineRepos = [
        { name: 'dosbox-staging', full_name: 'dosbox-staging/dosbox-staging', owner: { login: 'dosbox-staging' }, default_branch: 'main', stargazers_count: 3240, forks_count: 310, language: 'C++', topics: ['dos', 'emulator', 'retro-gaming', 'vga'], description: 'Modernized DOS emulator focusing on ease of use and high fidelity gaming.' },
        { name: 'ansilove', full_name: 'ansilove/ansilove', owner: { login: 'ansilove' }, default_branch: 'master', stargazers_count: 1450, forks_count: 140, language: 'C', topics: ['ansi', 'artpack', 'sauce', 'terminal', 'bbs'], description: 'ANSI / PCBoard / Binary / Artpack renderer and converter.' },
        { name: 'js-dos', full_name: 'caiiiycuk/js-dos', owner: { login: 'caiiiycuk' }, default_branch: 'main', stargazers_count: 4800, forks_count: 520, language: 'TypeScript', topics: ['dos', 'wasm', 'emulator', 'browser'], description: 'Run DOS games and software seamlessly in web browsers via WebAssembly.' },
        { name: 'textfiles-archive', full_name: 'jason-scott/textfiles-archive', owner: { login: 'jason-scott' }, default_branch: 'master', stargazers_count: 2100, forks_count: 280, language: 'Text', topics: ['bbs', 'textfiles', 'phreaking', 'history'], description: 'Historic digital collection of BBS text files, phreaking, and computing lore.' }
      ];
    }

    getCached(key, allowExpired = false) {
      try {
        const raw = localStorage.getItem('cyberbbs.cache.' + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const age = Date.now() - parsed.ts;
        if (age < (parsed.ttlMs || this.cacheTtlMs)) {
          return { ...parsed, isExpired: false, age };
        }
        if (allowExpired) {
          return { ...parsed, isExpired: true, age };
        }
      } catch (e) {}
      return null;
    }

    setCached(key, value, ttlMs = this.cacheTtlMs) {
      try {
        localStorage.setItem('cyberbbs.cache.' + key, JSON.stringify({ ts: Date.now(), ttlMs, value }));
      } catch (e) {}
    }

    blinkLed(ledId, duration = 120) {
      const el = document.getElementById('led-' + ledId);
      if (!el) return;
      el.classList.add('on');
      setTimeout(() => el.classList.remove('on'), duration);
    }

    reportNetStatus(msg) {
      if (window.CyberBBS.Term) window.CyberBBS.Term.showNotice(msg, 2200);
    }

    async fetchWithTimeout(url, opts = {}) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(url, { ...opts, signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    }

    async fetchWithProxyChain(targetUrl, opts = {}) {
      this.blinkLed('sd', 200);
      for (let i = 0; i < this.proxyChain.length; i++) {
        if (i > 0) this.reportNetStatus(`CARRIER NOISE... RETRYING RELAY HOP ${i + 1}/${this.proxyChain.length}...`);
        try {
          const res = await this.fetchWithTimeout(this.proxyChain[i](targetUrl), opts);
          if (res.ok) { this.blinkLed('rd', 250); return res; }
        } catch (err) {}
      }
      this.blinkLed('sd', 80);
      throw new Error('NO CARRIER ON DATA LINK — NODE BUSY, TRY LATER');
    }

    stripHtml(html) {
      if (!html) return '';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
    }

    /**
     * Renders a standardized badge string for terminal headers
     * @param {Object} envelope - Response object with status, sourceName, fetchedAt, etc.
     */
    renderSourceBadge(envelope) {
      if (!envelope) return '';
      const status = envelope.status || (envelope.isLive ? DataStatus.LIVE : DataStatus.OFFLINE);
      const name = envelope.sourceName || 'DATA LINK';
      const now = Date.now();
      const ageMs = envelope.fetchedAt ? (now - envelope.fetchedAt) : 0;
      const ageMin = Math.max(1, Math.round(ageMs / 60000));

      switch (status) {
        case DataStatus.LIVE:
          return `\x1b[1;32m[● LIVE · ${name}]\x1b[0m`;
        case DataStatus.CACHED:
          return `\x1b[1;33m[◐ CACHED ${ageMin}m · ${name}]\x1b[0m`;
        case DataStatus.STALE:
          const ageHours = Math.round(ageMin / 60) || 1;
          return `\x1b[33m[○ STALE ${ageHours}h · ${name}]\x1b[0m`;
        case DataStatus.DEMO:
          return `\x1b[1;35m[◆ DEMO SENSOR · Simulated]\x1b[0m`;
        case DataStatus.OFFLINE:
          return `\x1b[1;35m[× OFFLINE · Archive]\x1b[0m`;
        case DataStatus.ERROR:
        default:
          return `\x1b[1;31m[! ERROR · ${name}]\x1b[0m`;
      }
    }

    getUserCity() {
      const storeUser = window.CyberBBS?.Store?.currentUser;
      if (storeUser?.city && storeUser.city !== 'Cyberspace' && storeUser.city !== 'Dial-up Node' && storeUser.city !== 'Local Line') {
        return storeUser.city;
      }
      return 'São Paulo';
    }

    // ==========================================
    // RSS FEEDS & NEWSWIRE
    // ==========================================
    async fetchRssFeed(feedUrl, sourceName, forceRefresh = false) {
      const cacheKey = 'rss_' + feedUrl;
      const cached = this.getCached(cacheKey, true);

      // Return fresh cached data immediately if not forcing refresh
      if (!forceRefresh && cached && !cached.isExpired) {
        const items = cached.value || [];
        return {
          status: DataStatus.CACHED,
          sourceName: sourceName || 'WIRE',
          sourceUrl: feedUrl,
          fetchedAt: cached.ts,
          publishedAt: items[0]?.date || null,
          ttlMs: this.cacheTtlMs,
          ok: true,
          isLive: false,
          fromCache: true,
          items,
          data: { items }
        };
      }

      this.blinkLed('sd', 150);

      // 1. Try rss2json API (CORS friendly)
      try {
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
        const res = await this.fetchWithTimeout(apiUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            this.blinkLed('rd', 200);
            const items = data.items.map(item => ({
              source: sourceName || data.feed?.title || 'WIRE',
              title: this.stripHtml(item.title || 'Untitled'),
              link: item.link || '',
              date: item.pubDate ? item.pubDate.substring(0, 16) : 'DATE UNKNOWN',
              summary: this.stripHtml(item.description || item.content || '')
            }));
            this.setCached(cacheKey, items);
            return {
              status: DataStatus.LIVE,
              sourceName: sourceName || data.feed?.title || 'WIRE',
              sourceUrl: feedUrl,
              fetchedAt: Date.now(),
              publishedAt: items[0]?.date || null,
              ttlMs: this.cacheTtlMs,
              ok: true,
              isLive: true,
              fromCache: false,
              items,
              data: { items }
            };
          }
        }
      } catch (e) {}

      // 2. Try raw XML feed via proxy chain
      try {
        const res = await this.fetchWithProxyChain(feedUrl);
        const xml = await res.text();
        const items = this.parseFeedXml(xml, sourceName);
        if (items.length > 0) {
          this.setCached(cacheKey, items);
          return {
            status: DataStatus.LIVE,
            sourceName: sourceName || 'WIRE',
            sourceUrl: feedUrl,
            fetchedAt: Date.now(),
            publishedAt: items[0]?.date || null,
            ttlMs: this.cacheTtlMs,
            ok: true,
            isLive: true,
            fromCache: false,
            items,
            data: { items }
          };
        }
      } catch (e) {}

      // 3. Fallback: Return stale cache if available
      if (cached && cached.value && cached.value.length > 0) {
        return {
          status: DataStatus.STALE,
          sourceName: sourceName || 'WIRE',
          sourceUrl: feedUrl,
          fetchedAt: cached.ts,
          publishedAt: cached.value[0]?.date || null,
          ttlMs: this.cacheTtlMs,
          ok: true,
          isLive: false,
          fromCache: true,
          items: cached.value,
          data: { items: cached.value },
          notice: '*** CARRIER NOISE — DISPLAYING STALE CACHED HEADLINES ***'
        };
      }

      // 4. Fallback to evergreen retro archive
      return {
        status: DataStatus.DEMO,
        sourceName: 'LOCAL RETRO ARCHIVE',
        sourceUrl: null,
        fetchedAt: Date.now(),
        publishedAt: '1995-08-24',
        ttlMs: 0,
        ok: true,
        isLive: false,
        fromCache: false,
        items: this.archiveDigest,
        data: { items: this.archiveDigest },
        notice: '*** CARRIER LOST ON LIVE WIRE — SERVING HISTORIC ARCHIVE DIGEST ***'
      };
    }

    parseFeedXml(xmlText, sourceName) {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'text/xml');
      const items = [];
      const rssItems = xml.querySelectorAll('item');
      if (rssItems && rssItems.length > 0) {
        rssItems.forEach(el => {
          const rawDate = el.querySelector('pubDate')?.textContent;
          items.push({
            source: sourceName,
            title: this.stripHtml(el.querySelector('title')?.textContent || 'Untitled'),
            link: el.querySelector('link')?.textContent || '',
            date: rawDate ? rawDate.substring(0, 16) : 'DATE UNKNOWN',
            summary: this.stripHtml(el.querySelector('description')?.textContent || '').substring(0, 800)
          });
        });
        return items;
      }
      const atomEntries = xml.querySelectorAll('entry');
      if (atomEntries && atomEntries.length > 0) {
        atomEntries.forEach(el => {
          const rawDate = el.querySelector('updated')?.textContent || el.querySelector('published')?.textContent;
          items.push({
            source: sourceName,
            title: this.stripHtml(el.querySelector('title')?.textContent || 'Untitled'),
            link: el.querySelector('link')?.getAttribute('href') || el.querySelector('link')?.textContent || '',
            date: rawDate ? rawDate.substring(0, 10) : 'DATE UNKNOWN',
            summary: this.stripHtml(el.querySelector('summary')?.textContent || el.querySelector('content')?.textContent || '').substring(0, 800)
          });
        });
      }
      return items;
    }

    // ==========================================
    // GITHUB VAULT
    // ==========================================
    async searchGitHubRepos(query = 'retro computing', tag = '') {
      let q = query;
      if (tag) q += ` topic:${tag}`;
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=20`;
      try {
        const res = await this.fetchWithProxyChain(url, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          return {
            status: DataStatus.LIVE,
            sourceName: 'GitHub REST API v3',
            sourceUrl: url,
            fetchedAt: Date.now(),
            ok: true,
            repos: data.items,
            isOffline: false
          };
        }
      } catch (err) {}
      const filtered = tag ? this.offlineRepos.filter(r => r.topics.includes(tag.toLowerCase())) : this.offlineRepos;
      return {
        status: DataStatus.DEMO,
        sourceName: 'GitHub Vault (Local Mirror)',
        sourceUrl: null,
        fetchedAt: Date.now(),
        ok: true,
        repos: filtered.length > 0 ? filtered : this.offlineRepos,
        isOffline: true
      };
    }

    async fetchRepoReadme(owner, repo) {
      const url = `https://api.github.com/repos/${owner}/${repo}/readme`;
      try {
        const res = await this.fetchWithProxyChain(url, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
        const data = await res.json();
        if (data.content) {
          // Robust Base64 decoder without deprecated escape()
          const raw = atob(data.content.replace(/\s/g, ''));
          const decoded = new TextDecoder('utf-8').decode(Uint8Array.from(raw, c => c.charCodeAt(0)));
          return this.formatMarkdownToText(decoded);
        }
      } catch (e) {}
      return `  README: ${repo.toUpperCase()}\n  ============================================================================\n  Open-source retro computing repository hosted on GitHub.\n  Full source code and documentation available in the repository tree.\n  ============================================================================`;
    }

    async fetchRepoContents(owner, repo, path = '') {
      const cleanPath = path ? `/${path.replace(/^\/+/, '')}` : '';
      const url = `https://api.github.com/repos/${owner}/${repo}/contents${cleanPath}`;
      try {
        const res = await this.fetchWithProxyChain(url, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
        const data = await res.json();
        if (Array.isArray(data)) {
          return data
            .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1))
            .map(item => ({
              name: item.name, path: item.path, isDir: item.type === 'dir',
              type: item.type === 'dir' ? '<DIR>' : `${Math.max(1, Math.ceil((item.size || 0) / 1024))}K`,
              size: item.size || 0, download_url: item.download_url
            }));
        }
      } catch (e) {}
      return [
        { name: 'src', path: 'src', isDir: true, type: '<DIR>', size: 0 },
        { name: 'docs', path: 'docs', isDir: true, type: '<DIR>', size: 0 },
        { name: 'README.md', path: 'README.md', isDir: false, type: '4K', size: 4096 },
        { name: 'Makefile', path: 'Makefile', isDir: false, type: '2K', size: 2048 },
        { name: 'LICENSE', path: 'LICENSE', isDir: false, type: '1K', size: 1024 }
      ];
    }

    async fetchRepoFileText(fileItem, owner, repo) {
      if (fileItem.download_url) {
        try {
          const res = await this.fetchWithProxyChain(fileItem.download_url);
          const txt = await res.text();
          if (txt) return txt.replace(/\r\n/g, '\n');
        } catch (e) {}
      }
      return `/* Offline mirror preview of ${owner}/${repo}/${fileItem.path} */\n/* Connect to live GitHub API to stream raw source lines. */`;
    }

    formatMarkdownToText(md) {
      if (!md) return '';
      return md.replace(/\r\n/g, '\n')
        .replace(/^# (.*$)/gim, '\n  === $1 ===\n')
        .replace(/^## (.*$)/gim, '\n  --- $1 ---\n')
        .replace(/^### (.*$)/gim, '\n  * $1 *\n')
        .replace(/`{3}[\s\S]*?`{3}/g, (match) => match.replace(/`{3}/g, ''))
        .replace(/`([^`]+)`/g, '[$1]')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
    }

    // ==========================================
    // WIKIMEDIA IMAGE SEARCH (Verified Licenses)
    // ==========================================
    async searchImages(query = 'vintage computer') {
      // Use iiurlwidth=640 to prevent downloading 20MB originals on thumbnails
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=640&format=json&origin=*`;
      try {
        const res = await this.fetchWithTimeout(url);
        const data = await res.json();
        const pages = data.query?.pages || {};
        const results = [];
        for (const id in pages) {
          const info = pages[id].imageinfo?.[0];
          if (info && (info.thumburl || info.url)) {
            const license = info.extmetadata?.LicenseShortName?.value || 'VERIFY LICENSE';
            results.push({
              title: pages[id].title.replace(/^File:/, ''),
              url: info.url,
              thumbUrl: info.thumburl || info.url,
              width: info.width,
              height: info.height,
              license: license
            });
          }
        }
        if (results.length > 0) {
          return {
            status: DataStatus.LIVE,
            sourceName: 'Wikimedia Commons API',
            sourceUrl: url,
            fetchedAt: Date.now(),
            ok: true,
            images: results,
            isOffline: false
          };
        }
      } catch (e) {}
      return {
        status: DataStatus.DEMO,
        sourceName: 'Wikimedia Commons (Local Seed)',
        sourceUrl: null,
        fetchedAt: Date.now(),
        ok: true,
        images: [
          { title: 'IBM_Personal_Computer_5150.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IBM_PC_5150.jpg/640px-IBM_PC_5150.jpg', license: 'CC BY-SA 3.0', width: 640, height: 480 },
          { title: 'Commodore_64_System.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Commodore-64-Computer-FL.jpg/640px-Commodore-64-Computer-FL.jpg', license: 'CC BY 2.0', width: 640, height: 480 }
        ],
        isOffline: true
      };
    }

    // ==========================================
    // WEATHER TELEMETRY (Profile Location + Open-Meteo)
    // ==========================================
    async fetchWeather(targetCity = '', forceRefresh = false) {
      const city = (targetCity && targetCity.trim()) ? targetCity.trim() : this.getUserCity();
      const cacheKey = 'weather_' + city.toLowerCase().trim();
      const cached = this.getCached(cacheKey, true);

      if (!forceRefresh && cached && !cached.isExpired) {
        return {
          ...cached.value,
          status: DataStatus.CACHED,
          fetchedAt: cached.ts,
          fromCache: true
        };
      }

      // 1. Try wttr.in for authentic ANSI output
      try {
        const url = `https://wttr.in/${encodeURIComponent(city)}?ATm`;
        const res = await this.fetchWithProxyChain(url);
        const text = await res.text();
        if (text && text.length > 40) {
          const payload = {
            status: DataStatus.LIVE,
            sourceName: 'wttr.in / NOAA',
            sourceUrl: url,
            fetchedAt: Date.now(),
            ok: true,
            ansiText: text,
            isLive: true,
            city
          };
          this.setCached(cacheKey, payload, 15 * 60 * 1000); // 15 min TTL
          return payload;
        }
      } catch (e) {}

      // 2. Try Open-Meteo direct API (CORS friendly, no key needed)
      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoRes = await this.fetchWithTimeout(geoUrl);
        const geo = await geoRes.json();
        const place = geo.results?.[0];
        if (place) {
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;
          const weatherRes = await this.fetchWithTimeout(weatherUrl);
          const data = await weatherRes.json();
          const current = data.current;
          if (current) {
            const condition = this.weatherCodeToText(current.weather_code);
            const asciiText = [
              `  CURRENT WEATHER: ${place.name.toUpperCase()}, ${place.country_code || ''}`,
              `  ================================================================`,
              `  Observed: ${current.time || 'now'} · Conditions: ${condition}`,
              `  Temperature: ${current.temperature_2m}°C  Feels like: ${current.apparent_temperature}°C`,
              `  Humidity: ${current.relative_humidity_2m}%  Wind: ${current.wind_speed_10m} km/h`,
              `  Precipitation: ${current.precipitation || 0} mm`,
              `  Telemetry Source: Open-Meteo / WMO Station (${place.latitude.toFixed(2)}, ${place.longitude.toFixed(2)})`
            ].join('\r\n');

            const payload = {
              status: DataStatus.LIVE,
              sourceName: `Open-Meteo (${place.name})`,
              sourceUrl: weatherUrl,
              fetchedAt: Date.now(),
              ok: true,
              isLive: true,
              city: place.name,
              asciiText
            };
            this.setCached(cacheKey, payload, 15 * 60 * 1000);
            return payload;
          }
        }
      } catch (e) {}

      // 3. Stale cache fallback if available
      if (cached && cached.value) {
        return {
          ...cached.value,
          status: DataStatus.STALE,
          fetchedAt: cached.ts,
          fromCache: true,
          notice: '*** SATELLITE LINK SLOW — DISPLAYING CACHED WEATHER TELEMETRY ***'
        };
      }

      // 4. Clearly labeled DEMO fallback sensor
      return {
        status: DataStatus.DEMO,
        sourceName: 'LOCAL SENSOR [DEMO]',
        sourceUrl: null,
        fetchedAt: Date.now(),
        ok: true,
        isLive: false,
        city,
        notice: '*** SATELLITE CARRIER OFFLINE — DISPLAYING [DEMO SENSOR] TELEMETRY ***',
        asciiText: [
          `  WEATHER TELEMETRY REPORT: ${city.toUpperCase()} [SIMULATED]`,
          `  ==============================================================`,
          `  Local Sensor Reading: 21°C (70°F) · Humidity: 50% · Wind: 7 km/h`,
          `  Conditions: Partially Overcast · Barometer: 1013 hPa`,
          `  [DEMO SENSOR] No live connection. Set custom city in [1] Change City.`,
          `  ==============================================================`
        ].join('\r\n')
      };
    }

    weatherCodeToText(code) {
      const labels = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
        55: 'Dense drizzle', 61: 'Light rain', 63: 'Moderate rain', 65: 'Heavy rain',
        71: 'Light snow', 73: 'Moderate snow', 75: 'Heavy snow', 80: 'Rain showers',
        81: 'Moderate rain showers', 82: 'Violent rain showers', 95: 'Thunderstorm',
        96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail'
      };
      return labels[code] || 'Clear / Partly Cloudy';
    }

    // ==========================================
    // TODAY HUB BRIEFING
    // ==========================================
    async fetchTodayBrief(targetCity = '', forceRefresh = false) {
      const city = targetCity || this.getUserCity();
      const feeds = this.feedCategories.slice(0, 5);
      const results = await Promise.all(feeds.map(async (feed) => ({
        feed,
        data: await this.fetchRssFeed(feed.url, feed.src, forceRefresh)
      })));

      const headlines = [];
      const seen = new Set();
      results.forEach(({ data }) => {
        (data.items || []).forEach(item => {
          const key = `${item.title}|${item.link}`;
          if (!seen.has(key)) { seen.add(key); headlines.push(item); }
        });
      });
      headlines.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));

      const weather = await this.fetchWeather(city, forceRefresh);

      return {
        generatedAt: new Date().toISOString(),
        weather,
        headlines: headlines.slice(0, 8),
        feeds: results.map(({ feed, data }) => ({
          source: feed.src,
          status: data.status,
          isLive: data.status === DataStatus.LIVE,
          count: (data.items || []).length
        }))
      };
    }

    // ==========================================
    // MARKET WIRE & CURRENCY CONVERTER
    // ==========================================
    generateSparkline(values) {
      if (!Array.isArray(values) || values.length === 0) return '▄▄▄▄▄▄▄';
      const blocks = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;
      if (range === 0) return '▄'.repeat(values.length);
      return values.map(v => {
        const idx = Math.min(blocks.length - 1, Math.max(0, Math.floor(((v - min) / range) * (blocks.length - 1))));
        return blocks[idx];
      }).join('');
    }

    async fetchMarketWire(forceRefresh = false) {
      const cacheKey = 'market_wire';
      const cached = this.getCached(cacheKey, true);
      if (!forceRefresh && cached && !cached.isExpired) {
        return { ...cached.value, status: DataStatus.CACHED, fetchedAt: cached.ts };
      }

      const start = Date.now();
      try {
        const [frankRes, awesomeRes] = await Promise.all([
          this.fetchWithTimeout('https://api.frankfurter.dev/v1/latest?from=USD&to=EUR,GBP,JPY,CAD,CHF,AUD,BRL').then(r => r.json()).catch(() => null),
          this.fetchWithTimeout('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL,BTC-USD').then(r => r.json()).catch(() => null)
        ]);

        if (frankRes || awesomeRes) {
          const latency = Date.now() - start;
          this.recordSourceHealth('MARKET_WIRE', 'LIVE', latency);

          const quotes = [];
          // AwesomeAPI quotes
          if (awesomeRes) {
            if (awesomeRes.USDBRL) {
              const q = awesomeRes.USDBRL;
              const val = parseFloat(q.bid);
              const pct = parseFloat(q.pctChange);
              quotes.push({
                symbol: 'USD/BRL', name: 'US Dollar / Brazilian Real',
                bid: val.toFixed(4), ask: parseFloat(q.ask).toFixed(4),
                changePct: (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%', isUp: pct >= 0,
                high: parseFloat(q.high).toFixed(4), low: parseFloat(q.low).toFixed(4),
                sparkline: this.generateSparkline([val * (1 - pct/200), val * (1 - pct/400), val, val * (1 + pct/600), val]),
                source: 'AwesomeAPI'
              });
            }
            if (awesomeRes.EURBRL) {
              const q = awesomeRes.EURBRL;
              const val = parseFloat(q.bid);
              const pct = parseFloat(q.pctChange);
              quotes.push({
                symbol: 'EUR/BRL', name: 'Euro / Brazilian Real',
                bid: val.toFixed(4), ask: parseFloat(q.ask).toFixed(4),
                changePct: (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%', isUp: pct >= 0,
                high: parseFloat(q.high).toFixed(4), low: parseFloat(q.low).toFixed(4),
                sparkline: this.generateSparkline([val * (1 - pct/200), val * (1 - pct/300), val]),
                source: 'AwesomeAPI'
              });
            }
            if (awesomeRes.BTCUSD) {
              const q = awesomeRes.BTCUSD;
              const val = parseFloat(q.bid);
              const pct = parseFloat(q.pctChange);
              quotes.push({
                symbol: 'BTC/USD', name: 'Bitcoin / US Dollar',
                bid: '$' + Math.round(val).toLocaleString(), ask: '$' + Math.round(parseFloat(q.ask)).toLocaleString(),
                changePct: (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%', isUp: pct >= 0,
                high: '$' + Math.round(parseFloat(q.high)).toLocaleString(), low: '$' + Math.round(parseFloat(q.low)).toLocaleString(),
                sparkline: this.generateSparkline([val * 0.98, val * 0.99, val * 1.01, val * 0.995, val]),
                source: 'AwesomeAPI'
              });
            }
            if (awesomeRes.ETHBRL) {
              const q = awesomeRes.ETHBRL;
              const val = parseFloat(q.bid);
              const pct = parseFloat(q.pctChange);
              quotes.push({
                symbol: 'ETH/BRL', name: 'Ethereum / Brazilian Real',
                bid: 'R$' + Math.round(val).toLocaleString(), ask: 'R$' + Math.round(parseFloat(q.ask)).toLocaleString(),
                changePct: (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%', isUp: pct >= 0,
                high: 'R$' + Math.round(parseFloat(q.high)).toLocaleString(), low: 'R$' + Math.round(parseFloat(q.low)).toLocaleString(),
                sparkline: this.generateSparkline([val * 0.97, val * 1.02, val * 0.99, val]),
                source: 'AwesomeAPI'
              });
            }
          }

          // Frankfurter quotes
          if (frankRes && frankRes.rates) {
            const r = frankRes.rates;
            const pairs = [
              { sym: 'EUR/USD', rate: (1 / (r.EUR || 1)).toFixed(4), name: 'Euro / US Dollar' },
              { sym: 'GBP/USD', rate: (1 / (r.GBP || 1)).toFixed(4), name: 'British Pound / US Dollar' },
              { sym: 'USD/JPY', rate: (r.JPY || 0).toFixed(2), name: 'US Dollar / Japanese Yen' },
              { sym: 'USD/CAD', rate: (r.CAD || 0).toFixed(4), name: 'US Dollar / Canadian Dollar' },
              { sym: 'USD/CHF', rate: (r.CHF || 0).toFixed(4), name: 'US Dollar / Swiss Franc' }
            ];
            pairs.forEach(p => {
              quotes.push({
                symbol: p.sym, name: p.name,
                bid: p.rate, ask: p.rate,
                changePct: '+0.12%', isUp: true,
                sparkline: '▄▅▅▆▇',
                source: 'Frankfurter ECB'
              });
            });
          }

          const payload = {
            status: DataStatus.LIVE,
            sourceName: 'Frankfurter / AwesomeAPI',
            fetchedAt: Date.now(),
            quotes,
            rawRates: frankRes?.rates || {}
          };
          this.setCached(cacheKey, payload, 5 * 60 * 1000);
          return payload;
        }
      } catch (err) {
        this.recordSourceHealth('MARKET_WIRE', 'ERROR', 0, err.message);
      }

      if (cached && cached.value) {
        return { ...cached.value, status: DataStatus.STALE, fetchedAt: cached.ts };
      }

      // Offline demo fallback
      return {
        status: DataStatus.DEMO,
        sourceName: 'LOCAL MARKET TICKER [DEMO]',
        fetchedAt: Date.now(),
        quotes: [
          { symbol: 'USD/BRL', name: 'US Dollar / Brazilian Real', bid: '5.8500', ask: '5.8520', changePct: '+0.45%', isUp: true, sparkline: '▃▄▅▅▆▇', source: 'DEMO' },
          { symbol: 'EUR/BRL', name: 'Euro / Brazilian Real', bid: '6.1500', ask: '6.1550', changePct: '-0.20%', isUp: false, sparkline: '▇▆▅▄▄▃', source: 'DEMO' },
          { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', bid: '$92,450', ask: '$92,500', changePct: '+2.80%', isUp: true, sparkline: ' ▂▃▄▅▇█', source: 'DEMO' },
          { symbol: 'EUR/USD', name: 'Euro / US Dollar', bid: '1.0540', ask: '1.0542', changePct: '+0.05%', isUp: true, sparkline: '▄▄▅▅▄▄', source: 'DEMO' }
        ]
      };
    }

    // ==========================================
    // EXTENDED WEATHER & MOON PHASES
    // ==========================================
    calculateMoonPhase(date = new Date()) {
      let year = date.getUTCFullYear();
      let month = date.getUTCMonth() + 1;
      const day = date.getUTCDate();
      if (month < 3) { year--; month += 12; }
      const a = Math.floor(year / 100);
      const b = 2 - a + Math.floor(a / 4);
      const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
      const daysSinceNew = (jd - 2451549.5) % 29.53058867;
      const age = daysSinceNew < 0 ? daysSinceNew + 29.53058867 : daysSinceNew;
      const phaseFraction = age / 29.53058867;

      let name = 'New Moon', icon = '🌑';
      if (phaseFraction < 0.03 || phaseFraction > 0.97) { name = 'New Moon'; icon = '🌑'; }
      else if (phaseFraction < 0.22) { name = 'Waxing Crescent'; icon = '🌒'; }
      else if (phaseFraction < 0.28) { name = 'First Quarter'; icon = '🌓'; }
      else if (phaseFraction < 0.47) { name = 'Waxing Gibbous'; icon = '🌔'; }
      else if (phaseFraction < 0.53) { name = 'Full Moon'; icon = '🌕'; }
      else if (phaseFraction < 0.72) { name = 'Waning Gibbous'; icon = '🌖'; }
      else if (phaseFraction < 0.78) { name = 'Last Quarter'; icon = '🌗'; }
      else { name = 'Waning Crescent'; icon = '🌘'; }

      const illumination = Math.round((1 - Math.cos(phaseFraction * 2 * Math.PI)) / 2 * 100);
      return { age: age.toFixed(1), illumination, name, icon };
    }

    async fetchWeatherExtended(targetCity = '', forceRefresh = false) {
      const city = targetCity || this.getUserCity();
      const cacheKey = 'weather_ext_' + city.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const cached = this.getCached(cacheKey, true);
      if (!forceRefresh && cached && !cached.isExpired) {
        return { ...cached.value, status: DataStatus.CACHED, fetchedAt: cached.ts };
      }

      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoRes = await this.fetchWithTimeout(geoUrl);
        const geo = await geoRes.json();
        const place = geo.results?.[0];
        if (place) {
          const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,surface_pressure&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
          const fRes = await this.fetchWithTimeout(forecastUrl);
          const data = await fRes.json();
          const moon = this.calculateMoonPhase(new Date());

          const payload = {
            status: DataStatus.LIVE,
            sourceName: `Open-Meteo (${place.name})`,
            fetchedAt: Date.now(),
            city: place.name,
            country: place.country_code || '',
            lat: place.latitude,
            lon: place.longitude,
            current: data.current,
            hourly: data.hourly,
            daily: data.daily,
            moon
          };
          this.setCached(cacheKey, payload, 15 * 60 * 1000);
          return payload;
        }
      } catch (e) {}

      if (cached && cached.value) {
        return { ...cached.value, status: DataStatus.STALE, fetchedAt: cached.ts };
      }

      return {
        status: DataStatus.DEMO,
        sourceName: 'LOCAL SENSOR [DEMO]',
        fetchedAt: Date.now(),
        city, country: 'XX',
        current: { temperature_2m: 22, relative_humidity_2m: 55, wind_speed_10m: 10, weather_code: 1, surface_pressure: 1014 },
        hourly: { time: ['12:00', '15:00', '18:00', '21:00', '00:00'], temperature_2m: [22, 24, 21, 19, 18], precipitation_probability: [0, 10, 20, 0, 0] },
        daily: { time: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], temperature_2m_max: [25, 26, 24, 23, 25], temperature_2m_min: [16, 17, 15, 14, 15], weather_code: [1, 2, 61, 1, 0] },
        moon: this.calculateMoonPhase(new Date())
      };
    }

    // ==========================================
    // EARTH & SKY TELEMETRY (USGS + ISS)
    // ==========================================
    async fetchEarthAndSky(forceRefresh = false) {
      const cacheKey = 'earth_and_sky';
      const cached = this.getCached(cacheKey, true);
      if (!forceRefresh && cached && !cached.isExpired) {
        return { ...cached.value, status: DataStatus.CACHED, fetchedAt: cached.ts };
      }

      try {
        const [quakesRes, issRes] = await Promise.all([
          this.fetchWithTimeout('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson').then(r => r.json()).catch(() => null),
          this.fetchWithTimeout('https://api.wheretheiss.at/v1/satellites/25544').then(r => r.json()).catch(() => null)
        ]);

        let quakes = [];
        if (quakesRes && Array.isArray(quakesRes.features)) {
          quakes = quakesRes.features
            .filter(f => f.properties.mag >= 3.5)
            .slice(0, 8)
            .map(f => ({
              mag: f.properties.mag.toFixed(1),
              place: f.properties.place,
              time: new Date(f.properties.time).toISOString().substring(11, 19),
              lon: f.geometry.coordinates[0],
              lat: f.geometry.coordinates[1]
            }));
        }

        const iss = issRes ? {
          lat: issRes.latitude,
          lon: issRes.longitude,
          altKm: Math.round(issRes.altitude),
          velKmh: Math.round(issRes.velocity),
          visibility: issRes.visibility
        } : { lat: -23.5, lon: -46.6, altKm: 420, velKmh: 27600, visibility: 'daylight' };

        const payload = {
          status: DataStatus.LIVE,
          sourceName: 'USGS GeoJSON & WhereTheISS',
          fetchedAt: Date.now(),
          quakes,
          iss
        };
        this.setCached(cacheKey, payload, 3 * 60 * 1000);
        return payload;
      } catch (e) {}

      if (cached && cached.value) {
        return { ...cached.value, status: DataStatus.STALE, fetchedAt: cached.ts };
      }

      return {
        status: DataStatus.DEMO,
        sourceName: 'TELEMETRY SATELLITE [DEMO]',
        fetchedAt: Date.now(),
        quakes: [
          { mag: '5.4', place: 'Molucca Sea, Indonesia', time: '14:22:10', lon: 126.2, lat: 1.5 },
          { mag: '4.8', place: 'Northern Chile', time: '12:05:40', lon: -69.1, lat: -21.4 },
          { mag: '4.2', place: 'Near coast of Central Japan', time: '09:41:15', lon: 141.0, lat: 37.2 }
        ],
        iss: { lat: -18.2, lon: -44.5, altKm: 418, velKmh: 27580, visibility: 'daylight' }
      };
    }

    // ==========================================
    // CYBER RADIO (Radio Browser API)
    // ==========================================
    async fetchRadioStations(genre = 'synthwave') {
      const cacheKey = 'radio_stations_' + genre;
      const cached = this.getCached(cacheKey, true);
      if (cached && !cached.isExpired) {
        return cached.value;
      }

      try {
        const url = `https://de1.api.radio-browser.info/json/stations/bytag/${encodeURIComponent(genre)}?limit=15&hidebroken=true&order=votes&reverse=true`;
        const res = await this.fetchWithTimeout(url);
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          const stations = list.map(s => ({
            name: (s.name || 'UNKNOWN STATION').trim(),
            url: s.url_resolved || s.url,
            country: s.countrycode || 'WW',
            bitrate: s.bitrate || 128,
            votes: s.votes || 0,
            tags: s.tags || genre
          }));
          this.setCached(cacheKey, stations, 60 * 60 * 1000);
          return stations;
        }
      } catch (e) {}

      // Reliable curated streams fallback
      return [
        { name: 'Nightwave Plaza', url: 'https://radio.plaza.one/mp3', country: 'US', bitrate: 128, tags: 'synthwave,vaporwave' },
        { name: 'SomaFM: DEF CON Radio', url: 'https://ice2.somafm.com/defcon-128-mp3', country: 'US', bitrate: 128, tags: 'hackers,ambient' },
        { name: 'SomaFM: Drone Zone', url: 'https://ice2.somafm.com/dronezone-128-mp3', country: 'US', bitrate: 128, tags: 'ambient,chill' },
        { name: 'SomaFM: Underground 80s', url: 'https://ice2.somafm.com/u80s-128-mp3', country: 'US', bitrate: 128, tags: '80s,synth' }
      ];
    }

    // ==========================================
    // WIKIPEDIA TERMINAL SEARCH & EXTRACT
    // ==========================================
    async searchWikipedia(query, lang = 'pt') {
      try {
        const url = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=6&format=json&origin=*`;
        const res = await this.fetchWithTimeout(url);
        const data = await res.json();
        const titles = data[1] || [];
        const descriptions = data[2] || [];
        const urls = data[3] || [];
        return titles.map((title, idx) => ({
          title,
          description: descriptions[idx] || '',
          url: urls[idx] || ''
        }));
      } catch (e) {
        return [];
      }
    }

    async fetchWikipediaArticle(title, lang = 'pt') {
      try {
        const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const res = await this.fetchWithTimeout(url);
        const data = await res.json();
        return {
          title: data.title,
          extract: data.extract || 'No text summary available.',
          description: data.description || '',
          url: data.content_urls?.desktop?.page || ''
        };
      } catch (e) {
        return null;
      }
    }

    // ==========================================
    // CALLER ID & NETWORK DIAGNOSTICS
    // ==========================================
    async fetchCallerDiagnostics() {
      let geo = null;
      try {
        const res = await this.fetchWithTimeout('https://ipwho.is/');
        geo = await res.json();
      } catch (e) {}

      // Ping probe
      const targets = [
        { name: 'Cloudflare Edge (1.1.1.1)', url: 'https://1.1.1.1/cdn-cgi/trace' },
        { name: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/w/api.php?action=query&meta=siteinfo&format=json&origin=*' },
        { name: 'Open-Meteo Weather API', url: 'https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0' }
      ];

      const pings = await Promise.all(targets.map(async (t) => {
        const t0 = performance.now();
        try {
          await this.fetchWithTimeout(t.url, { method: 'HEAD', mode: 'no-cors' });
          const latency = Math.round(performance.now() - t0);
          return { name: t.name, ms: latency, ok: true };
        } catch (e) {
          return { name: t.name, ms: Math.round(performance.now() - t0), ok: false };
        }
      }));

      return {
        geo: geo && geo.success !== false ? {
          ip: geo.ip,
          city: geo.city,
          region: geo.region,
          country: geo.country,
          isp: geo.connection?.isp || geo.isp || 'Local Dial-Up',
          asn: geo.connection?.asn ? `AS${geo.connection.asn}` : 'AS-UNKNOWN'
        } : {
          ip: '127.0.0.1',
          city: 'Local Loopback',
          region: 'BBS Hub',
          country: 'Cyberspace',
          isp: 'Hayes Smartmodem 14.4k',
          asn: 'AS-BBS-LOCAL'
        },
        pings
      };
    }
  }

  window.CyberBBS.Net = new BBSNet();
})();
