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
  timeBonus: { everyCoins: 10, seconds: 10 },

  // --- smarter chasers ---
  chasers: {}
};
