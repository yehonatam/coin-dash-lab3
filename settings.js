// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a },
  // One block per feature; each feature branch edits only its own block.

  // --- stop button ---
  stop: {},

  // --- boost ---
  boost: {},

  // --- coin time bonus ---
  timeBonus: {},

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
