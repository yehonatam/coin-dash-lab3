/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

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
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
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
  setupStop() {}

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
      `${reason}\n${this.score} coins collected\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
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
  scene: CoinDash
});
