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
  boost: {},

  // --- coin time bonus ---
  timeBonus: {},

  // --- smarter chasers ---
  chasers: {}
};
