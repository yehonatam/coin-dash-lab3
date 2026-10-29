// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a },
  // Survival mode: +speedStep (fraction of base speed) every speedEvery coins,
  // one more drone every addEvery coins, never more than maxDrones.
  survival: { speedEvery: 10, speedStep: 0.1, addEvery: 25, maxDrones: 6 },
  // One block per feature; each feature branch edits only its own block.

  // --- stop button ---
  stop: {
    buttonX: 738,
    buttonY: 22,
    buttonWidth: 100,
    buttonHeight: 30,
    buttonColor: 0x2a3a57,
    buttonHoverColor: 0x3d5580,
    stopLabel: 'Stop (P)',
    resumeLabel: 'Resume (P)',
    pausedText: 'PAUSED\nPress P to resume',
    dimAlpha: 0.7,
    depth: 10
  },

  // --- boost ---
  boost: {
    startCharge: 1,       // fraction of the bar filled at round start (0-1)
    chargeSeconds: 8,     // time to refill from empty to full
    drainSeconds: 2.5,    // time to drain from full to empty while boosting
    minToStart: 0.2,      // charge fraction needed to begin a boost
    speedMultiplier: 1.8,
    barWidth: 140,
    barX: 530,            // left edge of the bar; leaves room for the Stop button at the right
    colors: { back: 0x24334b, fill: 0x71e8ce, active: 0xffd166, low: 0xff657a }
  },

  // --- coin time bonus ---
  timeBonus: { everyCoins: 10, seconds: 10 },

  // --- smarter chasers ---
  chasers: {
    chaseSeconds: 15,     // length of each chase phase
    scatterSeconds: 5,    // length of each scatter phase (drones head for their corners)
    speedMultiplier: 1.1, // times droneSpeed; stays far below playerSpeed
    turnRateDegPerSec: 150, // max steering rate, so drones curve instead of snapping
    aheadPx: 160,         // Pinky: how far ahead of the player to aim (~4 tiles)
    inkyPivotPx: 80,      // Inky: pivot point ahead of the player (~2 tiles)
    clydeRadiusPx: 200,   // Clyde: retreats to its corner when closer than this (~8 tiles)
    cornerMarginPx: 50,   // scatter corners and targets stay this far inside the arena
    tints: [0xff657a, 0xff9ad5, 0xffa94d, 0x6fd8ff] // Blinky, Pinky, Clyde, Inky
  }
};
