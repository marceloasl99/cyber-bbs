# CYBER BBS — Mega Edition v3.0

CYBER BBS is a self-contained browser simulation of a 1990s dial-up Bulletin Board System. It keeps the visual language of an ANSI/CP437 terminal while adding useful current-day services: live RSS headlines, current weather, GitHub browsing, image search, practical web links, local netmail, file downloads, local uploads, games, an ANSI editor, multi-node status, and a weekly BBS newspaper.

The interface is intentionally written in English and presented as a fictional 1995 system operated by **DR. NOISE** on a 486DX2/66 with a USRobotics Courier 14.4k HST modem.

## What is new in Mega Edition v3.0

- **Netmail:** local private mailbox with inbox, replies, deletion, unread counters, multiline composition, and SysOp bot replies.
- **Daily briefing:** the `TODAY` command or menu option `13` combines current date/time, live weather, RSS headlines, source health, and practical links.
- **Current weather:** live `wttr.in` data with Open-Meteo fallback and explicit offline status.
- **News refresh:** RSS feeds can be refreshed manually and cached results remain usable when a provider is unavailable.
- **File catalog:** searchable `FILES.BBS`-style areas, `FILE_ID.DIZ` detail views, real browser downloads, ZMODEM transfer theater, and local uploads.
- **ANSI workshop:** gallery voting, SAUCE metadata, and a mouse/keyboard ANSI art editor that saves artwork locally.
- **More doors:** Cyber Lord RPG, Star Trade, Zork-style adventure, Trivia Night, Blackjack, Hangman, Fortune, and additional retro utilities.
- **Multi-node hopper:** switch between fictional node lines with separate callers and activity.
- **Weekly newspaper:** generated local BBS newspaper with system activity, headlines, weather, and editorials.
- **Progression:** login streaks, ranks, credits, upload/download ratio, forum activity, trivia score, and ANSI Master status.
- **Terminal commands:** full-word commands such as `NEWS`, `FILES`, `MAIL`, `TODAY`, `NODES`, `NEWSPAPER`, `STATS`, `SETTINGS`, `PURE`, `NIGHT`, and `LOGOFF`.
- **Accessibility and stability:** keyboard navigation, focus states, reduced-motion support, screen-reader metadata, reliable back navigation, and fullscreen synchronization.

## Run on Windows

### Double-click mode

Open `index.html` in Chrome, Edge, or Firefox. No installation or build step is required.

`cyber-bbs.html` is an identical standalone copy for distribution and backup.

### Local HTTP mode

HTTP mode is recommended for the most reliable browser behavior with external APIs:

```powershell
python -m http.server 8080
```

Open:

```text
http://localhost:8080/index.html
```

The project does not require npm, a framework, a database server, Docker, or API keys for its default features.

## First session

1. Open `index.html`.
2. Press `1`, `Enter`, or click the dial area.
3. Listen to or skip the synthesized modem handshake with `Esc`.
4. Choose guest login, create a local handle, or sign in to a local profile.
5. Press `1` to enter the main menu.
6. Try `13` or type `TODAY` for the current briefing.

Audio begins only after an explicit user interaction. Use the bezel sound button or the `M` command to mute audio.

## Main menu

| Key | Door |
|---|---|
| `1` / `N` | News & Live Feeds |
| `2` / `B` | Bulletin Board and Forum |
| `3` / `E` | Netmail / Private Mail |
| `4` / `F` | File Areas and Search |
| `5` / `P` | Photo Grabber and ANSI conversion |
| `6` / `G` | GitHub Vault |
| `7` / `D` | Door Games |
| `8` / `A` | ANSI Gallery and Editor |
| `9` / `H` | World Clocks |
| `10` / `W` | Weather Telemetry |
| `11` / `C` | Live SysOp Chat |
| `12` / `O` | One-Liners Wall |
| `13` / `T` | Today Hub briefing |
| `14` | Multi-Node Hopper |
| `15` / `J` | Weekly BBS Newspaper |
| `16` / `U` | User Statistics and Last Callers |
| `17` / `S` | Settings and Atmosphere |
| `0` / `X` / `Q` | Logoff and Disconnect |

## Terminal controls

- `Enter` or `Space`: activate the selected item.
- Arrow keys and `Tab`: move through clickable terminal regions.
- `Esc`: cancel a prompt or return to the previous screen.
- `F11` or `Alt+Enter`: toggle fullscreen.
- Mouse click: activate highlighted terminal rows.
- Mouse wheel: page through supported text and news views.
- `Ctrl+L`: redraw the current screen.
- `Alt+N`: hop to the next fictional node.
- `PURE`: toggle a clean text-only presentation.
- `NIGHT`: toggle after-hours SysOp atmosphere.
- `HELP`: display the complete command reference.

## Live data integrations

### News

The News door reads current RSS/Atom feeds from:

- Hacker News
- BBC World
- Slashdot
- NASA News
- Ars Technica

The networking layer tries direct access first and then configured proxy fallbacks where necessary. Headlines are normalized to plain text, cached, and displayed with source, date, summary, and an external article link. If the network is unavailable, the application serves a clearly labeled historical archive digest.

### Weather

The Weather door and Today Hub request current observations for a city:

1. `wttr.in` for terminal-style weather output.
2. Open-Meteo geocoding and forecast APIs for structured current data.
3. A bundled local sensor message when both live sources fail.

The UI explicitly distinguishes `LIVE`, `CACHED`, and `OFFLINE` data.

### GitHub

The GitHub Vault uses the public GitHub REST API for repository search, README reading, directory browsing, and official archive links. Offline seed repositories keep the door usable when the API is unavailable. Requests are limited and cached to reduce rate-limit pressure.

### Images

Photo Grabber uses Wikimedia Commons search metadata and converts selected images into 16-color ANSI half-block art. Original image links, dimensions, and license information are retained. Google Images is only opened as an external search; the application does not scrape Google result pages.

## Local persistence

The application is local-first:

- `localStorage` stores preferences, profiles, forums, netmail, ranks, settings, and game saves.
- IndexedDB stores uploaded file contents and local binary data.
- Browser data is not synchronized with other users.
- Local netmail and forum posts are not delivered to a public server.
- Export and restore options are available from Settings.

Passwords are hashed with the browser Web Crypto API. This is suitable for local demo profiles, not for production authentication or shared accounts.

## File downloads and uploads

The file system imitates classic `FILES.BBS` areas while using normal browser downloads. The ZMODEM display is theatrical; it does not create a real serial modem transfer.

Local uploads are stored only in the current browser under the local upload area. Files are never executed or installed by CYBER BBS. Users should inspect executable downloads before opening them.

## Screenshots

The repository includes screenshots generated from the current `index.html`:

| Screen | Image |
|---|---|
| Dial screen | `docs/screenshots/01_dial_screen.png` |
| Modem handshake | `docs/screenshots/02_modem_handshake.png` |
| Login | `docs/screenshots/03_login_screen.png` |
| System bulletins | `docs/screenshots/04_bulletins.png` |
| Main menu | `docs/screenshots/05_main_menu.png` |
| World clocks | `docs/screenshots/06_world_clocks.png` |
| Netmail | `docs/screenshots/07_netmail.png` |
| Forum | `docs/screenshots/08_forum_board.png` |
| ANSI gallery | `docs/screenshots/09_ansi_gallery.png` |
| Today Hub | `docs/screenshots/10_today_hub.png` |

Regenerate them with:

```powershell
python tools\capture_screenshots.py
```

The script uses Chrome through Playwright and opens `index.html`, so the screenshots always represent the public entry point.

## Project structure

```text
cyber-bbs/
├── index.html                 # Canonical standalone application
├── cyber-bbs.html             # Synchronized standalone distribution copy
├── index-modular.html         # Earlier modular HTML template
├── README.md                  # This guide
├── LICENSE-THIRD-PARTY.md     # IBM VGA font attribution
├── plan.txt                   # Original implementation blueprint
├── assets/
│   ├── css/                   # CRT and terminal styling sources
│   ├── fonts/                 # Px437 IBM VGA font files
│   └── js/                    # Earlier modular application sources
├── docs/screenshots/          # Current UI captures
└── tools/
    ├── bundle.mjs             # Synchronizes index.html to cyber-bbs.html
    └── capture_screenshots.py # Playwright screenshot workflow
```

## Development workflow

The canonical product is the self-contained `index.html`. After changing it:

```powershell
node tools\bundle.mjs
node --check .\tools\bundle.mjs
python tools\capture_screenshots.py
git diff --check
```

To validate embedded browser JavaScript manually, extract the `<script>` body and run `node --check` against the extracted file, or load the page in Chrome DevTools and verify there are no uncaught exceptions.

## Design and technical notes

- Rendering target: 80 columns × 25 rows on a high-resolution canvas.
- Palette: IBM VGA 16-color palette.
- Font: Px437 IBM VGA fonts by VileR, distributed under CC BY-SA 4.0.
- Audio: Web Audio API synthesis only; no external modem recordings.
- Navigation: terminal hit regions plus keyboard and mouse controls.
- External data: fetched asynchronously and never required for boot.
- Failure behavior: every external door has a local or cached fallback.
- Privacy: no analytics, telemetry, or remote account system is included.

## Known limitations

- External RSS providers and APIs can change, rate-limit, or block browser requests.
- Some providers require a local HTTP server instead of `file://`.
- Browser downloads remain subject to provider CORS and `Content-Disposition` behavior.
- Local profiles are not secure shared authentication.
- The modem, ZMODEM transfer, SysOp replies, node activity, and bot responses are simulations.
- A backend would be required for real multi-user boards, real mail delivery, public uploads, and synchronized presence.

## Third-party attribution

The embedded Px437 IBM VGA 8×16 and 9×16 fonts are attributed to VileR and the Oldschool PC Font Pack. They are used under CC BY-SA 4.0. See `LICENSE-THIRD-PARTY.md` for the attribution notice.

## License

CYBER BBS application content is distributed according to the repository license and the third-party terms documented in `LICENSE-THIRD-PARTY.md`. External news, images, repositories, and downloads remain subject to their original providers' licenses and terms.
