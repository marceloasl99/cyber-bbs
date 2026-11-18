import os
from playwright.sync_api import sync_playwright

html_path = os.path.abspath('index.html')
file_url = 'file:///' + html_path.replace('\\', '/')

print(f"Testing URL: {file_url}")

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        headless=True,
        args=['--no-sandbox', '--disable-gpu']
    )
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(e.message))
    page.goto(file_url)
    page.wait_for_timeout(1000)

    res = page.evaluate("""() => {
        const app = window.CyberBBS.App;
        const term = window.CyberBBS.Term;
        const net = window.CyberBBS.Net;
        const audio = window.CyberBBS.Audio;
        const store = window.CyberBBS.Store;
        const ansi = window.CyberBBS.Ansi;
        const doors = window.CyberBBS.Doors;

        return {
            profilesCount: Object.keys(window.CyberBBS.VIDEO_PROFILES || {}).length,
            currentProfile: term.currentProfile.id,
            hasRadio: !!window.CyberBBS.Radio,
            hasAnsiBuffer: typeof ansi.bufferToAnsi === 'function',
            hasNetDiag: typeof doors.openNetDiagnostics === 'function',
            hasMarket: typeof doors.openMarketWire === 'function',
            hasEarth: typeof doors.openEarthAndSky === 'function',
            hasPhone: typeof doors.openPhoneBook === 'function',
            moon: net.calculateMoonPhase(),
            spark: net.generateSparkline([1, 5, 10, 8, 3]),
            schemaVersion: 3
        };
    }""")
    print("Page Evaluation:", res)
    print("Page Errors:", errors)
    browser.close()
