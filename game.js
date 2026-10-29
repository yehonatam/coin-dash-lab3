/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  init(data) { this.mode = (data && data.mode) || 'timer'; }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.paused = false;
    this.elapsedMs = 0;
    this.roundMs = c.roundSeconds * 1000;
    this.speedMultiplier = 1;
    this.hudItems = [];
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.onCoinCollected();
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!'));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart({ mode: this.mode }));
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
    // One setup method per feature; each feature branch fills in only its own.
    this.setupStop();
    this.setupBoost();
    this.setupTimeBonus();
    this.setupChasers();
  }

  // ---- Shared interface used by every feature ------------------------------------------
  // Game time only advances while running, so anything driven by `delta` (boost charge,
  // the round timer, chaser logic) freezes automatically while the game is paused.

  /** True while the round is live: not finished and not paused. */
  get running() { return !this.finished && !this.paused; }

  /** Pause (true) or resume (false). Freezes physics; update() stops advancing game time. */
  setPaused(paused) {
    if (this.finished || this.paused === paused) return;
    this.paused = paused;
    if (paused) this.physics.pause(); else this.physics.resume();
    this.events.emit('pause-changed', paused);
  }

  togglePause() { this.setPaused(!this.paused); }

  /** Milliseconds left in the round. */
  remainingMs() { return Math.max(0, this.roundMs - this.elapsedMs); }

  /** Extend (or shorten) the round by `ms` milliseconds. */
  addTime(ms) { this.roundMs += ms; }

  /** Register a function returning a short string to show in the HUD, e.g. () => `Boost: 80%`. */
  addHudItem(fn) { this.hudItems.push(fn); }

  // ---- Feature hooks (empty here; each feature branch implements its own) --------------
  setupStop() {
    const c = COIN_DASH;
    const s = c.stop;
    // Dimmed overlay below the header strip, shown only while paused.
    const overlay = this.add.container(0, 0).setDepth(s.depth).setVisible(false);
    overlay.add([
      this.add.rectangle(c.width / 2, 44 + (c.height - 44) / 2, c.width, c.height - 44, 0x0a1120, s.dimAlpha),
      this.add.text(c.width / 2, c.height / 2, s.pausedText,
        { font: '28px monospace', color: '#ffffff', align: 'center' }).setOrigin(0.5)
    ]);
    // Clickable button in the top-right of the HUD bar.
    const bg = this.add.rectangle(s.buttonX, s.buttonY, s.buttonWidth, s.buttonHeight, s.buttonColor)
      .setStrokeStyle(2, 0xffffff, 0.6).setDepth(s.depth + 1)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(s.buttonX, s.buttonY, s.stopLabel,
      { font: '16px monospace', color: '#ffffff' }).setOrigin(0.5).setDepth(s.depth + 1);
    const toggle = () => { if (!this.finished) this.togglePause(); };
    bg.on('pointerdown', toggle);
    bg.on('pointerover', () => bg.setFillStyle(s.buttonHoverColor));
    bg.on('pointerout', () => bg.setFillStyle(s.buttonColor));
    this.input.keyboard.on('keydown-P', toggle);
    // The scene's event emitter survives scene.restart(), so unhook our listener on shutdown.
    const onPauseChanged = (paused) => {
      overlay.setVisible(paused);
      label.setText(paused ? s.resumeLabel : s.stopLabel);
    };
    this.events.on('pause-changed', onPauseChanged);
    this.events.once('shutdown', () => this.events.off('pause-changed', onPauseChanged));
  }

  setupBoost() {
    const b = COIN_DASH.boost;
    this.boostCharge = b.startCharge;
    this.boosting = false;
    this.boostKeys = this.input.keyboard.addKeys('SPACE,SHIFT');
    const x = COIN_DASH.width - b.barWidth - 18;
    this.add.rectangle(x, 22, b.barWidth, 12, b.colors.back).setOrigin(0, 0.5);
    this.boostBar = this.add.rectangle(x, 22, b.barWidth, 12, b.colors.fill).setOrigin(0, 0.5);
    this.drawBoostBar();
  }

  setupTimeBonus() {}

  setupChasers() {}

  /** Called once per coin pickup, after the score is incremented. */
  onCoinCollected() {}

  /** Per-frame hooks, called only while `running`. `delta` is in milliseconds. */
  updateBoost(delta) {
    const b = COIN_DASH.boost;
    const wanted = this.boostKeys.SPACE.isDown || this.boostKeys.SHIFT.isDown;
    // Starting needs a minimum charge; once started it lasts until the bar is empty.
    if (!wanted) this.boosting = false;
    else if (!this.boosting && this.boostCharge >= b.minToStart) this.boosting = true;
    if (this.boosting) {
      this.boostCharge = Math.max(0, this.boostCharge - delta / (b.drainSeconds * 1000));
      if (this.boostCharge === 0) this.boosting = false;
    } else {
      this.boostCharge = Math.min(1, this.boostCharge + delta / (b.chargeSeconds * 1000));
    }
    this.speedMultiplier = this.boosting ? b.speedMultiplier : 1;
    this.drawBoostBar();
  }

  drawBoostBar() {
    const b = COIN_DASH.boost;
    this.boostBar.width = Math.max(0.01, b.barWidth * this.boostCharge);
    this.boostBar.setFillStyle(this.boosting ? b.colors.active
      : this.boostCharge < b.minToStart ? b.colors.low : b.colors.fill);
    this.player.setFillStyle(this.boosting ? b.colors.active : COIN_DASH.colors.player);
  }

  updateChasers(delta) {} // eslint-disable-line no-unused-vars

  // ---- Core game ----------------------------------------------------------------------
  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  update(time, delta) {
    if (!this.running) return;
    this.elapsedMs += delta;
    this.updatePlayer();
    this.updateBoost(delta);
    this.updateChasers(delta);
    const seconds = Math.ceil(this.remainingMs() / 1000);
    const parts = [`Coins: ${this.score}`, `Time: ${seconds}s`, ...this.hudItems.map((fn) => fn())];
    this.hud.setText(parts.filter(Boolean).join('    '));
    if (seconds === 0) this.finish('Time is up!');
  }

  updatePlayer() {
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const speed = COIN_DASH.playerSpeed * this.speedMultiplier;
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(speed);
    this.player.body.setVelocity(direction.x, direction.y);
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 150, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\nR: try again    ESC: menu`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
}
/** Home screen: pick a game mode. Add new modes to GAME_MODES. */
const GAME_MODES = [
  { id: 'timer', label: 'Timer', desc: 'Collect as many coins as you can before time runs out.', scene: 'CoinDash' },
  { id: 'survival', label: 'Survival', desc: 'Coming soon: last as long as you can.', scene: 'Survival' }
];

class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const c = COIN_DASH;
    this.selected = 0;
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.add.text(c.width / 2, 90, 'COIN DASH', { font: 'bold 48px monospace', color: '#71e8ce' }).setOrigin(0.5);
    this.add.text(c.width / 2, 140, 'Choose a game mode', { font: '18px monospace', color: '#9fb3cc' }).setOrigin(0.5);
    this.items = GAME_MODES.map((mode, i) => {
      const text = this.add.text(c.width / 2, 220 + i * 70, mode.label,
        { font: '28px monospace', color: '#ffffff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      text.on('pointerover', () => this.select(i));
      text.on('pointerdown', () => this.start(i));
      return text;
    });
    this.desc = this.add.text(c.width / 2, c.height - 70, '',
      { font: '16px monospace', color: '#9fb3cc' }).setOrigin(0.5);
    this.add.text(c.width / 2, c.height - 30, 'Up/Down or W/S to choose · Enter/Space to play',
      { font: '14px monospace', color: '#5d7190' }).setOrigin(0.5);
    const kb = this.input.keyboard;
    kb.on('keydown-UP', () => this.select(this.selected - 1));
    kb.on('keydown-W', () => this.select(this.selected - 1));
    kb.on('keydown-DOWN', () => this.select(this.selected + 1));
    kb.on('keydown-S', () => this.select(this.selected + 1));
    kb.on('keydown-ENTER', () => this.start(this.selected));
    kb.on('keydown-SPACE', () => this.start(this.selected));
    this.select(0);
  }

  select(i) {
    this.selected = Phaser.Math.Wrap(i, 0, GAME_MODES.length);
    this.items.forEach((t, n) => {
      const on = n === this.selected;
      t.setText(`${on ? '> ' : '  '}${GAME_MODES[n].label}${on ? ' <' : '  '}`);
      t.setColor(on ? '#ffd166' : '#ffffff');
    });
    this.desc.setText(GAME_MODES[this.selected].desc);
  }

  start(i) {
    const mode = GAME_MODES[i];
    this.scene.start(mode.scene, { mode: mode.id });
  }
}

/** Survival mode skeleton: to be developed. Receives { mode: 'survival' } from the menu. */
class SurvivalScene extends Phaser.Scene {
  constructor() { super('Survival'); }

  create() {
    const c = COIN_DASH;
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.add.text(c.width / 2, c.height / 2, 'SURVIVAL\n\nWork in progress\n\nESC: menu',
      { font: '24px monospace', color: '#ffffff', align: 'center' }).setOrigin(0.5);
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
  }
}

window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: [MenuScene, CoinDash, SurvivalScene]
});
