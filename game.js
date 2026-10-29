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

  setupBoost() {}

  setupTimeBonus() {}

  setupChasers() {
    const c = COIN_DASH.chasers;
    this.chaserMode = 'chase';
    this.chaserModeMs = 0;
    this.chaserFacing = new Phaser.Math.Vector2(0, -1);
    const m = c.cornerMarginPx;
    const top = 44 + m;
    const corners = [
      new Phaser.Math.Vector2(COIN_DASH.width - m, top),
      new Phaser.Math.Vector2(m, top),
      new Phaser.Math.Vector2(m, COIN_DASH.height - m),
      new Phaser.Math.Vector2(COIN_DASH.width - m, COIN_DASH.height - m)
    ];
    // Personality by index: 0 Blinky, 1 Pinky, 2 Clyde, 3 Inky (any further drones repeat).
    this.drones.getChildren().forEach((drone, i) => {
      drone.personality = i % 4;
      drone.corner = corners[i % 4];
      drone.setFillStyle(c.tints[i % 4]);
    });
  }

  /** Called once per coin pickup, after the score is incremented. */
  onCoinCollected() {}

  /** Per-frame hooks, called only while `running`. `delta` is in milliseconds. */
  updateBoost(delta) {} // eslint-disable-line no-unused-vars

  updateChasers(delta) {
    const c = COIN_DASH.chasers;
    // Mode cycle runs on accumulated game time, so it freezes while paused.
    this.chaserModeMs += delta;
    const phaseMs = (this.chaserMode === 'chase' ? c.chaseSeconds : c.scatterSeconds) * 1000;
    if (this.chaserModeMs >= phaseMs) {
      this.chaserModeMs -= phaseMs;
      this.chaserMode = this.chaserMode === 'chase' ? 'scatter' : 'chase';
    }
    const player = this.player;
    if (player.body.velocity.lengthSq() > 1) {
      this.chaserFacing.copy(player.body.velocity).normalize();
    }
    const drones = this.drones.getChildren();
    const maxTurn = Phaser.Math.DegToRad(c.turnRateDegPerSec) * Math.min(delta, 100) / 1000;
    drones.forEach((drone) => {
      const target = this.chaserTarget(drone, drones[0]);
      this.steerChaser(drone, target, maxTurn);
    });
  }

  /** Point a drone is heading for, from its personality and the current mode. */
  chaserTarget(drone, blinky) {
    const c = COIN_DASH.chasers;
    const player = this.player;
    const facing = this.chaserFacing;
    if (this.chaserMode === 'scatter') return drone.corner;
    const target = new Phaser.Math.Vector2(player.x, player.y);
    if (drone.personality === 1) {
      target.add(facing.clone().scale(c.aheadPx));
    } else if (drone.personality === 2) {
      const near = Phaser.Math.Distance.Between(drone.x, drone.y, player.x, player.y) < c.clydeRadiusPx;
      if (near) return drone.corner;
    } else if (drone.personality === 3) {
      const pivot = target.clone().add(facing.clone().scale(c.inkyPivotPx));
      target.set(pivot.x * 2 - blinky.x, pivot.y * 2 - blinky.y);
    }
    // Keep aim points inside the arena so drones do not press against the walls.
    const m = c.cornerMarginPx;
    target.x = Phaser.Math.Clamp(target.x, m, COIN_DASH.width - m);
    target.y = Phaser.Math.Clamp(target.y, 44 + m, COIN_DASH.height - m);
    return target;
  }

  /** Turn the drone's velocity toward `target` by at most `maxTurn` radians, at a steady speed. */
  steerChaser(drone, target, maxTurn) {
    const body = drone.body;
    const speed = COIN_DASH.droneSpeed * COIN_DASH.chasers.speedMultiplier;
    const wanted = Math.atan2(target.y - drone.y, target.x - drone.x);
    let angle = wanted;
    if (body.velocity.lengthSq() > 1) {
      const current = Math.atan2(body.velocity.y, body.velocity.x);
      angle = current + Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(wanted - current), -maxTurn, maxTurn);
    }
    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    // Slide along a wall instead of pushing into it; in a corner, slide toward the target.
    const b = body.blocked;
    if ((b.left && vx < 0) || (b.right && vx > 0)) vx = 0;
    if ((b.up && vy < 0) || (b.down && vy > 0)) vy = 0;
    if (vx === 0 && vy === 0) {
      vx = (b.left || b.right) ? 0 : Math.sign(target.x - drone.x) * speed;
      vy = (b.up || b.down) ? 0 : Math.sign(target.y - drone.y) * speed;
      if (vx === 0 && vy === 0) vy = (b.up ? 1 : -1) * speed;
    } else {
      const scale = speed / Math.hypot(vx, vy);
      vx *= scale;
      vy *= scale;
    }
    body.setVelocity(vx, vy);
  }

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
