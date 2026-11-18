/**
 * CYBER BBS — Expanded 7-Door Games Suite (Mega Edition v3.0)
 * 1. Cyber Lord RPG v2.0 (Zones, Tavern, Armory, Red Dragon Boss)
 * 2. Star Trade v2.0 (30-Sector Galaxy with Live ASCII Star Map & Pirates)
 * 3. Blackjack Casino (Real 52-Card Deck & ASCII Cards)
 * 4. Retro Hangman (Interactive A-Z Keyboard & CP437 Gallows)
 * 5. Zork Text Adventure: "The Basement Mainframe" (6 Rooms, Items & Puzzles)
 * 6. Trivia / Quiz Night (20 Questions + Top 10 Hall of Fame)
 * 7. SysOp Fortune Cookie (4 Categories)
 */
(function() {
  window.CyberBBS = window.CyberBBS || {};

  class BBSGames {
    constructor() {
      this.customKeyHandler = null;
      this.hangmanState = null;
      this.blackjackState = null;
      this.triviaState = null;
      this.fortuneCat = 'ALL';
    }

    clearKeyHandler() { this.customKeyHandler = null; }

    playCyberLord(subView = 'TOWN') {
      this.clearKeyHandler();
      window.CyberBBS.App.pushScreen(`GAME_LORD_${subView}`, () => {
        const doors = window.CyberBBS.Doors, term = window.CyberBBS.Term, store = window.CyberBBS.Store;
        let save = store.getGameSave('cyberlord') || { hp: 35, maxHp: 35, gold: 80, xp: 0, level: 1, weapon: 'Bronze Dagger', atk: 6, armor: 'Cloth Tunic', def: 2, kills: 0, dragonSlain: false };

        const checkLevelUp = () => {
          if (save.xp >= save.level * 100) {
            save.level++; save.maxHp += 15; save.hp = save.maxHp; save.atk += 3; save.def += 2;
            if (window.CyberBBS.Audio) window.CyberBBS.Audio.playFanfare();
            term.showNotice(`*** LEVEL UP! YOU ARE NOW LEVEL ${save.level}! ***`);
          }
        };

        if (subView === 'ARMORY') {
          doors.renderHeader('CYBER LORD // KING\'S ARMORY & CYBERFORGE');
          term.println(`  GOLD: ${save.gold} GP   WEAPON: ${save.weapon} (ATK ${save.atk})   ARMOR: ${save.armor} (DEF ${save.def})`, 14, 0);
          term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
          const gear = [
            { num: '1', type: 'W', name: 'Steel Broadsword', stat: 12, cost: 90 },
            { num: '2', type: 'W', name: 'Laser Katana', stat: 22, cost: 240 },
            { num: '3', type: 'W', name: 'Plasma Claymore', stat: 36, cost: 520 },
            { num: '4', type: 'A', name: 'Kevlar Chainmail', stat: 8, cost: 85 },
            { num: '5', type: 'A', name: 'Titanium Exo-Plate', stat: 18, cost: 230 },
            { num: '6', type: 'A', name: 'Aegis Nano-Shield', stat: 30, cost: 490 }
          ];
          gear.forEach((g, idx) => {
            const row = 5 + idx * 2;
            term.setCursor(2, row);
            term.print(`[${g.num}] `, 14, 0);
            term.print(`${g.name.padEnd(24, ' ')} `, 15, 0);
            term.print(`${(g.type === 'W' ? 'ATK +' : 'DEF +') + g.stat}`.padEnd(12, ' '), 10, 0);
            term.print(`${g.cost} GP`, 14, 0);
            term.addHitRegion(2, row, 74, 1, `gear-${g.num}`, () => {
              if (save.gold < g.cost) { term.showNotice('NOT ENOUGH GOLD!'); return; }
              save.gold -= g.cost;
              if (g.type === 'W') { save.weapon = g.name; save.atk = g.stat; } else { save.armor = g.name; save.def = g.stat; }
              store.saveGame('cyberlord', save);
              if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
              term.showNotice(`EQUIPPED ${g.name.toUpperCase()}!`);
              this.playCyberLord('ARMORY');
            }, g.name, g.num);
          });
          doors.renderFooter([{ key: 'T', label: 'Back to Town', action: () => this.playCyberLord('TOWN') }]);
          return;
        }

        if (subView === 'TAVERN') {
          doors.renderHeader('CYBER LORD // YE OLDE MODEM TAVERN');
          term.println(`  HP: ${save.hp}/${save.maxHp}   GOLD: ${save.gold} GP   LEVEL: ${save.level}`, 14, 0);
          term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
          term.println(`  Smoke hangs low over oak tables. Rogue hackers & knights trade whispers.`, 7, 0);
          term.println(`\r\n  [1] Buy Cyber-Ale (10 GP) — Restores +12 HP & reveals a SysOp rumor`, 15, 0);
          term.println(`  [2] Challenge Tavern Brawler — Win gold & XP in a fistfight`, 15, 0);
          term.println(`  [3] Return to Town Square`, 15, 0);
          doors.renderFooter([
            { key: '1', label: 'Buy Ale (10 GP)', action: () => {
              if (save.gold < 10) { term.showNotice('NOT ENOUGH GOLD!'); return; }
              save.gold -= 10; save.hp = Math.min(save.maxHp, save.hp + 12); store.saveGame('cyberlord', save);
              term.showNotice('RUMOR: Equip Laser Katana before challenging the Red Dragon!', 4000);
              this.playCyberLord('TAVERN');
            }},
            { key: '2', label: 'Tavern Brawl', action: () => {
              const dmg = Math.max(1, Math.floor(Math.random() * 8) - Math.floor(save.def / 3));
              save.hp = Math.max(1, save.hp - dmg);
              const wonGold = 18 + save.level * 5;
              save.gold += wonGold; save.xp += 25; checkLevelUp(); store.saveGame('cyberlord', save);
              term.showNotice(`WON BRAWL! +${wonGold} GP, +25 XP (Took ${dmg} dmg)`);
              this.playCyberLord('TAVERN');
            }},
            { key: '3', label: 'Town Square', action: () => this.playCyberLord('TOWN') }
          ]);
          return;
        }

        doors.renderHeader(`CYBER LORD RPG v2.0 // ${save.dragonSlain ? 'DRAGON SLAYER' : 'TOWN SQUARE'}`);
        term.println(`  HERO: Level ${save.level} (XP: ${save.xp}/${save.level * 100})   HP: ${save.hp}/${save.maxHp}   GOLD: ${save.gold} GP`, 14, 0);
        term.println(`  GEAR: ${save.weapon} (ATK ${save.atk})  |  ${save.armor} (DEF ${save.def})  |  KILLS: ${save.kills}`, 10, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  [1] Hunt in Whispering Forest (Lvl 1-2)   [4] Visit King's Armory`, 15, 0);
        term.println(`  [2] Raid Cyber Citadel (Lvl 3+)           [5] Ye Olde Modem Tavern`, 15, 0);
        term.println(`  [3] Healer's Hut (Full Heal: 20 GP)       [6] SLAY THE RED DRAGON (BOSS)`, 12, 0);

        const hunt = (zoneName, mult) => {
          const monsters = [
            { name: 'Packet Goblin', gold: 20 * mult, xp: 30 * mult, power: 6 * mult },
            { name: 'Trojan Basilisk', gold: 38 * mult, xp: 45 * mult, power: 9 * mult },
            { name: 'Daemon Knight', gold: 55 * mult, xp: 65 * mult, power: 12 * mult }
          ];
          const m = monsters[Math.floor(Math.random() * monsters.length)];
          const dmg = Math.max(1, Math.floor(Math.random() * m.power) - Math.floor(save.def / 2));
          if (save.hp <= dmg) {
            save.hp = Math.floor(save.maxHp / 2); save.gold = Math.max(0, save.gold - 15); store.saveGame('cyberlord', save);
            term.showNotice(`DEFEATED BY ${m.name.toUpperCase()} IN ${zoneName}! Woke at Healer (-15 GP).`);
          } else {
            save.hp -= dmg; save.gold += m.gold; save.xp += m.xp; save.kills++; checkLevelUp(); store.saveGame('cyberlord', save);
            if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
            term.showNotice(`SLEW ${m.name.toUpperCase()}! +${m.gold} GP, +${m.xp} XP (Took ${dmg} dmg)`);
          }
          this.playCyberLord('TOWN');
        };

        doors.renderFooter([
          { key: '1', label: 'Forest', action: () => hunt('FOREST', 1) },
          { key: '2', label: 'Citadel', action: () => hunt('CITADEL', 2) },
          { key: '3', label: 'Healer (20G)', action: () => {
            if (save.gold >= 20) { save.gold -= 20; save.hp = save.maxHp; store.saveGame('cyberlord', save); term.showNotice('HP RESTORED TO 100%!'); }
            else term.showNotice('NEED 20 GP FOR HEALER!');
            this.playCyberLord('TOWN');
          }},
          { key: '4', label: 'Armory', action: () => this.playCyberLord('ARMORY') },
          { key: '5', label: 'Tavern', action: () => this.playCyberLord('TAVERN') },
          { key: '6', label: 'Red Dragon', action: () => {
            if (save.atk < 18) { term.showNotice('EQUIP LASER KATANA OR BETTER FIRST!'); return; }
            const dmg = Math.max(5, 35 - save.def);
            if (save.hp <= dmg) { save.hp = 10; store.saveGame('cyberlord', save); term.showNotice('RED DRAGON SCORCHED YOU! HEAL FIRST!'); }
            else {
              save.hp -= dmg; save.gold += 500; save.xp += 300; save.dragonSlain = true; checkLevelUp(); store.saveGame('cyberlord', save);
              store.rewardCredits(100);
              if (window.CyberBBS.Audio) window.CyberBBS.Audio.playFanfare();
              term.showNotice('*** YOU SLEW THE RED DRAGON! +500 GP & +100 BBS CREDITS! ***', 5000);
            }
            this.playCyberLord('TOWN');
          }}
        ]);
      });
    }

    playStarTrade() {
      this.clearKeyHandler();
      window.CyberBBS.App.pushScreen('GAME_STAR_TRADE', () => {
        const doors = window.CyberBBS.Doors, term = window.CyberBBS.Term, store = window.CyberBBS.Store;
        let save = store.getGameSave('startrade') || { sector: 1, credits: 1200, maxCargo: 25, cargo: { ore: 0, organics: 0, equipment: 0 }, ship: 'Scout Merchant Mk.I' };
        const usedCargo = save.cargo.ore + save.cargo.organics + save.cargo.equipment;
        const orePrice = 32 + ((save.sector * 7) % 24), orgPrice = 55 + ((save.sector * 11) % 35), eqpPrice = 95 + ((save.sector * 13) % 50);
        const prevSec = save.sector === 1 ? 30 : save.sector - 1, nextSec = (save.sector % 30) + 1, wormSec = ((save.sector + 6) % 30) + 1;
        const portClass = ['Class I (Ore Hub)', 'Class II (Agri)', 'Class III (Tech)', 'Class IV (Stardock)', 'Class V (Freeport)'][save.sector % 5];

        doors.renderHeader(`STAR TRADE v2.0 // SECTOR ${String(save.sector).padStart(2, '0')} (${portClass})`);
        term.println(`  SHIP: ${save.ship}  ·  CREDITS: ${save.credits} CR  ·  HOLD: ${usedCargo}/${save.maxCargo}t`, 14, 0);
        term.println(`  CARGO: Ore: ${save.cargo.ore}t  ·  Organics: ${save.cargo.organics}t  ·  Equipment: ${save.cargo.equipment}t`, 10, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  ASCII SECTOR RADAR:   [SEC-${String(prevSec).padStart(2, '0')}] ═════► [★ SEC-${String(save.sector).padStart(2, '0')} ★] ═════► [SEC-${String(nextSec).padStart(2, '0')}]`, 11, 0);
        term.println(`                                              ║`, 11, 0);
        term.println(`                                      WORMHOLE ╚══► [SEC-${String(wormSec).padStart(2, '0')}]`, 13, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`  PORT EXCHANGE:  Ore: ${orePrice} CR/t   |   Organics: ${orgPrice} CR/t   |   Equip: ${eqpPrice} CR/t`, 15, 0);

        const buy = (type, price) => {
          if (usedCargo >= save.maxCargo) { term.showNotice('CARGO HOLD FULL!'); return; }
          if (save.credits < price) { term.showNotice('INSUFFICIENT CREDITS!'); return; }
          save.credits -= price; save.cargo[type]++; store.saveGame('startrade', save);
          term.showNotice(`BOUGHT 1t ${type.toUpperCase()} FOR ${price} CR!`);
          this.playStarTrade();
        };
        const warp = (dest) => {
          save.sector = dest;
          if (Math.random() < 0.18) { const toll = Math.min(save.credits, 35); save.credits -= toll; term.showNotice(`PIRATE AMBUSH IN SECTOR ${dest}! LOST ${toll} CR!`); }
          else term.showNotice(`WARPED TO SECTOR #${String(dest).padStart(2, '0')}`);
          store.saveGame('startrade', save);
          this.playStarTrade();
        };

        doors.renderFooter([
          { key: '1', label: `Ore (${orePrice})`, action: () => buy('ore', orePrice) },
          { key: '2', label: `Org (${orgPrice})`, action: () => buy('organics', orgPrice) },
          { key: '3', label: `Eqp (${eqpPrice})`, action: () => buy('equipment', eqpPrice) },
          { key: '4', label: 'Sell All', action: () => {
            const total = save.cargo.ore * orePrice + save.cargo.organics * orgPrice + save.cargo.equipment * eqpPrice;
            if (!total) { term.showNotice('CARGO HOLD EMPTY!'); return; }
            save.credits += total; save.cargo = { ore: 0, organics: 0, equipment: 0 }; store.saveGame('startrade', save);
            if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
            term.showNotice(`SOLD ALL CARGO FOR +${total} CR!`);
            this.playStarTrade();
          }},
          { key: '5', label: `Warp S-${nextSec}`, action: () => warp(nextSec) },
          { key: '6', label: `Worm S-${wormSec}`, action: () => warp(wormSec) }
        ]);
      });
    }

    playBlackjack() {
      this.clearKeyHandler();
      window.CyberBBS.App.pushScreen('GAME_BLACKJACK', () => {
        const doors = window.CyberBBS.Doors, term = window.CyberBBS.Term, store = window.CyberBBS.Store;
        const buildDeck = () => {
          const deck = [];
          for (const s of ['♠', '♥', '♦', '♣']) for (const r of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) deck.push({ r, s });
          for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
          return deck;
        };
        const scoreHand = (hand) => {
          let total = 0, aces = 0;
          for (const c of hand) { if (c.r === 'A') { total += 11; aces++; } else if (['K', 'Q', 'J'].includes(c.r)) total += 10; else total += parseInt(c.r, 10); }
          while (total > 21 && aces > 0) { total -= 10; aces--; }
          return total;
        };
        const renderCards = (hand, hideSecond = false) => {
          let top = '  ', mid = '  ', bot = '  ';
          hand.forEach((c, idx) => {
            if (hideSecond && idx === 1) { top += '┌───┐ '; mid += '│░░░│ '; bot += '└───┘ '; }
            else { top += '┌───┐ '; mid += `│${(c.r + c.s).padEnd(3, ' ')}│ `; bot += '└───┘ '; }
          });
          term.println(top, 15, 0); term.println(mid, 14, 0); term.println(bot, 15, 0);
        };

        if (!this.blackjackState) this.blackjackState = { active: false, deck: [], player: [], dealer: [], bet: 25, status: 'Place your 25 CR wager to deal!' };
        const st = this.blackjackState;
        doors.renderHeader('BLACKJACK CASINO // HIGH-STAKES VGA TABLE');
        term.println(`  YOUR BBS CREDITS: ${store.currentUser?.credits || 500} CR   |   CURRENT BET: ${st.bet} CR`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        if (st.player.length > 0) {
          term.println(`  DEALER HAND (${st.active ? '?' : scoreHand(st.dealer)}):`, 11, 0);
          renderCards(st.dealer, st.active);
          term.println(`  YOUR HAND (${scoreHand(st.player)}):`, 10, 0);
          renderCards(st.player, false);
        }
        term.println(`\r\n  STATUS: ${st.status}`, 15, 0);

        const finishRound = () => {
          st.active = false;
          while (scoreHand(st.dealer) < 17) st.dealer.push(st.deck.pop());
          const pScore = scoreHand(st.player), dScore = scoreHand(st.dealer);
          if (pScore > 21) st.status = `BUST (${pScore})! Dealer wins ${st.bet} CR.`;
          else if (dScore > 21 || pScore > dScore) {
            const win = st.bet * 2; store.rewardCredits(win);
            if (window.CyberBBS.Audio) window.CyberBBS.Audio.playFanfare();
            st.status = `YOU WIN (${pScore} vs ${dScore})! Paid +${win} CR!`;
          } else if (pScore === dScore) { store.rewardCredits(st.bet); st.status = `PUSH (${pScore})! Wager returned.`; }
          else st.status = `DEALER WINS (${dScore} vs ${pScore}).`;
          this.playBlackjack();
        };

        if (!st.active) {
          doors.renderFooter([
            { key: '1', label: 'Deal Hand (25 CR)', action: () => {
              if (!store.chargeCredits(25)) { term.showNotice('INSUFFICIENT CREDITS!'); return; }
              st.bet = 25; st.deck = buildDeck(); st.player = [st.deck.pop(), st.deck.pop()]; st.dealer = [st.deck.pop(), st.deck.pop()]; st.active = true; st.status = 'Hit [H] or Stand [S]?';
              if (scoreHand(st.player) === 21) { store.rewardCredits(62); st.active = false; st.status = 'NATURAL BLACKJACK! Paid +62 CR!'; if (window.CyberBBS.Audio) window.CyberBBS.Audio.playFanfare(); }
              this.playBlackjack();
            }},
            { key: '2', label: 'Back to Games', action: () => { this.blackjackState = null; window.CyberBBS.App.goBack(); } }
          ]);
        } else {
          doors.renderFooter([
            { key: 'H', label: 'Hit Card', action: () => { st.player.push(st.deck.pop()); if (scoreHand(st.player) >= 21) finishRound(); else this.playBlackjack(); } },
            { key: 'S', label: 'Stand', action: finishRound }
          ]);
        }
      });
    }

    playHangman() {
      window.CyberBBS.App.pushScreen('GAME_HANGMAN', () => {
        const doors = window.CyberBBS.Doors, term = window.CyberBBS.Term, store = window.CyberBBS.Store;
        const dictionary = [
          { word: 'USROBOTICS', hint: 'Legendary 14.4k / 28.8k Courier modem manufacturer' },
          { word: 'FIDONET', hint: 'Store-and-forward global BBS echomail network' },
          { word: 'ZMODEM', hint: 'Streaming file transfer protocol with CRC-32 resume' },
          { word: 'DEMOSCENE', hint: 'Underground realtime graphics & tracker music subculture' },
          { word: 'SHAREWARE', hint: 'Try-before-you-buy 1990s software distribution model' },
          { word: 'PHREAKING', hint: 'Exploration of telephone switching networks & blue boxes' },
          { word: 'SOUND BLASTER', hint: 'Creative Labs ISA audio card standard for MS-DOS' },
          { word: 'AUTOEXEC', hint: 'DOS startup batch script paired with CONFIG.SYS' }
        ];
        if (!this.hangmanState) {
          const pick = dictionary[Math.floor(Math.random() * dictionary.length)];
          this.hangmanState = { word: pick.word, hint: pick.hint, guessed: new Set([' ']), wrong: [], maxWrong: 6, done: false };
        }
        const st = this.hangmanState;
        const masked = st.word.split('').map(ch => (st.guessed.has(ch) ? ch : '_')).join(' ');
        const won = !masked.includes('_'), lost = st.wrong.length >= st.maxWrong;
        if ((won || lost) && !st.done) {
          st.done = true;
          if (won) { store.rewardCredits(30); if (window.CyberBBS.Audio) window.CyberBBS.Audio.playFanfare(); }
        }
        doors.renderHeader('RETRO HANGMAN // TYPE A-Z TO GUESS');
        const wCount = st.wrong.length;
        ['    ╔═══╗', `    ║   ${wCount >= 1 ? 'O' : ' '}`, `    ║  ${wCount >= 3 ? '/' : ' '}${wCount >= 2 ? '│' : ' '}${wCount >= 4 ? '\\' : ' '}`, `    ║  ${wCount >= 5 ? '/' : ' '} ${wCount >= 6 ? '\\' : ' '}`, '  ══╩══════'].forEach((line, idx) => {
          term.setCursor(4, 5 + idx); term.print(line, 11, 0);
        });
        term.setCursor(24, 5); term.print(`WORD : ${masked}`, 15, 0);
        term.setCursor(24, 7); term.print(`HINT : ${st.hint}`, 14, 0);
        term.setCursor(24, 9); term.print(`WRONG (${wCount}/${st.maxWrong}): ${st.wrong.join(' ') || 'None'}`, 12, 0);
        term.setCursor(4, 13);
        if (won) term.print(`*** VICTORY! YOU SOLVED "${st.word}" (+30 BBS CREDITS)! ***`, 10, 0);
        else if (lost) term.print(`*** OUT OF TRIES! THE WORD WAS: ${st.word} ***`, 12, 0);
        else term.print(`Press any letter key [A-Z] on your keyboard to guess!`, 10, 0);

        this.customKeyHandler = (e) => {
          if (st.done) return false;
          const k = e.key.toUpperCase();
          if (/^[A-Z]$/.test(k) && !e.ctrlKey && !e.altKey) {
            if (!st.guessed.has(k)) { st.guessed.add(k); if (!st.word.includes(k)) st.wrong.push(k); this.playHangman(); }
            return true;
          }
          return false;
        };

        doors.renderFooter([
          { key: '1', label: 'New Word', action: () => { this.hangmanState = null; this.playHangman(); } },
          { key: '2', label: 'Back to Games', action: () => { this.hangmanState = null; this.clearKeyHandler(); window.CyberBBS.App.goBack(); } }
        ]);
      });
    }

    playZork() {
      this.clearKeyHandler();
      window.CyberBBS.App.pushScreen('GAME_ZORK', () => {
        const doors = window.CyberBBS.Doors, term = window.CyberBBS.Term, store = window.CyberBBS.Store;
        const rooms = {
          airlock: { name: 'BASEMENT ENTRY AIRLOCK', desc: 'Concrete walls hum with 60Hz transformer vibration. Heavy steel racks stand to the EAST; a dim corridor leads SOUTH.', exits: { EAST: 'modem_rack', SOUTH: 'tape_vault' }, item: 'KEYCARD' },
          modem_rack: { name: 'USROBOTICS MODEM RACK ROOM', desc: 'Sixteen Courier 14.4k modems blink synchronously. A serial console sits on a metal desk. Exits: WEST, SOUTH.', exits: { WEST: 'airlock', SOUTH: 'vax_core' }, item: 'BOOT_DISK' },
          tape_vault: { name: '9-TRACK MAGNETIC TAPE ARCHIVE', desc: 'Rows of reel-to-reel backup tapes from 1989-1995 line the shelves. Exits: NORTH, EAST.', exits: { NORTH: 'airlock', EAST: 'vax_core' }, item: 'RS232_CABLE' },
          vax_core: { name: 'DEC VAX-11/780 MAINFRAME CORE', desc: 'The legendary VAX mainframe awaits! Console reads: "INSERT BOOT_DISK & KEYCARD TO UNLOCK ROOT". Exits: NORTH, WEST.', exits: { NORTH: 'modem_rack', WEST: 'tape_vault' }, item: null }
        };
        let zState = store.getGameSave('zork') || { room: 'airlock', inv: [], solved: false, log: 'You descend the creaky stairs into Dr. Noise\'s secret underground bunker.' };
        const curRoom = rooms[zState.room] || rooms.airlock;
        doors.renderHeader(`ZORK ADVENTURE // ${curRoom.name}`);
        term.println(`  LOCATION : ${curRoom.name}`, 14, 0);
        term.println(`  INVENTORY: ${zState.inv.length > 0 ? zState.inv.join(', ') : '(Empty)'}`, 10, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        doors.wrapTextToLines(curRoom.desc, 74).forEach(l => term.println(`  ${l}`, 15, 0));
        if (curRoom.item && !zState.inv.includes(curRoom.item)) term.println(`\r\n  VISIBLE ITEM HERE: [${curRoom.item}]`, 11, 0);
        term.println(`\r\n  EXITS: ${Object.keys(curRoom.exits).join(', ')}`, 14, 0);
        term.println(`  LAST ACTION: ${zState.log}`, 7, 0);

        const move = (dir) => {
          if (curRoom.exits[dir]) { zState.room = curRoom.exits[dir]; zState.log = `Moved ${dir} into ${rooms[zState.room].name}.`; store.saveGame('zork', zState); this.playZork(); }
          else term.showNotice(`NO EXIT TO THE ${dir}!`);
        };

        doors.renderFooter([
          { key: '1', label: 'North', action: () => move('NORTH') },
          { key: '2', label: 'South', action: () => move('SOUTH') },
          { key: '3', label: 'East', action: () => move('EAST') },
          { key: '4', label: 'West', action: () => move('WEST') },
          { key: '5', label: 'Take Item', action: () => {
            if (curRoom.item && !zState.inv.includes(curRoom.item)) { zState.inv.push(curRoom.item); zState.log = `Picked up ${curRoom.item}!`; store.saveGame('zork', zState); if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell(); this.playZork(); }
            else term.showNotice('NOTHING TO TAKE HERE!');
          }},
          { key: '6', label: 'Boot VAX', action: () => {
            if (zState.room !== 'vax_core') { term.showNotice('GO TO THE VAX MAINFRAME CORE FIRST!'); return; }
            if (zState.inv.includes('BOOT_DISK') && zState.inv.includes('KEYCARD')) {
              if (!zState.solved) { zState.solved = true; store.rewardCredits(150); if (window.CyberBBS.Audio) window.CyberBBS.Audio.playFanfare(); }
              zState.log = 'ROOT UNLOCKED! VAX-11/780 ONLINE! (+150 BBS CREDITS AWARDED!)'; store.saveGame('zork', zState); this.playZork();
            } else term.showNotice('YOU NEED BOTH BOOT_DISK AND KEYCARD!');
          }}
        ]);
      });
    }

    playTrivia() {
      this.clearKeyHandler();
      window.CyberBBS.App.pushScreen('GAME_TRIVIA', () => {
        const doors = window.CyberBBS.Doors, term = window.CyberBBS.Term, store = window.CyberBBS.Store;
        const bank = [
          { q: 'Which Hayes AT command hangs up the modem immediately?', opts: ['ATZ', 'ATH0', 'ATDT', 'ATE1'], ans: 1 },
          { q: 'What baud rate did the USRobotics Courier HST Dual Standard pioneer?', opts: ['2400 bps', '9600 bps', '14,400 bps', '56,000 bps'], ans: 2 },
          { q: 'What is the 128-byte metadata trailer appended to ANSI art files?', opts: ['ID3v1', 'SAUCE00', 'EXIF', 'RIFF'], ans: 1 },
          { q: 'Which protocol introduced crash-recovery resume and 32-bit CRC?', opts: ['XMODEM', 'YMODEM', 'ZMODEM', 'Kermit'], ans: 2 },
          { q: 'Who created the global store-and-forward FidoNet network in 1984?', opts: ['Tom Jennings', 'Ward Christensen', 'Phil Katz', 'John Carmack'], ans: 0 },
          { q: 'Which DOS utility created .ZIP archives with PKZ204G.EXE?', opts: ['ARJ', 'LHA', 'PKZIP', 'RAR'], ans: 2 },
          { q: 'Which demogroup won Assembly 93 with "Second Reality"?', opts: ['Triton', 'Future Crew', 'ACiD', 'Razor 1911'], ans: 1 },
          { q: 'What character encoding provides IBM VGA box-drawing glyphs?', opts: ['UTF-8', 'ISO-8859-1', 'CP437', 'EBCDIC'], ans: 2 },
          { q: 'Which sound card featured hardware wavetable synthesis via GF1 chip?', opts: ['AdLib', 'Gravis Ultrasound', 'PC Speaker', 'Covox'], ans: 1 },
          { q: 'What was the name of the very first dial-up BBS created in 1978?', opts: ['CBBS', 'The WELL', 'EchoNet', 'Cyber BBS'], ans: 0 }
        ];
        if (!this.triviaState) {
          this.triviaState = { questions: [...bank].sort(() => Math.random() - 0.5).slice(0, 5), idx: 0, score: 0, streak: 0, done: false };
        }
        const st = this.triviaState;
        doors.renderHeader('TRIVIA NIGHT // 1990s BBS & COMPUTING QUIZ');
        if (st.done) {
          term.println(`\r\n  ROUND COMPLETE! FINAL SCORE: ${st.score} PTS`, 14, 0);
          term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
          term.println(`  TOP 10 TRIVIA HALL OF FAME:`, 11, 0);
          store.getTriviaLeaderboard().slice(0, 7).forEach((entry, i) => {
            term.println(`  #${i + 1}  ${entry.handle.padEnd(18, ' ')}  ${String(entry.score).padStart(5, ' ')} PTS   (${entry.date})`, i === 0 ? 14 : 15, 0);
          });
          doors.renderFooter([
            { key: '1', label: 'Play Again', action: () => { this.triviaState = null; this.playTrivia(); } },
            { key: '2', label: 'Back to Games', action: () => { this.triviaState = null; window.CyberBBS.App.goBack(); } }
          ]);
          return;
        }
        const cur = st.questions[st.idx];
        term.println(`  QUESTION ${st.idx + 1} OF ${st.questions.length}   |   SCORE: ${st.score} PTS   |   STREAK: ${st.streak}x`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`\r\n  ${cur.q}\r\n`, 15, 0);
        cur.opts.forEach((opt, i) => {
          const row = 9 + i * 2;
          term.setCursor(4, row); term.print(`[${i + 1}] `, 14, 0); term.print(opt, 15, 0);
          term.addHitRegion(4, row, 68, 1, `triv-${i + 1}`, () => {
            if (i === cur.ans) {
              st.streak++; const pts = 15 + (st.streak - 1) * 5; st.score += pts; store.rewardCredits(15);
              if (window.CyberBBS.Audio) window.CyberBBS.Audio.playBell();
              term.showNotice(`CORRECT! +${pts} PTS & +15 BBS CREDITS!`);
            } else { st.streak = 0; term.showNotice(`WRONG! Correct: ${cur.opts[cur.ans]}`); }
            st.idx++;
            if (st.idx >= st.questions.length) { st.done = true; store.recordTriviaScore(store.currentUser ? store.currentUser.handle : 'GUEST', st.score); }
            this.playTrivia();
          }, opt, String(i + 1));
        });
        doors.renderFooter([{ key: 'Q', label: 'Quit Quiz', action: () => { this.triviaState = null; window.CyberBBS.App.goBack(); } }]);
      });
    }

    playFortune() {
      this.clearKeyHandler();
      window.CyberBBS.App.pushScreen('GAME_FORTUNE', () => {
        const doors = window.CyberBBS.Doors, term = window.CyberBBS.Term;
        const quotes = [
          { cat: 'SYSOP', text: '"640K ought to be enough for anybody." — Attributed, 1981' },
          { cat: 'SYSOP', text: '"Keep your upload/download ratio above 1:3 and the SysOp will never drop your carrier."' },
          { cat: 'DEMOSCENE', text: '"Real coders do not need hardware acceleration — they race the VGA raster beam."' },
          { cat: 'DEMOSCENE', text: '"4 channels of Amiga MOD music can carry more soul than a 64-piece orchestra."' },
          { cat: 'HACKER', text: '"Never trust a computer you can\'t throw out a window." — Steve Wozniak' },
          { cat: 'HACKER', text: '"The Net is a waste of time, and that\'s exactly what\'s right about it." — William Gibson' },
          { cat: '90S_ADS', text: '"NEW! USRobotics Courier 14.4k HST Dual Standard — Only $695! Call your local dealer!"' },
          { cat: '90S_ADS', text: '"UPGRADE TO 486DX2/66 MHz WITH 8MB RAM AND VESA LOCAL BUS SVGA GRAPHICS!"' }
        ];
        const filtered = this.fortuneCat === 'ALL' ? quotes : quotes.filter(q => q.cat === this.fortuneCat);
        const pick = filtered[Math.floor(Math.random() * filtered.length)];
        doors.renderHeader(`SYSOP FORTUNE COOKIE // CATEGORY: ${this.fortuneCat}`);
        term.println(`\r\n  [${pick.cat}] DISPATCH:`, 14, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        term.println(`\r\n  ${pick.text}\r\n`, 15, 0);
        term.println(`  ────────────────────────────────────────────────────────────────────────────`, 8, 0);
        doors.renderFooter([
          { key: '1', label: 'Next Quote', action: () => this.playFortune() },
          { key: '2', label: 'SysOp', action: () => { this.fortuneCat = 'SYSOP'; this.playFortune(); } },
          { key: '3', label: 'Demoscene', action: () => { this.fortuneCat = 'DEMOSCENE'; this.playFortune(); } },
          { key: '4', label: 'Hacker', action: () => { this.fortuneCat = 'HACKER'; this.playFortune(); } },
          { key: '5', label: '90s Ads', action: () => { this.fortuneCat = '90S_ADS'; this.playFortune(); } }
        ]);
      });
    }
  }

  window.CyberBBS.Games = new BBSGames();
})();
