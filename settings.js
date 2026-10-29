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
  stop: {},

  // --- boost ---
  boost: {},

  // --- coin time bonus ---
  timeBonus: {},

  // --- smarter chasers ---
  chasers: {}
};
