// Chrome Dino Party — Smash-Style 4-Player Arcade Survival
// Authentic Chrome Dino pixel art | Smash Bros UI

const W = 800,
  H = 600,
  S = 3; // pixel scale
const STORE_KEY = "dino-party-v3";
const MAX_HS = 5;

// Player colors (Smash standard)
const PC = [0xff4444, 0x4488ff, 0xffcc00, 0x44dd44];
const PH = ["#FF4444", "#4488FF", "#FFCC00", "#44DD44"];
const PN = ["P1", "P2", "P3", "P4"];
const PC_DARK = [0x991111, 0x224488, 0x997700, 0x228822];

// Layout
const LT = 48,
  LH = 100,
  GO = 86,
  DX = 130;
const HT = LT + 4 * LH + 8;

// Physics
const STOCKS = 3,
  INVT = 2200;
const JV = -500,
  GR = 1200;
const BSP = 200,
  MSP = 460,
  SPI = 4,
  SPINT = 2000;
const EVINT = 18000,
  EVDUR = 8000;
const EVENTS = [
  "LOW GRAVITY",
  "SPEED UP",
  "NIGHT MODE",
  "METEOR RAIN",
  "WIND STORM",
];
const EV_COLS = [0x9944ff, 0xff4444, 0x2244aa, 0xff6600, 0x22aaaa];
const OBGAP = 260;

// ─── Chrome Dino Bitmap Data ───────────────────────────
// Body (12 wide × 10 tall), MSB = left
const DB = [
  0x0fc, 0x1ff, 0x17f, 0x1ff, 0x1f0, 0x7fe, 0xfff, 0xf7f, 0xfff, 0x7fe,
];
// Run legs frame 1 (left forward)
const DL1 = [0x330, 0x30c, 0x30c];
// Run legs frame 2 (right forward)
const DL2 = [0x330, 0x0cc, 0x0cc];
// Jump legs (tucked)
const DLJ = [0x330, 0x210];
// Cactus small (5w × 10h)
const CS = [0x04, 0x04, 0x15, 0x1f, 0x15, 0x04, 0x04, 0x04, 0x04, 0x04];
// Cactus large (6w × 14h)
const CL = [
  0x0c, 0x0c, 0x0d, 0x0f, 0x0d, 0x2c, 0x3c, 0x0c, 0x0c, 0x0c, 0x0c, 0x0c, 0x0c,
  0x0c,
];
// Double cactus (10w × 10h)
const CD = [
  0x084, 0x084, 0x2b5, 0x3bf, 0x2b5, 0x084, 0x084, 0x084, 0x084, 0x084,
];

// Cabinet keys — DO NOT modify existing entries
const CABINET_KEYS = {
  P1_U: ["w"],
  P1_D: ["s"],
  P1_L: ["a"],
  P1_R: ["d"],
  P1_1: ["u"],
  P1_2: ["i"],
  P1_3: ["o"],
  P1_4: ["j"],
  P1_5: ["k"],
  P1_6: ["l"],
  P2_U: ["ArrowUp"],
  P2_D: ["ArrowDown"],
  P2_L: ["ArrowLeft"],
  P2_R: ["ArrowRight"],
  P2_1: ["r"],
  P2_2: ["t"],
  P2_3: ["y"],
  P2_4: ["f"],
  P2_5: ["g"],
  P2_6: ["h"],
  START1: ["Enter"],
  START2: ["2"],
};

const KB = {};
for (const [c, ks] of Object.entries(CABINET_KEYS))
  for (const k of ks) KB[k.length === 1 ? k.toLowerCase() : k] = c;

const cfg = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: "game-root",
  backgroundColor: "#0a0a18",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: { preload, create, update },
};
new Phaser.Game(cfg);

function preload() {}

// ─── Bitmap Renderer ───────────────────────────────────
function bmp(g, data, w, x, y, s) {
  for (let r = 0; r < data.length; r++)
    for (let c = 0; c < w; c++)
      if (data[r] & (1 << (w - 1 - c))) g.fillRect(x + c * s, y + r * s, s, s);
}

// ─── CREATE ────────────────────────────────────────────
function create() {
  const sc = this;
  sc.st = {
    // phase: 'title', 'lobby', 'play', 'pause', 'victory', 'defeat'
    phase: "title",
    mode: 2,
    players: [],
    obs: [],
    spd: BSP,
    dist: 0,
    nextSpd: 0,
    nextEvt: EVINT,
    curEvt: null,
    evtEnd: 0,
    sudden: false,
    winner: -1,
    menu: { cur: 0, cd: 0, la: 0 },
    freeze: 0,
    spawnCd: [0, 0, 0, 0],
    meteors: [],
    musicOn: false,
    hiScores: [],
    lobby: { joined: [null, null, null, null], msg: "" },
  };
  for (let i = 0; i < 4; i++)
    sc.st.players.push({
      lane: i,
      x: DX,
      groundY: LT + i * LH + GO,
      y: LT + i * LH + GO,
      vy: 0,
      jumping: false,
      stocks: STOCKS,
      alive: true,
      invUntil: 0,
      frame: 0,
      animT: 0,
      isAI: false,
      aiNext: 0,
    });

  mkTex(sc);
  mkBG(sc);
  mkLanes(sc);
  mkDinos(sc);
  mkHUD(sc);
  mkTitle(sc);
  mkLobby(sc);
  mkPause(sc);
  mkVictory(sc);
  mkEvtBnr(sc);
  mkDefeat(sc);
  mkCtrl(sc);
  mkLB(sc);
  mkInput(sc);
  showTitle(sc);

  loadHS()
    .then((h) => {
      sc.st.hiScores = h;
      rfTitleHS(sc);
    })
    .catch(() => {});
}

// ─── TEXTURES ──────────────────────────────────────────
function mkTex(sc) {
  const g = sc.make.graphics({ add: false });

  // Dino run 1 (white, tinted per player)
  g.clear();
  g.fillStyle(0xffffff);
  bmp(g, DB.concat(DL1), 12, 0, 0, S);
  g.fillStyle(0x000000);
  g.fillRect(4 * S, 2 * S, S, S); // eye
  g.generateTexture("dr1", 12 * S, 13 * S);

  // Dino run 2
  g.clear();
  g.fillStyle(0xffffff);
  bmp(g, DB.concat(DL2), 12, 0, 0, S);
  g.fillStyle(0x000000);
  g.fillRect(4 * S, 2 * S, S, S);
  g.generateTexture("dr2", 12 * S, 13 * S);

  // Dino jump
  g.clear();
  g.fillStyle(0xffffff);
  bmp(g, DB.concat(DLJ), 12, 0, 0, S);
  g.fillStyle(0x000000);
  g.fillRect(4 * S, 2 * S, S, S);
  g.generateTexture("dj", 12 * S, 12 * S);

  // Cactus small
  g.clear();
  g.fillStyle(0x4a8c28);
  bmp(g, CS, 5, 0, 0, S);
  g.generateTexture("cs", 5 * S, 10 * S);

  // Cactus large
  g.clear();
  g.fillStyle(0x4a8c28);
  bmp(g, CL, 6, 0, 0, S);
  g.generateTexture("cl", 6 * S, 14 * S);

  // Double cactus
  g.clear();
  g.fillStyle(0x4a8c28);
  bmp(g, CD, 10, 0, 0, S);
  g.generateTexture("cd", 10 * S, 10 * S);

  // Ground tile
  g.clear();
  g.fillStyle(0x8b7355, 0.5);
  g.fillRect(0, 0, 160, 2);
  g.fillStyle(0x7a6548, 0.3);
  for (let i = 0; i < 8; i++)
    g.fillRect(
      i * 20 + Phaser.Math.Between(0, 6),
      3 + Phaser.Math.Between(0, 2),
      Phaser.Math.Between(4, 10),
      2,
    );
  g.generateTexture("gnd", 160, 8);

  // Stock icon (mini dino)
  g.clear();
  g.fillStyle(0xffffff);
  bmp(g, DB.slice(0, 6), 12, 0, 0, 1);
  g.fillStyle(0x000000);
  g.fillRect(4, 2, 1, 1);
  g.generateTexture("si", 12, 6);

  // Meteor
  g.clear();
  g.fillStyle(0xff5500);
  g.fillCircle(10, 10, 10);
  g.fillStyle(0xffaa33);
  g.fillCircle(10, 10, 5);
  g.fillStyle(0xffee88);
  g.fillCircle(10, 10, 2);
  g.generateTexture("mt", 20, 20);

  // Crown
  g.clear();
  g.fillStyle(0xffd700);
  g.fillRect(0, 12, 28, 12);
  g.fillRect(0, 4, 6, 10);
  g.fillRect(11, 0, 6, 14);
  g.fillRect(22, 4, 6, 10);
  g.fillStyle(0xff3333);
  g.fillRect(2, 14, 4, 4);
  g.fillRect(12, 14, 4, 4);
  g.fillRect(22, 14, 4, 4);
  g.generateTexture("crn", 28, 24);

  // Cloud
  g.clear();
  g.fillStyle(0xffffff, 0.08);
  g.fillEllipse(30, 15, 60, 22);
  g.fillEllipse(55, 12, 40, 18);
  g.fillEllipse(15, 18, 35, 16);
  g.generateTexture("cloud", 70, 30);

  g.destroy();
}

// ─── BACKGROUND (Sky, Mountains, Clouds) ───────────────
function mkBG(sc) {
  // Sky gradient
  const skyColors = [
    0x0a0a28, 0x0f1035, 0x141848, 0x1c2058, 0x283068, 0x384878, 0x506088,
    0x687898, 0x889098, 0xa09888,
  ];
  const sh = H / skyColors.length;
  for (let i = 0; i < skyColors.length; i++)
    sc.add
      .rectangle(W / 2, i * sh + sh / 2, W, sh + 2, skyColors[i])
      .setDepth(-10);

  // Far mountains
  const mg = sc.add.graphics().setDepth(-8);
  mg.fillStyle(0x1a1a45, 0.7);
  mg.beginPath();
  mg.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) {
    const h =
      180 +
      Math.sin(x * 0.008) * 130 +
      Math.sin(x * 0.019 + 1) * 70 +
      Math.sin(x * 0.034 + 3) * 30;
    mg.lineTo(x, H - h);
  }
  mg.lineTo(W, H);
  mg.closePath();
  mg.fillPath();

  // Near mountains
  mg.fillStyle(0x252555, 0.6);
  mg.beginPath();
  mg.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) {
    const h =
      130 +
      Math.sin(x * 0.012 + 2) * 100 +
      Math.sin(x * 0.028 + 1) * 50 +
      Math.sin(x * 0.05) * 20;
    mg.lineTo(x, H - h);
  }
  mg.lineTo(W, H);
  mg.closePath();
  mg.fillPath();

  // Ground glow (warm horizon)
  sc.add.rectangle(W / 2, H - 80, W, 160, 0x604830, 0.08).setDepth(-7);

  // Clouds
  sc.clouds = [];
  for (let i = 0; i < 6; i++) {
    const cl = sc.add
      .sprite(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(20, LT + 2 * LH),
        "cloud",
      )
      .setDepth(-5)
      .setAlpha(0.5 + Math.random() * 0.3)
      .setScale(1 + Math.random() * 1.5);
    sc.clouds.push({ spr: cl, spd: 8 + Math.random() * 12 });
  }
}

// ─── LANES ─────────────────────────────────────────────
function mkLanes(sc) {
  sc.lanes = [];
  sc.grounds = [];
  sc.lnOv = [];
  sc.shadows = [];

  for (let i = 0; i < 4; i++) {
    const ly = LT + i * LH,
      gy = ly + GO;

    // Lane bg (semi-transparent)
    const lbg = sc.add
      .rectangle(W / 2, ly + LH / 2, W, LH, 0x000000, 0.15)
      .setDepth(-3);
    sc.lanes.push(lbg);

    // Ground line
    const gl = sc.add.graphics().setDepth(2);
    gl.fillStyle(PC[i], 0.25);
    gl.fillRect(0, gy, W, 2);
    gl.fillStyle(0x8b7355, 0.3);
    gl.fillRect(0, gy + 2, W, 6);

    // Ground TileSprite
    const gnd = sc.add
      .tileSprite(W / 2, gy + 5, W, 8, "gnd")
      .setDepth(2)
      .setAlpha(0.6);
    sc.grounds.push(gnd);

    // Player tag
    const tag = sc.add.graphics().setDepth(3);
    tag.fillStyle(PC[i], 0.7);
    tag.fillTriangle(0, gy - 16, 50, gy - 16, 42, gy - 2);
    tag.fillRect(0, gy - 16, 42, 14);
    sc.add
      .text(4, gy - 16, PN[i], {
        fontFamily: '"Impact","Arial Black",sans-serif',
        fontSize: "13px",
        color: "#fff",
        fontStyle: "bold",
      })
      .setDepth(4);

    // Dino shadow
    const sh = sc.add.ellipse(DX, gy + 3, 32, 8, 0x000000, 0.25).setDepth(5);
    sc.shadows.push(sh);

    // Defeated overlay
    const ov = sc.add
      .rectangle(W / 2, ly + LH / 2, W, LH, 0x000000, 0.7)
      .setDepth(18)
      .setVisible(false);
    sc.lnOv.push(ov);
  }
}

// ─── DINOS ─────────────────────────────────────────────
function mkDinos(sc) {
  sc.dinos = [];
  for (let i = 0; i < 4; i++) {
    const p = sc.st.players[i];
    const spr = sc.add
      .sprite(p.x, p.y, "dr1")
      .setOrigin(0.5, 1)
      .setTint(PC[i])
      .setDepth(10)
      .setVisible(false);
    sc.dinos.push(spr);
  }
}

// ─── HUD (Smash-Style Angled Panels) ───────────────────
function mkHUD(sc) {
  sc.hud = { panels: [], icons: [], distTxt: null, evtTxt: null };
  const pw = 185,
    ph = 56,
    gap = 6;
  const startX = (W - (pw * 4 + gap * 3)) / 2;

  // HUD background bar
  const hg = sc.add.graphics().setDepth(25);
  hg.fillStyle(0x0a0a1a, 0.92);
  hg.fillRect(0, HT - 4, W, H - HT + 4);
  hg.lineStyle(2, 0x444466, 0.5);
  hg.lineBetween(0, HT - 4, W, HT - 4);

  for (let i = 0; i < 4; i++) {
    const x = startX + i * (pw + gap),
      y = HT + 4;
    const sk = 10; // skew angle

    // Panel bg (angled shape)
    const pg = sc.add.graphics().setDepth(26);
    pg.fillStyle(PC[i], 0.15);
    pg.beginPath();
    pg.moveTo(x + sk, y);
    pg.lineTo(x + pw, y);
    pg.lineTo(x + pw - sk, y + ph);
    pg.lineTo(x, y + ph);
    pg.closePath();
    pg.fillPath();
    // Border
    pg.lineStyle(2, PC[i], 0.5);
    pg.beginPath();
    pg.moveTo(x + sk, y);
    pg.lineTo(x + pw, y);
    pg.lineTo(x + pw - sk, y + ph);
    pg.lineTo(x, y + ph);
    pg.closePath();
    pg.strokePath();

    // Player header tab
    const hdr = sc.add.graphics().setDepth(27);
    hdr.fillStyle(PC[i], 0.8);
    hdr.beginPath();
    hdr.moveTo(x + sk + 2, y + 1);
    hdr.lineTo(x + 70, y + 1);
    hdr.lineTo(x + 62, y + 18);
    hdr.lineTo(x + sk - 4, y + 18);
    hdr.closePath();
    hdr.fillPath();

    // Player name
    sc.add
      .text(x + sk + 6, y + 2, PN[i], {
        fontFamily: '"Impact","Arial Black",sans-serif',
        fontSize: "14px",
        color: "#fff",
        fontStyle: "bold",
      })
      .setDepth(28);

    // CPU badge for AI players
    const cpuBadge = sc.add
      .text(x + pw - 42, y + 3, i >= 2 ? "CPU" : "", {
        fontFamily: '"Impact","Arial Black",sans-serif',
        fontSize: "11px",
        color: "#888",
      })
      .setDepth(28);

    // Dino preview sprite in panel
    const preview = sc.add
      .sprite(x + pw - 30, y + ph - 6, "dr1")
      .setOrigin(0.5, 1)
      .setTint(PC[i])
      .setScale(0.7)
      .setAlpha(0.3)
      .setDepth(26);

    // Stock icons
    const icons = [];
    for (let s = 0; s < STOCKS; s++) {
      const si = sc.add
        .sprite(x + sk + 8 + s * 16, y + 32, "si")
        .setTint(PC[i])
        .setScale(1.8)
        .setDepth(28);
      icons.push(si);
    }

    // Status text
    const stTxt = sc.add
      .text(x + sk + 60, y + 26, "READY", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: PH[i],
      })
      .setDepth(28);

    sc.hud.panels.push({ pg, hdr, cpuBadge, preview, stTxt });
    sc.hud.icons.push(icons);
  }

  // Distance counter (center bottom)
  sc.hud.distTxt = sc.add
    .text(W / 2, HT + ph + 16, "00000m", {
      fontFamily: '"Impact","Arial Black",sans-serif',
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold",
    })
    .setOrigin(0.5)
    .setDepth(28)
    .setAlpha(0.8);

  // Event text
  sc.hud.evtTxt = sc.add
    .text(W / 2, HT + ph + 38, "", {
      fontFamily: '"Impact","Arial Black",sans-serif',
      fontSize: "13px",
      color: "#ff0",
    })
    .setOrigin(0.5)
    .setDepth(28)
    .setAlpha(0);

  // Sudden death
  sc.hud.sdTxt = sc.add
    .text(W / 2, LT - 6, "", {
      fontFamily: '"Impact","Arial Black",sans-serif',
      fontSize: "18px",
      color: "#ff2222",
    })
    .setOrigin(0.5, 1)
    .setDepth(30)
    .setAlpha(0);
}

// ─── TITLE SCREEN ──────────────────────────────────────
function mkTitle(sc) {
  sc.ui = sc.ui || {};
  const c = sc.add.container(0, 0).setDepth(40);
  sc.ui.title = c;

  // Overlay
  c.add(sc.add.rectangle(W / 2, H / 2, W, H, 0x06061a, 0.8));

  // Animated background bars
  sc.titleBars = [];
  for (let i = 0; i < 7; i++) {
    const bar = sc.add
      .rectangle(-120 + i * 150, 30 + i * 68, 260, 10, PC[i % 4], 0.12)
      .setAngle(-14)
      .setDepth(0);
    c.add(bar);
    sc.titleBars.push(bar);
    sc.tweens.add({
      targets: bar,
      x: bar.x + 90,
      duration: 2600 + i * 220,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // Accent lines
  for (let i = 0; i < 4; i++)
    c.add(sc.add.rectangle(W / 2 - 150 + i * 100, 58, 90, 4, PC[i], 0.75));

  // Title plate to keep texts readable and separated from background bars
  c.add(sc.add.rectangle(W / 2, 178, 610, 190, 0x0a0f2b, 0.38));

  // Subtitle
  c.add(
    sc.add
      .text(W / 2, 76, "PLATANUS HACK 26", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#6a7394",
      })
      .setOrigin(0.5),
  );

  // Title "CHROME"
  const t1 = sc.add
    .text(W / 2, 132, "CHROME", {
      fontFamily: '"Impact","Arial Black",sans-serif',
      fontSize: "64px",
      color: "#a5adbf",
      fontStyle: "bold",
      letterSpacing: 6,
    })
    .setOrigin(0.5);
  c.add(t1);

  // Title "DINO PARTY"
  const t2 = sc.add
    .text(W / 2, 212, "DINO PARTY", {
      fontFamily: '"Impact","Arial Black",sans-serif',
      fontSize: "74px",
      color: "#fff",
      fontStyle: "bold",
      letterSpacing: 3,
    })
    .setOrigin(0.5);
  c.add(t2);
  sc.titleMain = t2;
  sc.tweens.add({
    targets: t2,
    scaleX: 1.03,
    scaleY: 1.03,
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  // Colored underline
  const ulG = sc.add.graphics();
  for (let i = 0; i < 4; i++) {
    ulG.fillStyle(PC[i], 0.9);
    ulG.fillRect(W / 2 - 200 + i * 100, 260, 95, 4);
  }
  c.add(ulG);

  sc.titleBtns = [];

  const pressStart = sc.add
    .text(W / 2, 344, "PRESS START TO ENTER LOBBY", {
      fontFamily: '"Impact","Arial Black",sans-serif',
      fontSize: "24px",
      color: "#ffea00",
      fontStyle: "bold",
    })
    .setOrigin(0.5);
  c.add(pressStart);
  sc.titlePress = pressStart;
  sc.tweens.add({
    targets: pressStart,
    alpha: 0.45,
    y: 350,
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  // Floating dino silhouettes
  sc.titleFloaters = [];
  for (let i = 0; i < 4; i++) {
    const fl = sc.add
      .sprite(130 + i * 180, 420 + (i % 2) * 34, "dr1")
      .setTint(PC[i])
      .setScale(2.4)
      .setAlpha(0.16);
    c.add(fl);
    sc.titleFloaters.push(fl);
    sc.tweens.add({
      targets: fl,
      y: fl.y - 16,
      angle: i % 2 ? 2 : -2,
      duration: 1300 + i * 140,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // High scores preview
  c.add(
    sc.add
      .text(W / 2, 480, "TOP SCORES", {
        fontFamily: '"Impact","Arial Black",sans-serif',
        fontSize: "12px",
        color: "#FF4444",
        fontStyle: "bold",
      })
      .setOrigin(0.5),
  );
  sc.titleHSTxt = sc.add
    .text(W / 2, 496, "", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#666",
      align: "center",
      lineSpacing: 2,
    })
    .setOrigin(0.5, 0);
  c.add(sc.titleHSTxt);

  // Footer
  c.add(
    sc.add
      .text(W / 2, H - 14, "PRESS START BUTTON", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#333",
      })
      .setOrigin(0.5),
  );

  c.setVisible(false);
}

function mkLobby(sc) {
  sc.ui = sc.ui || {};
  const c = sc.add.container(0, 0).setDepth(45);
  sc.ui.lobby = c;

  c.add(sc.add.rectangle(W / 2, H / 2, W, H, 0x06061a, 0.82));

  c.add(
    sc.add
      .text(W / 2, 80, "SMASH LOBBY", {
        fontFamily: '"Impact","Arial Black",sans-serif',
        fontSize: "40px",
        color: "#fff",
        fontStyle: "bold",
      })
      .setOrigin(0.5),
  );

  sc.lobbySub = sc.add
    .text(W / 2, 118, "PRESS ANY BUTTON TO JOIN", {
      fontFamily: '"Impact","Arial Black",sans-serif',
      fontSize: "18px",
      color: "#ffea00",
      fontStyle: "bold",
    })
    .setOrigin(0.5);
  c.add(sc.lobbySub);
  sc.tweens.add({
    targets: sc.lobbySub,
    alpha: 0.35,
    duration: 650,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  sc.lobbyRacersTxt = sc.add
    .text(W / 2, 148, "HUMANOS: 0 • CPU: 4", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#bbb",
    })
    .setOrigin(0.5);
  c.add(sc.lobbyRacersTxt);

  sc.lobbyCards = [];
  const cw = 170,
    ch = 200,
    csk = 15;
  const cs = (W - cw * 4 - 24) / 2;

  for (let i = 0; i < 4; i++) {
    const cx = cs + i * (cw + 8),
      cy = 180;
    const g = sc.add.graphics();
    c.add(g);

    const txt = sc.add
      .text(cx + cw / 2, cy + ch - 30, "", {
        fontFamily: '"Impact","Arial Black",sans-serif',
        fontSize: "18px",
        color: "#888",
        align: "center",
      })
      .setOrigin(0.5);
    c.add(txt);

    const dpr = sc.add
      .sprite(cx + cw / 2, cy + ch / 2, "dr1")
      .setOrigin(0.5, 1)
      .setTint(PC[i])
      .setScale(3.0)
      .setAlpha(0.4);
    c.add(dpr);

    const head = sc.add
      .text(cx + 16, cy + 14, PN[i], {
        fontFamily: '"Impact","Arial Black",sans-serif',
        fontSize: "16px",
        color: PH[i],
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setAlpha(0.9);
    c.add(head);

    sc.tweens.add({
      targets: dpr,
      y: dpr.y - 10,
      duration: 900 + i * 120,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    sc.lobbyCards.push({
      g,
      txt,
      dpr,
      head,
      x: cx,
      y: cy,
      w: cw,
      h: ch,
      sk: csk,
      pLabel: PN[i],
      joined: false,
    });
  }

  sc.lobbyHint = sc.add
    .text(W / 2, H - 52, "PRESIONA CUALQUIER BOTON PARA UNIRTE", {
      fontFamily: '"Impact","Arial Black",sans-serif',
      fontSize: "20px",
      color: "#ffea00",
      fontStyle: "bold",
    })
    .setOrigin(0.5);
  c.add(sc.lobbyHint);

  sc.lobbyMsg = sc.add
    .text(W / 2, H - 28, "", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#ff6666",
    })
    .setOrigin(0.5);
  c.add(sc.lobbyMsg);

  c.add(
    sc.add
      .text(
        W / 2,
        H - 12,
        "CUALQUIER BOTON PUEDE SER USADO POR CUALQUIER JUGADOR",
        {
        fontFamily: '"Impact","Arial Black",sans-serif',
        fontSize: "10px",
        color: "#444",
        },
      )
      .setOrigin(0.5),
  );

  c.setVisible(false);
}

function drawAngledBox(g, x, y, w, h, sk, col, alpha, border) {
  g.clear();
  g.fillStyle(col, alpha);
  g.beginPath();
  g.moveTo(x + sk, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w - sk, y + h);
  g.lineTo(x, y + h);
  g.closePath();
  g.fillPath();
  if (border) {
    g.lineStyle(2, 0xffffff, border);
    g.beginPath();
    g.moveTo(x + sk, y);
    g.lineTo(x + w, y);
    g.lineTo(x + w - sk, y + h);
    g.lineTo(x, y + h);
    g.closePath();
    g.strokePath();
  }
}

function hiliteTitle(sc) {
  sc.titleBtns.forEach((b, i) => {
    drawAngledBox(b.bg, b.x, b.y, b.w, b.h, b.sk, 0x1a1a3a, 0.4, 0);
    b.lbl.setColor("#666666");
  });
}

function showTitle(sc) {
  sc.st.phase = "title";
  rfTitleHS(sc);
  hiliteTitle(sc);
  if (sc.ui.lobby) sc.ui.lobby.setVisible(false);
  sc.ui.title.setVisible(true);
  sc.dinos.forEach((d) => d.setVisible(false));
  sc.lnOv.forEach((o) => o.setVisible(false));
  sc.hud.sdTxt.setAlpha(0);
}

function updateTitle(sc, time) {
  if (anyP(sc, ["START1", "START2"])) {
    sfx(sc, "select");
    showLobby(sc);
  } else if (anyP(sc, ["P1_U", "P2_U", "P1_D", "P2_D"])) {
    // Hidden shortcut for leaderboard / controls?
  }
}

function showLobby(sc) {
  sc.ui.title.setVisible(false);
  sc.ui.lobby.setVisible(true);
  sc.st.phase = "lobby";
  sc.st.lobby.joined = [null, null, null, null];
  sc.st.lobby.msg = "";
  rfLobby(sc);
}

function updateLobby(sc, time) {
  let changed = false;

  const ALL_BTNS = Object.keys(CABINET_KEYS).filter((k) => !k.startsWith("START"));
  for (const btn of ALL_BTNS) {
    if (sc.ctrl.pressed[btn]) {
      sc.ctrl.pressed[btn] = false;
      const slot = sc.st.lobby.joined.indexOf(btn);
      if (slot !== -1) {
        sc.st.lobby.joined[slot] = null;
        sc.st.lobby.msg = "";
        changed = true;
      } else {
        const empty = sc.st.lobby.joined.indexOf(null);
        if (empty !== -1) {
          sc.st.lobby.joined[empty] = btn;
          sc.st.lobby.msg = "";
          changed = true;
        }
      }
    }
  }

  if (changed) {
    sfx(sc, "select");
    rfLobby(sc);
  }

  if (anyP(sc, ["START1", "START2"])) {
    if (!sc.st.lobby.joined.some(Boolean)) {
      sc.st.lobby.msg = "AL MENOS 1 JUGADOR DEBE UNIRSE";
      rfLobby(sc);
      sfx(sc, "click");
      return;
    }
    sfx(sc, "select");
    startGame(sc, time);
  }
}

function rfLobby(sc) {
  const joined = sc.st.lobby.joined;
  const humans = joined.filter(Boolean).length;

  sc.lobbyRacersTxt.setText(`HUMANOS: ${humans} • CPU: ${4 - humans}`);
  sc.lobbyHint.setText(
    humans > 0 ? "START PARA JUGAR" : "PRESIONA CUALQUIER BOTON PARA UNIRTE",
  );
  sc.lobbyMsg.setText(sc.st.lobby.msg || "");

  for (let i = 0; i < 4; i++) {
    const c = sc.lobbyCards[i];
    if (joined[i]) {
      c.txt.setText(`${PN[i]}\n[${joined[i]}]`);
      c.txt.setColor(PH[i]);
      c.dpr.setAlpha(1);
      c.head.setAlpha(1);
      drawAngledBox(c.g, c.x, c.y, c.w, c.h, c.sk, PC[i], 0.42, 0.85);
    } else {
      c.txt.setText("CPU");
      c.txt.setColor("#b7b7b7");
      c.dpr.setAlpha(0.8);
      c.head.setAlpha(0.9);
      drawAngledBox(c.g, c.x, c.y, c.w, c.h, c.sk, PC_DARK[i], 0.22, 0.4);
    }
  }
}

function updateMenuFX(sc, time) {
  if (sc.st.phase === "title") {
    if (sc.titleMain) {
      const glow = 0.88 + Math.sin(time * 0.004) * 0.12;
      sc.titleMain.setAlpha(glow);
    }
    if (sc.titlePress) {
      sc.titlePress.setScale(1 + Math.sin(time * 0.006) * 0.03);
    }
  }

  if (sc.st.phase === "lobby") {
    for (let i = 0; i < sc.lobbyCards.length; i++) {
      const c = sc.lobbyCards[i];
      const amp = sc.st.lobby.joined[i] !== null ? 1 : 0.35;
      c.txt.setY(c.y + c.h - 30 + Math.sin(time * 0.004 + i) * amp);
    }
  }
}

function rfTitleHS(sc) {
  const hs = sc.st.hiScores;
  sc.titleHSTxt.setText(
    hs.length
      ? hs
          .map(
            (e, i) =>
              `${i + 1}. ${e.name.padEnd(5)} ${String(e.dist).padStart(5)}m`,
          )
          .join("\n")
      : "NO SCORES YET",
  );
}

// ─── PAUSE ─────────────────────────────────────────────
function mkPause(sc) {
  sc.ui = sc.ui || {};
  const c = sc.add.container(0, 0).setDepth(50);
  c.add(sc.add.rectangle(W / 2, H / 2, W, H, 0x06061a, 0.85));
  c.add(
    sc.add
      .text(W / 2, H / 2 - 30, "PAUSED", {
        fontFamily: '"Impact","Arial Black",sans-serif',
        fontSize: "56px",
        color: "#fff",
        fontStyle: "bold",
      })
      .setOrigin(0.5),
  );
  c.add(
    sc.add
      .text(W / 2, H / 2 + 30, "PRESS START TO RESUME", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#555",
      })
      .setOrigin(0.5),
  );
  c.setVisible(false);
  sc.ui.pause = c;
}

// ─── CONTROLS ──────────────────────────────────────────
function mkCtrl(sc) {
  sc.ui = sc.ui || {};
  const c = sc.add.container(0, 0).setDepth(45);
  c.add(sc.add.rectangle(W / 2, H / 2, W, H, 0x06061a, 0.96));
  c.add(
    sc.add
      .text(W / 2, 80, "CONTROLS", {
        fontFamily: '"Impact","Arial Black",sans-serif',
        fontSize: "40px",
        color: "#fff",
        fontStyle: "bold",
      })
      .setOrigin(0.5),
  );

  const lines = [
    "",
    "P1     (SU BOTON)",
    "",
    "P2     (SU BOTON)",
    "",
    "P3     (SU BOTON)",
    "",
    "P4     (SU BOTON)",
    "",
    "PAUSE        ENTER / 2",
    "",
    "",
    "JUMP OVER OBSTACLES!",
    "LAST DINO STANDING WINS!",
  ];
  c.add(
    sc.add
      .text(W / 2, 160, lines.join("\n"), {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#aaa",
        align: "center",
        lineSpacing: 3,
      })
      .setOrigin(0.5, 0),
  );
  c.add(
    sc.add
      .text(W / 2, H - 20, "PRESS START OR BUTTON TO GO BACK", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#444",
      })
      .setOrigin(0.5),
  );
  c.setVisible(false);
  sc.ui.controls = c;
}

function showCtrlScreen(sc) {
  sc.ui.title.setVisible(false);
  sc.ui.controls.setVisible(true);
  sc.st.phase = "controls";
}

// ─── LEADERBOARD ───────────────────────────────────────
function mkLB(sc) {
  sc.ui = sc.ui || {};
  const c = sc.add.container(0, 0).setDepth(45);
  c.add(sc.add.rectangle(W / 2, H / 2, W, H, 0x06061a, 0.96));
  c.add(
    sc.add
      .text(W / 2, 80, "LEADERBOARD", {
        fontFamily: '"Impact","Arial Black",sans-serif',
        fontSize: "40px",
        color: "#FF4444",
        fontStyle: "bold",
      })
      .setOrigin(0.5),
  );
  sc.lbTxt = sc.add
    .text(W / 2, 160, "", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ccc",
      align: "center",
      lineSpacing: 10,
    })
    .setOrigin(0.5, 0);
  c.add(sc.lbTxt);
  c.add(
    sc.add
      .text(W / 2, H - 20, "PRESS START OR BUTTON TO GO BACK", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#444",
      })
      .setOrigin(0.5),
  );
  c.setVisible(false);
  sc.ui.leaderboard = c;
}

function showLBScreen(sc) {
  const hs = sc.st.hiScores;
  sc.lbTxt.setText(
    hs.length
      ? hs
          .map(
            (e, i) =>
              `${i + 1}.  ${e.name.padEnd(6)} ${String(e.dist).padStart(5)}m  ${e.winner}`,
          )
          .join("\n")
      : "NO SCORES YET",
  );
  sc.ui.title.setVisible(false);
  sc.ui.leaderboard.setVisible(true);
  sc.st.phase = "leaderboard";
}

// ─── EVENT BANNER (Shaped, Colored, Animated) ──────────
function mkEvtBnr(sc) {
  sc.evtBnr = sc.add.container(-W, 0).setDepth(35);
  sc.evtBnrBG = sc.add.graphics();
  sc.evtBnr.add(sc.evtBnrBG);
  // Dark overlay behind banner
  sc.evtBnrOv = sc.add
    .rectangle(W / 2, H / 2, W, H, 0x000000, 0.5)
    .setDepth(34)
    .setVisible(false);
  sc.evtBnrTxt = sc.add
    .text(0, 0, "", {
      fontFamily: '"Impact","Arial Black",sans-serif',
      fontSize: "38px",
      color: "#fff",
      fontStyle: "bold",
    })
    .setOrigin(0.5);
  sc.evtBnr.add(sc.evtBnrTxt);
}

function showEvtBanner(sc, text, color) {
  const bw = 500,
    bh = 70,
    sk = 30;
  const bx = W / 2 - bw / 2,
    by = H / 2 - bh / 2;

  sc.evtBnrBG.clear();
  sc.evtBnrBG.fillStyle(color, 0.9);
  sc.evtBnrBG.beginPath();
  sc.evtBnrBG.moveTo(bx + sk, by);
  sc.evtBnrBG.lineTo(bx + bw, by);
  sc.evtBnrBG.lineTo(bx + bw - sk, by + bh);
  sc.evtBnrBG.lineTo(bx, by + bh);
  sc.evtBnrBG.closePath();
  sc.evtBnrBG.fillPath();
  // Highlight line at top
  sc.evtBnrBG.lineStyle(3, 0xffffff, 0.6);
  sc.evtBnrBG.lineBetween(bx + sk, by, bx + bw, by);

  sc.evtBnrTxt.setText(text);
  sc.evtBnrTxt.setPosition(W / 2, H / 2);
  sc.evtBnrOv.setVisible(true);

  // Slide in from left
  sc.evtBnr.setX(-W);
  sc.tweens.add({
    targets: sc.evtBnr,
    x: 0,
    duration: 250,
    ease: "Power3",
    onComplete: () => {
      sc.time.delayedCall(1200, () => {
        sc.tweens.add({
          targets: sc.evtBnr,
          x: W,
          duration: 250,
          ease: "Power3",
          onComplete: () => sc.evtBnrOv.setVisible(false),
        });
      });
    },
  });

  sfx(sc, "event");
}

// ─── DEFEATED BANNER ───────────────────────────────────
function mkDefeat(sc) {
  sc.defTxts = [];
  for (let i = 0; i < 4; i++) {
    const ly = LT + i * LH + LH / 2;
    const t = sc.add
      .text(W / 2, ly, "", {
        fontFamily: '"Impact","Arial Black",sans-serif',
        fontSize: "32px",
        color: PH[i],
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAngle(-12)
      .setAlpha(0)
      .setDepth(22);
    sc.defTxts.push(t);
  }
}

// ─── VICTORY SCREEN ────────────────────────────────────
function mkVictory(sc) {
  sc.ui = sc.ui || {};
  const c = sc.add.container(0, 0).setDepth(60).setVisible(false);
  sc.ui.victory = c;
  c.add(sc.add.rectangle(W / 2, H / 2, W, H, 0x04041a, 0.93));

  sc.vicGlow = sc.add.rectangle(W / 2, 250, 220, 220, 0xffffff, 0.12);
  c.add(sc.vicGlow);

  sc.vicCrn = sc.add.sprite(W / 2, 165, "crn").setScale(2.5);
  c.add(sc.vicCrn);

  sc.vicDino = sc.add
    .sprite(W / 2, 300, "dr1")
    .setScale(3)
    .setOrigin(0.5, 1);
  c.add(sc.vicDino);

  sc.vicTitle = sc.add
    .text(W / 2, 320, "WINNER!", {
      fontFamily: '"Impact","Arial Black",sans-serif',
      fontSize: "52px",
      color: "#fff",
      fontStyle: "bold",
    })
    .setOrigin(0.5);
  c.add(sc.vicTitle);

  sc.vicName = sc.add
    .text(W / 2, 375, "", {
      fontFamily: '"Impact","Arial Black",sans-serif',
      fontSize: "30px",
      color: "#fff",
      fontStyle: "bold",
    })
    .setOrigin(0.5);
  c.add(sc.vicName);

  sc.vicStats = sc.add
    .text(W / 2, 420, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#888",
      align: "center",
      lineSpacing: 5,
    })
    .setOrigin(0.5, 0);
  c.add(sc.vicStats);

  c.add(
    sc.add
      .text(W / 2, H - 20, "PRESS START TO CONTINUE", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#444",
      })
      .setOrigin(0.5),
  );
}

// ─── START GAME ────────────────────────────────────────
function startGame(sc, time) {
  sc.ui.title.setVisible(false);
  sc.ui.lobby.setVisible(false);
  startMusic(sc);

  sc.st.spd = BSP;
  sc.st.dist = 0;
  sc.st.nextSpd = time + SPINT;
  sc.st.nextEvt = time + EVINT;
  sc.st.curEvt = null;
  sc.st.evtEnd = 0;
  sc.st.sudden = false;
  sc.st.winner = -1;
  sc.st.freeze = 0;

  if (sc.obsSpr) sc.obsSpr.forEach((s) => s.destroy());
  sc.obsSpr = [];
  sc.st.obs = [];
  sc.st.meteors = [];
  if (sc.metSpr) sc.metSpr.forEach((s) => s.destroy());
  sc.metSpr = [];

  const joined = sc.st.lobby.joined;
  sc.st.mode = joined.filter(Boolean).length;

  for (let i = 0; i < 4; i++) {
    const p = sc.st.players[i];

    const isHuman = joined[i] !== null;

    p.stocks = STOCKS;
    p.alive = true;
    p.y = p.groundY;
    p.vy = 0;
    p.jumping = false;
    p.invUntil = 0;
    p.frame = 0;
    p.animT = 0;
    p.aiNext = 0;
    p.isAI = !isHuman;
    sc.st.spawnCd[i] = time + 2000;

    sc.dinos[i].setVisible(true).setAlpha(1).setTexture("dr1").setTint(PC[i]);
    sc.lnOv[i].setVisible(false);
    sc.defTxts[i].setAlpha(0);
    sc.shadows[i].setAlpha(0.25);

    for (let s = 0; s < STOCKS; s++)
      sc.hud.icons[i][s]
        .setVisible(true)
        .setAlpha(1)
        .setTint(PC[i]);

    sc.hud.panels[i].pg.setAlpha(1);
    sc.hud.panels[i].hdr.setAlpha(1);
    sc.hud.panels[i].stTxt.setText("RUNNING").setColor(PH[i]);
    sc.hud.panels[i].cpuBadge.setText(p.isAI ? "CPU" : "");
    sc.hud.panels[i].preview.setAlpha(0.3);
  }

  sc.hud.sdTxt.setAlpha(0);
  sc.hud.evtTxt.setAlpha(0);
  sc.lanes.forEach((l) => l.setFillStyle(0x000000, 0.15));
  sc.st.phase = "playing";
}

// ─── INPUT ─────────────────────────────────────────────
function mkInput(sc) {
  sc.ctrl = { held: {}, pressed: {} };
  const onD = (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const c = KB[k];
    if (!c) return;
    if (!sc.ctrl.held[c]) sc.ctrl.pressed[c] = true;
    sc.ctrl.held[c] = true;
  };
  const onU = (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const c = KB[k];
    if (c) sc.ctrl.held[c] = false;
  };
  window.addEventListener("keydown", onD);
  window.addEventListener("keyup", onU);
  sc.events.once("shutdown", () => {
    window.removeEventListener("keydown", onD);
    window.removeEventListener("keyup", onU);
  });
}

function isH(sc, c) {
  return sc.ctrl.held[c] === true;
}
function anyP(sc, cs) {
  for (const c of cs) {
    if (sc.ctrl.pressed[c]) {
      sc.ctrl.pressed[c] = false;
      return true;
    }
  }
  return false;
}
function vA(sc) {
  let a = 0;
  if (isH(sc, "P1_U") || isH(sc, "P2_U")) a--;
  if (isH(sc, "P1_D") || isH(sc, "P2_D")) a++;
  return Phaser.Math.Clamp(a, -1, 1);
}

// ─── UPDATE ────────────────────────────────────────────
function update(time, delta) {
  const sc = this;
  if (!sc.st) return;

  // Clouds scroll
  if (sc.clouds)
    sc.clouds.forEach((cl) => {
      cl.spr.x -= (cl.spd * delta) / 1000;
      if (cl.spr.x < -80) cl.spr.x = W + 80;
    });

  const ph = sc.st.phase;
  if (ph === "title") {
    updateMenuFX(sc, time);
    updateTitle(sc, time);
    return;
  }
  if (ph === "lobby") {
    updateMenuFX(sc, time);
    updateLobby(sc, time);
    return;
  }
  if (ph === "leaderboard" || ph === "controls") {
    if (anyP(sc, ["START1", "START2", "P1_1", "P2_1"])) {
      sc.ui[ph].setVisible(false);
      showTitle(sc);
    }
    return;
  }
  if (ph === "paused") {
    if (anyP(sc, ["START1", "START2"])) {
      sc.ui.pause.setVisible(false);
      sc.st.phase = "playing";
    }
    return;
  }
  if (ph === "victory") {
    if (anyP(sc, ["START1", "START2", "P1_1", "P2_1"])) backToTitle(sc);
    return;
  }
  if (ph !== "playing") return;

  if (time < sc.st.freeze) return;
  const dt = Math.min(delta, 33) / 1000;

  if (anyP(sc, ["START1", "START2"])) {
    sc.st.phase = "paused";
    sc.ui.pause.setVisible(true);
    return;
  }

  // Speed up
  if (time > sc.st.nextSpd) {
    sc.st.spd = Math.min(sc.st.spd + SPI, MSP);
    sc.st.nextSpd = time + SPINT;
  }
  sc.st.dist += sc.st.spd * dt;

  updateEvts(sc, time, dt);
  handleInput(sc, time);
  updateAI(sc, time);
  updatePhys(sc, dt, time);
  spawnObs(sc, time);
  updateObs(sc, dt);
  updateMeteors(sc, dt);
  checkColl(sc, time);
  updateAnims(sc, time);
  updateGnd(sc, dt, time);
  rfHUD(sc, time);
  checkEnd(sc, time);
}

// ─── PLAYER INPUT ──────────────────────────────────────
function handleInput(sc, time) {
  const ps = sc.st.players;
  for (let i = 0; i < 4; i++) {
    if (ps[i].alive && !ps[i].isAI && !ps[i].jumping) {
      const btn = sc.st.lobby.joined[i];
      if (btn && sc.ctrl.pressed[btn]) {
        sc.ctrl.pressed[btn] = false;
        doJump(sc, ps[i]);
      }
    }
  }
}

function doJump(sc, p) {
  if (p.jumping || !p.alive) return;
  p.jumping = true;
  p.vy = sc.st.curEvt === "LOW GRAVITY" ? JV * 1.2 : JV;
  sfx(sc, "jump");
}

// ─── AI ────────────────────────────────────────────────
function updateAI(sc, time) {
  const jumpVel = sc.st.curEvt === "LOW GRAVITY" ? Math.abs(JV * 1.2) : Math.abs(JV);
  const grav = sc.st.curEvt === "LOW GRAVITY" ? GR * 0.4 : GR;
  const idealDist = (jumpVel / grav) * sc.st.spd;

  for (let i = 0; i < 4; i++) {
    const p = sc.st.players[i];
    if (!p.isAI || !p.alive || p.jumping) continue;
    if (time < p.aiNext) continue;

    let jump = false;
    // Calculate a safer reaction distance dependent on speed
    // 0.75 * idealDist ensures we jump much closer to the obstacle
    // + 18 adds a minor buffer so we don't jump too late at low speeds
    const react = idealDist * 0.75 + 18; 

    for (const o of sc.st.obs) {
      if (o.lane !== p.lane) continue;
      const dx = o.x - DX;
      // Jump if obstacle is getting close
      if (dx > 0 && dx < react) {
        jump = Math.random() < 0.98;
        break;
      }
    }
    if (!jump) {
      for (const m of sc.st.meteors) {
        if (
          Math.abs(m.y - p.groundY) < 50 &&
          m.x - DX > 0 &&
          m.x - DX < react * 0.85
        ) {
          jump = Math.random() < 0.98;
          break;
        }
      }
    }

    if (jump) doJump(sc, p);
    p.aiNext = time + 20 + Math.random() * 20; // Extremely fast checks for precision
  }
}

// ─── PHYSICS ───────────────────────────────────────────
function updatePhys(sc, dt, time) {
  const grav = sc.st.curEvt === "LOW GRAVITY" ? GR * 0.4 : GR;

  for (let i = 0; i < 4; i++) {
    const p = sc.st.players[i];
    if (!p.alive) continue;

    if (p.jumping) {
      p.vy += grav * dt;
      p.y += p.vy * dt;
      // Clamp: don't cross into lane above
      const minY = LT + p.lane * LH + 12;
      if (p.y < minY + 15) {
        p.y = minY + 15;
        if (p.vy < 0) p.vy = 0;
      }
      if (p.y >= p.groundY) {
        p.y = p.groundY;
        p.vy = 0;
        p.jumping = false;
      }
    }

    // Wind storm wobble
    const wx =
      sc.st.curEvt === "WIND STORM" ? -3 + Math.sin(time * 0.01) * 4 : 0;
    sc.dinos[i].x = p.x + wx;
    sc.dinos[i].y = p.y;

    // Shadow follows dino
    sc.shadows[i].x = p.x + wx;
    sc.shadows[i].setScale(1, p.jumping ? 0.5 : 1);
    sc.shadows[i].setAlpha(p.jumping ? 0.12 : 0.25);

    // Invuln blink
    if (time < p.invUntil) {
      sc.dinos[i].setAlpha(Math.sin(time * 0.02) > 0 ? 1 : 0.15);
    } else {
      sc.dinos[i].setAlpha(1);
    }
  }
}

// ─── OBSTACLES ─────────────────────────────────────────
function spawnObs(sc, time) {
  const sm = sc.st.curEvt === "SPEED UP" ? 1.7 : 1;
  const spd = sc.st.spd * sm;

  for (let i = 0; i < 4; i++) {
    const p = sc.st.players[i];
    if (!p.alive || time < sc.st.spawnCd[i]) continue;
    let close = false;
    for (const o of sc.st.obs)
      if (o.lane === i && o.x > W - OBGAP) {
        close = true;
        break;
      }
    if (close) continue;

    const r = Math.random();
    let tex, ow, oh, scale;
    if (r < 0.4) {
      tex = "cs";
      scale = 0.8;
      ow = 5 * S * scale;
      oh = 10 * S * scale;
    } else if (r < 0.75) {
      tex = "cl";
      scale = 0.7;
      ow = 6 * S * scale;
      oh = 14 * S * scale;
    } else {
      tex = "cd";
      scale = 0.75;
      ow = 10 * S * scale;
      oh = 10 * S * scale;
    }

    const gy = p.groundY;
    const ox = W + 20 + Math.random() * 60;
    const spr = sc.add.sprite(ox, gy, tex).setOrigin(0.5, 1).setDepth(10).setScale(scale);
    if (sc.st.curEvt === "NIGHT MODE") spr.setTint(0x88ff88);

    sc.st.obs.push({ lane: i, x: ox, y: gy, w: ow, h: oh, spd });
    if (!sc.obsSpr) sc.obsSpr = [];
    sc.obsSpr.push(spr);

    const base = sc.st.sudden ? 700 : 1300,
      vary = sc.st.sudden ? 350 : 700;
    sc.st.spawnCd[i] = time + base + Math.random() * vary;
  }
}

function updateObs(sc, dt) {
  const sm = sc.st.curEvt === "SPEED UP" ? 1.7 : 1;
  for (let i = sc.st.obs.length - 1; i >= 0; i--) {
    const o = sc.st.obs[i];
    o.x -= o.spd * sm * dt;
    if (sc.obsSpr[i]) sc.obsSpr[i].x = o.x;
    if (o.x < -50) {
      if (sc.obsSpr[i]) sc.obsSpr[i].destroy();
      sc.st.obs.splice(i, 1);
      sc.obsSpr.splice(i, 1);
    }
  }
}

// ─── METEORS ───────────────────────────────────────────
function spawnMeteor(sc) {
  const lane = Phaser.Math.Between(0, 3);
  if (!sc.st.players[lane].alive) return;
  const gy = sc.st.players[lane].groundY;
  const spr = sc.add
    .sprite(W + 20, gy - 70 - Math.random() * 30, "mt")
    .setDepth(11)
    .setScale(1.2);
  sc.st.meteors.push({ x: W + 20, y: spr.y, lane, sx: -340, sy: 110 });
  if (!sc.metSpr) sc.metSpr = [];
  sc.metSpr.push(spr);
}

function updateMeteors(sc, dt) {
  for (let i = sc.st.meteors.length - 1; i >= 0; i--) {
    const m = sc.st.meteors[i];
    m.x += m.sx * dt;
    m.y += m.sy * dt;
    if (sc.metSpr[i]) {
      sc.metSpr[i].x = m.x;
      sc.metSpr[i].y = m.y;
      sc.metSpr[i].angle += 200 * dt;
    }
    if (m.x < -30 || m.y > H + 30) {
      if (sc.metSpr[i]) sc.metSpr[i].destroy();
      sc.st.meteors.splice(i, 1);
      sc.metSpr.splice(i, 1);
    }
  }
}

// ─── COLLISIONS ────────────────────────────────────────
function checkColl(sc, time) {
  for (let i = 0; i < 4; i++) {
    const p = sc.st.players[i];
    if (!p.alive || time < p.invUntil) continue;

    const pw = 20,
      ph = 36;
    const px1 = p.x - pw / 2,
      px2 = p.x + pw / 2,
      py1 = p.y - ph,
      py2 = p.y;

    for (const o of sc.st.obs) {
      if (o.lane !== p.lane) continue;
      if (
        px2 > o.x - o.w / 2 &&
        px1 < o.x + o.w / 2 &&
        py2 > o.y - o.h &&
        py1 < o.y
      ) {
        handleHit(sc, i, time);
        break;
      }
    }

    if (time >= p.invUntil)
      for (const m of sc.st.meteors) {
        if (Math.abs(m.x - p.x) < 16 && Math.abs(m.y - (p.y - ph / 2)) < 20) {
          handleHit(sc, i, time);
          break;
        }
      }
  }
}

function handleHit(sc, pi, time) {
  const p = sc.st.players[pi];
  p.stocks--;
  p.invUntil = time + INVT;
  sfx(sc, "hit");

  sc.cameras.main.shake(200, 0.01);
  sc.st.freeze = time + 120;

  spawnFX(sc, p.x, p.y - 18, PC[pi]);

  sc.tweens.add({
    targets: sc.dinos[pi],
    x: p.x - 25,
    duration: 120,
    yoyo: true,
    ease: "Power2",
  });

  const si = p.stocks;
  if (si >= 0 && si < STOCKS) {
    const icon = sc.hud.icons[pi][si];
    sc.tweens.add({
      targets: icon,
      alpha: 0,
      scaleX: 2.5,
      scaleY: 2.5,
      duration: 250,
      onComplete: () => icon.setVisible(false),
    });
  }

  sc.hud.panels[pi].stTxt.setText("HIT!").setColor("#ff4444");
  sc.time.delayedCall(800, () => {
    if (p.alive) sc.hud.panels[pi].stTxt.setText("RUNNING").setColor(PH[pi]);
  });

  if (p.stocks <= 0) handleKO(sc, pi, time);
}

function handleKO(sc, pi, time) {
  const p = sc.st.players[pi];
  p.alive = false;
  sfx(sc, "ko");
  sc.cameras.main.shake(500, 0.025);

  sc.lnOv[pi].setVisible(true).setAlpha(0);
  sc.tweens.add({ targets: sc.lnOv[pi], alpha: 0.65, duration: 400 });

  sc.defTxts[pi].setText(`${PN[pi]} DEFEATED!`).setAlpha(0).setScale(0.3);
  sc.tweens.add({
    targets: sc.defTxts[pi],
    alpha: 1,
    scaleX: 1.2,
    scaleY: 1.2,
    duration: 400,
    ease: "Back.easeOut",
    onComplete: () =>
      sc.tweens.add({ targets: sc.defTxts[pi], alpha: 0.5, duration: 2000 }),
  });

  sc.dinos[pi].setTint(0x333333).setAlpha(0.35);
  sc.shadows[pi].setAlpha(0);
  sc.hud.panels[pi].pg.setAlpha(0.3);
  sc.hud.panels[pi].hdr.setAlpha(0.3);
  sc.hud.panels[pi].stTxt.setText("DEFEATED").setColor("#555");
  sc.hud.panels[pi].preview.setAlpha(0.1);

  checkSudden(sc, time);
}

function spawnFX(sc, x, y, col) {
  for (let i = 0; i < 12; i++) {
    const p = sc.add.rectangle(x, y, 4, 4, col, 1).setDepth(16);
    const a = Math.random() * Math.PI * 2,
      d = 20 + Math.random() * 45;
    sc.tweens.add({
      targets: p,
      x: x + Math.cos(a) * d,
      y: y + Math.sin(a) * d,
      alpha: 0,
      scaleX: 0.15,
      scaleY: 0.15,
      angle: Phaser.Math.Between(-180, 180),
      duration: 200 + Math.random() * 250,
      onComplete: () => p.destroy(),
    });
  }
  // Smoke puffs
  for (let i = 0; i < 4; i++) {
    const r = sc.add
      .circle(x - 8 - i * 6, y - 4, 5 + i * 2, 0x888888, 0.4)
      .setDepth(15);
    sc.tweens.add({
      targets: r,
      x: x - 25 - i * 10,
      alpha: 0,
      scaleX: 2.5,
      scaleY: 2.5,
      duration: 350 + i * 80,
      onComplete: () => r.destroy(),
    });
  }
}

// ─── SUDDEN DEATH ──────────────────────────────────────
function checkSudden(sc, time) {
  const alive = sc.st.players.filter((p) => p.alive);
  if (
    alive.length === 2 &&
    alive.every((p) => p.stocks === 1) &&
    !sc.st.sudden
  ) {
    sc.st.sudden = true;
    sc.st.spd = Math.max(sc.st.spd, 380);
    sc.hud.sdTxt.setText("⚡ SUDDEN DEATH ⚡");
    sc.tweens.add({
      targets: sc.hud.sdTxt,
      alpha: 1,
      duration: 200,
      yoyo: true,
      repeat: 5,
      hold: 150,
      onComplete: () =>
        sc.tweens.add({
          targets: sc.hud.sdTxt,
          alpha: 0.8,
          duration: 500,
          yoyo: true,
          repeat: -1,
        }),
    });
    sfx(sc, "event");
    sc.cameras.main.flash(400, 255, 50, 50);
  }
}

// ─── GAME END ──────────────────────────────────────────
function checkEnd(sc, time) {
  const alive = sc.st.players.filter((p) => p.alive);
  if (alive.length <= 1) {
    sc.st.winner = alive.length === 1 ? alive[0].lane : -1;
    sc.time.delayedCall(800, () => showVictory(sc));
  }
}

function showVictory(sc) {
  sc.st.phase = "victory";
  const wi = sc.st.winner;

  if (wi >= 0) {
    sc.vicDino.setTint(PC[wi]).setTexture("dr1");
    sc.vicCrn.setTint(0xffd700).setVisible(true);
    sc.vicGlow.setFillStyle(PC[wi], 0.12);
    sc.vicName.setText(`${PN[wi]} WINS!`).setColor(PH[wi]);
    sc.vicStats.setText(
      `DISTANCE: ${Math.floor(sc.st.dist / 10)}m\nSTOCKS LEFT: ${sc.st.players[wi].stocks}\nSPEED: ${Math.floor(sc.st.spd)} px/s`,
    );
  } else {
    sc.vicDino.setTint(0x888888);
    sc.vicCrn.setVisible(false);
    sc.vicGlow.setFillStyle(0x888888, 0.08);
    sc.vicName.setText("DRAW!").setColor("#888");
    sc.vicStats.setText(`DISTANCE: ${Math.floor(sc.st.dist / 10)}m`);
  }

  sc.ui.victory.setVisible(true);
  sc.vicDino.setScale(0.5).setAlpha(0);
  sc.tweens.add({
    targets: sc.vicDino,
    scaleX: 3,
    scaleY: 3,
    alpha: 1,
    duration: 500,
    ease: "Back.easeOut",
  });
  sc.vicCrn.setAlpha(0);
  sc.tweens.add({
    targets: sc.vicCrn,
    alpha: 1,
    y: 165,
    duration: 350,
    delay: 350,
    ease: "Bounce.easeOut",
  });
  sc.tweens.add({
    targets: sc.vicGlow,
    scaleX: 1.3,
    scaleY: 1.3,
    alpha: 0.06,
    duration: 1000,
    yoyo: true,
    repeat: -1,
  });
  sfx(sc, "victory");

  if (wi >= 0) {
    const entry = {
      name: PN[wi] + (sc.st.players[wi].isAI ? " CPU" : ""),
      winner: PN[wi],
      dist: Math.floor(sc.st.dist / 10),
      savedAt: new Date().toISOString().slice(0, 10),
    };
    persistHS(entry)
      .then((h) => {
        sc.st.hiScores = h;
      })
      .catch(() => {});
  }
}

function backToTitle(sc) {
  sc.ui.victory.setVisible(false);
  if (sc.obsSpr) {
    sc.obsSpr.forEach((s) => s.destroy());
    sc.obsSpr = [];
  }
  if (sc.metSpr) {
    sc.metSpr.forEach((s) => s.destroy());
    sc.metSpr = [];
  }
  sc.st.obs = [];
  sc.st.meteors = [];
  showTitle(sc);
}

// ─── EVENTS ────────────────────────────────────────────
function updateEvts(sc, time, dt) {
  if (sc.st.curEvt && time > sc.st.evtEnd) endEvt(sc);
  if (!sc.st.curEvt && time > sc.st.nextEvt && !sc.st.sudden) trigEvt(sc, time);
  if (sc.st.curEvt === "METEOR RAIN") {
    if (!sc.st.nextMet || time > sc.st.nextMet) {
      spawnMeteor(sc);
      sc.st.nextMet = time + 500 + Math.random() * 400;
    }
  }
}

function trigEvt(sc, time) {
  const ei = Phaser.Math.Between(0, EVENTS.length - 1);
  const evt = EVENTS[ei];
  sc.st.curEvt = evt;
  sc.st.evtEnd = time + EVDUR;
  sc.st.nextEvt = time + EVDUR + EVINT;

  showEvtBanner(sc, evt, EV_COLS[ei]);

  if (evt === "NIGHT MODE")
    sc.lanes.forEach((l) => l.setFillStyle(0x000020, 0.55));

  sc.hud.evtTxt.setText(evt);
  sc.tweens.add({ targets: sc.hud.evtTxt, alpha: 1, duration: 300 });
}

function endEvt(sc) {
  const evt = sc.st.curEvt;
  sc.st.curEvt = null;
  if (evt === "NIGHT MODE") {
    sc.lanes.forEach((l) => l.setFillStyle(0x000000, 0.15));
    if (sc.obsSpr)
      sc.obsSpr.forEach((s) => {
        if (s.active) s.clearTint();
      });
  }
  sc.tweens.add({ targets: sc.hud.evtTxt, alpha: 0, duration: 500 });
}

// ─── ANIMATIONS ────────────────────────────────────────
function updateAnims(sc, time) {
  for (let i = 0; i < 4; i++) {
    const p = sc.st.players[i];
    if (!p.alive) continue;
    if (p.jumping) {
      sc.dinos[i].setTexture("dj");
    } else {
      const rate = Math.max(70, 200 - sc.st.spd * 0.3);
      if (time > p.animT) {
        p.frame = 1 - p.frame;
        p.animT = time + rate;
      }
      sc.dinos[i].setTexture(p.frame ? "dr2" : "dr1");
    }
  }
}

// ─── GROUND SCROLL ─────────────────────────────────────
function updateGnd(sc, dt, time) {
  const sm = sc.st.curEvt === "SPEED UP" ? 1.7 : 1;
  const scroll = sc.st.spd * sm * dt;
  for (let i = 0; i < 4; i++)
    if (sc.st.players[i].alive) sc.grounds[i].tilePositionX += scroll;

  // Speed lines during SPEED UP
  if (sc.st.curEvt === "SPEED UP" && Math.random() < 0.35) {
    const ly = LT + Math.random() * (LH * 4);
    const line = sc.add
      .rectangle(W + 20, ly, 50 + Math.random() * 80, 1, 0xffffff, 0.1)
      .setDepth(5);
    sc.tweens.add({
      targets: line,
      x: -100,
      duration: 180,
      onComplete: () => line.destroy(),
    });
  }
  // Wind particles
  if (sc.st.curEvt === "WIND STORM" && Math.random() < 0.5) {
    const ly = LT + Math.random() * (LH * 4);
    const dot = sc.add.circle(W + 10, ly, 2, 0x88aacc, 0.35).setDepth(5);
    sc.tweens.add({
      targets: dot,
      x: -20,
      y: ly + Math.random() * 20 - 10,
      duration: 400 + Math.random() * 250,
      onComplete: () => dot.destroy(),
    });
  }
}

// ─── HUD REFRESH ───────────────────────────────────────
function rfHUD(sc, time) {
  sc.hud.distTxt.setText(
    `${String(Math.floor(sc.st.dist / 10)).padStart(5, "0")}m`,
  );
  sc.hud.distTxt.setScale(1 + Math.sin(time * 0.005) * 0.02);

  if (sc.st.sudden) {
    const fl = Math.sin(time * 0.008) > 0;
    sc.hud.panels.forEach((p, i) => {
      if (sc.st.players[i].alive) p.hdr.setAlpha(fl ? 0.5 : 0.9);
    });
  }
}

// ─── AUDIO ─────────────────────────────────────────────
function gCtx(sc) {
  try {
    return sc.sound && sc.sound.context ? sc.sound.context : null;
  } catch (_) {
    return null;
  }
}

function sfx(sc, type) {
  try {
    const ctx = gCtx(sc);
    if (!ctx) return;
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    const t = ctx.currentTime;

    if (type === "jump") {
      o.type = "square";
      o.frequency.setValueAtTime(280, t);
      o.frequency.exponentialRampToValueAtTime(580, t + 0.1);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.start(t);
      o.stop(t + 0.12);
    } else if (type === "hit") {
      o.type = "sawtooth";
      o.frequency.setValueAtTime(400, t);
      o.frequency.exponentialRampToValueAtTime(50, t + 0.25);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.start(t);
      o.stop(t + 0.3);
    } else if (type === "ko") {
      o.type = "sawtooth";
      o.frequency.setValueAtTime(600, t);
      o.frequency.exponentialRampToValueAtTime(25, t + 0.6);
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      o.start(t);
      o.stop(t + 0.65);
      const o2 = ctx.createOscillator(),
        g2 = ctx.createGain();
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.type = "square";
      o2.frequency.setValueAtTime(100, t);
      o2.frequency.exponentialRampToValueAtTime(35, t + 0.4);
      g2.gain.setValueAtTime(0.18, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o2.start(t);
      o2.stop(t + 0.45);
    } else if (type === "click") {
      o.type = "square";
      o.frequency.setValueAtTime(1200, t);
      o.frequency.exponentialRampToValueAtTime(800, t + 0.03);
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      o.start(t);
      o.stop(t + 0.04);
    } else if (type === "select") {
      o.type = "square";
      o.frequency.setValueAtTime(600, t);
      o.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.start(t);
      o.stop(t + 0.1);
    } else if (type === "event") {
      o.type = "square";
      o.frequency.setValueAtTime(440, t);
      o.frequency.setValueAtTime(660, t + 0.1);
      o.frequency.setValueAtTime(880, t + 0.2);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.start(t);
      o.stop(t + 0.35);
    } else if (type === "victory") {
      o.type = "square";
      o.frequency.setValueAtTime(440, t);
      o.frequency.setValueAtTime(554, t + 0.15);
      o.frequency.setValueAtTime(660, t + 0.3);
      o.frequency.setValueAtTime(880, t + 0.45);
      g.gain.setValueAtTime(0.12, t);
      g.gain.setValueAtTime(0.12, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      o.start(t);
      o.stop(t + 0.7);
    }
  } catch (_) {}
}

function startMusic(sc) {
  if (sc.st.musicOn) return;
  sc.st.musicOn = true;
  try {
    const ctx = gCtx(sc);
    if (!ctx) return;
    const m = ctx.createGain();
    m.gain.value = 0.12;
    m.connect(ctx.destination);

    const dly = ctx.createDelay(2),
      dlf = ctx.createGain();
    dly.delayTime.value = 0.375;
    dlf.gain.value = 0.18;
    dly.connect(dlf);
    dlf.connect(dly);
    dlf.connect(m);

    const pf = ctx.createBiquadFilter();
    pf.type = "lowpass";
    pf.frequency.value = 550;
    pf.Q.value = 1.2;
    pf.connect(m);
    pf.connect(dly);

    const lfo = ctx.createOscillator(),
      lfg = ctx.createGain();
    lfo.frequency.value = 0.06;
    lfg.gain.value = 300;
    lfo.connect(lfg);
    lfg.connect(pf.frequency);
    lfo.start();

    [
      [82.41, 0, "sawtooth"],
      [82.41, 7, "sawtooth"],
      [98, -5, "triangle"],
      [123.47, 3, "triangle"],
      [146.83, -3, "triangle"],
    ].forEach(([f, d, tp]) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = tp;
      o.frequency.value = f;
      o.detune.value = d;
      g.gain.value = 0.018;
      o.connect(g);
      g.connect(pf);
      o.start();
    });

    const ARP = [
      164.81, 196, 246.94, 293.66, 329.63, 392, 329.63, 293.66, 246.94, 196,
    ];
    const ST = 0.19,
      AL = ARP.length * ST;
    function sA(t0) {
      ARP.forEach((f, i) => {
        const t = t0 + i * ST;
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.type = "square";
        o.frequency.value = f;
        o.connect(g);
        g.connect(m);
        g.connect(dly);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.035, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + ST * 0.6);
        o.start(t);
        o.stop(t + ST * 0.65);
      });
      sc.time.delayedCall((AL - 0.05) * 1000, () => sA(t0 + AL));
    }

    const BT = 0.43;
    function sB(t) {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 55;
      o.connect(g);
      g.connect(m);
      g.gain.setValueAtTime(0.26, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.start(t);
      o.stop(t + 0.28);
      sc.time.delayedCall(BT * 1000, () => sB(t + BT));
    }

    const TK = BT / 2;
    function sTk(t) {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = "square";
      o.frequency.value = 2800;
      o.connect(g);
      g.connect(m);
      g.gain.setValueAtTime(0.012, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
      o.start(t);
      o.stop(t + 0.02);
      sc.time.delayedCall(TK * 1000, () => sTk(t + TK));
    }

    const t0 = ctx.currentTime + 0.3;
    sA(t0);
    sB(t0);
    sTk(t0 + TK / 2);
  } catch (_) {}
}

// ─── STORAGE ───────────────────────────────────────────
function gS() {
  if (window.platanusArcadeStorage) return window.platanusArcadeStorage;
  return {
    async get(k) {
      try {
        const r = localStorage.getItem(k);
        return r === null
          ? { found: false, value: null }
          : { found: true, value: JSON.parse(r) };
      } catch {
        return { found: false, value: null };
      }
    },
    async set(k, v) {
      localStorage.setItem(k, JSON.stringify(v));
    },
  };
}
async function loadHS() {
  const r = await gS().get(STORE_KEY);
  if (!r.found || !Array.isArray(r.value)) return [];
  return r.value
    .filter((e) => e && typeof e.dist === "number")
    .slice(0, MAX_HS);
}
async function persistHS(entry) {
  const ex = await loadHS();
  const n = ex
    .concat(entry)
    .sort((a, b) => b.dist - a.dist)
    .slice(0, MAX_HS);
  await gS().set(STORE_KEY, n);
  return n;
}
