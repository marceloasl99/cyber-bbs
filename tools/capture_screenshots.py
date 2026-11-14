import os
import time
from playwright.sync_api import sync_playwright

os.makedirs('docs/screenshots', exist_ok=True)
html_path = os.path.abspath('index.html')
file_url = f'file:///{html_path.replace(os.sep, "/")}'

print(f"Opening: {file_url}")

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        headless=True,
        args=['--no-sandbox', '--disable-gpu']
    )
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto(file_url, wait_until='networkidle')
    time.sleep(1)

    # 1. Boot / Dial screen
    page.screenshot(path='docs/screenshots/01_dial_screen.png')
    print("Captured 01_dial_screen.png")

    # Click dial or press '1' to start dialing
    page.keyboard.press('1')
    time.sleep(0.5)

    # 2. Handshake / Dialing
    page.screenshot(path='docs/screenshots/02_modem_handshake.png')
    print("Captured 02_modem_handshake.png")

    # Skip handshake (ESC) to get to Banner/Login
    page.keyboard.press('Escape')
    time.sleep(1)

    # 3. Banner / Login screen
    page.screenshot(path='docs/screenshots/03_login_screen.png')
    print("Captured 03_login_screen.png")

    # Press '1' for Guest Login
    page.keyboard.press('1')
    time.sleep(1)

    # 4. Bulletins screen
    page.screenshot(path='docs/screenshots/04_bulletins.png')
    print("Captured 04_bulletins.png")

    # Press '1' or Enter to go to Main Menu
    page.keyboard.press('1')
    time.sleep(1)

    # 5. Main Menu
    page.screenshot(path='docs/screenshots/05_main_menu.png')
    print("Captured 05_main_menu.png")

    # Open World Clocks (9)
    page.keyboard.press('9')
    time.sleep(1)
    page.screenshot(path='docs/screenshots/06_world_clocks.png')
    print("Captured 06_world_clocks.png")
    page.keyboard.press('Escape')
    time.sleep(0.5)

    # Open Netmail (3)
    page.keyboard.press('3')
    time.sleep(1)
    page.screenshot(path='docs/screenshots/07_netmail.png')
    print("Captured 07_netmail.png")
    page.keyboard.press('Escape')
    time.sleep(0.5)

    # Open Forum (2)
    page.keyboard.press('2')
    time.sleep(1)
    page.screenshot(path='docs/screenshots/08_forum_board.png')
    print("Captured 08_forum_board.png")
    page.keyboard.press('Escape')
    time.sleep(0.5)

    # Open ANSI Gallery (8)
    page.keyboard.press('8')
    time.sleep(1)
    page.screenshot(path='docs/screenshots/09_ansi_gallery.png')
    print("Captured 09_ansi_gallery.png")
    page.keyboard.press('Escape')
    time.sleep(0.5)

    # Open Today Hub (13)
    page.keyboard.press('1')
    page.keyboard.press('3')
    time.sleep(4)
    page.screenshot(path='docs/screenshots/10_today_hub.png')
    print("Captured 10_today_hub.png")

    browser.close()
    print("Finished taking screenshots successfully!")
