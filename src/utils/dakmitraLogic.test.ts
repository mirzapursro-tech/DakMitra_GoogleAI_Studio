import test from "node:test";
import assert from "node:assert/strict";
import {
  computeKeyboardMetrics,
  computeFloatingBarPosition,
  validatePinInput,
  resolveToastPlacement,
} from "./dakmitraLogic";

test("keyboard stays open after Save button blurs input while viewport is still shrunk", () => {
  // Keyboard opened while editing input
  const opened = computeKeyboardMetrics({
    vvHeight: 480,
    vvWidth: 390,
    vvTop: 0,
    windowInnerHeight: 844,
    layoutHeight: 844,
    baselineHeight: 844,
    lastWidth: 390,
    activeIsEditable: true,
    wasKeyboardOpen: false,
  });
  assert.equal(opened.isKeyboardOpen, true);
  assert.equal(opened.kbHeight, 364);
  assert.equal(opened.fixedOffset, 364);

  // User taps Save Changes -> input blurs (activeIsEditable = false), keyboard still open
  const afterTapSave = computeKeyboardMetrics({
    vvHeight: 480,
    vvWidth: 390,
    vvTop: 0,
    windowInnerHeight: 844,
    layoutHeight: 844,
    baselineHeight: opened.baselineHeight,
    lastWidth: 390,
    activeIsEditable: false,
    wasKeyboardOpen: opened.isKeyboardOpen,
  });
  assert.equal(afterTapSave.isKeyboardOpen, true);
  assert.equal(afterTapSave.kbHeight, 364);

  // Once OS keyboard actually dismisses -> keyboard-open turns off cleanly
  const dismissed = computeKeyboardMetrics({
    vvHeight: 844,
    vvWidth: 390,
    vvTop: 0,
    windowInnerHeight: 844,
    layoutHeight: 844,
    baselineHeight: opened.baselineHeight,
    lastWidth: 390,
    activeIsEditable: false,
    wasKeyboardOpen: afterTapSave.isKeyboardOpen,
  });
  assert.equal(dismissed.isKeyboardOpen, false);
  assert.equal(dismissed.kbHeight, 0);
});

test("baselineHeight adapts downward on desktop resize or split-screen", () => {
  const shrunk = computeKeyboardMetrics({
    vvHeight: 600,
    vvWidth: 1024,
    vvTop: 0,
    windowInnerHeight: 600,
    layoutHeight: 600,
    baselineHeight: 900,
    lastWidth: 1024,
    activeIsEditable: false,
    wasKeyboardOpen: false,
  });
  assert.equal(shrunk.baselineHeight, 600);
  assert.equal(shrunk.isKeyboardOpen, false);

  // Focusing input after desktop shrink should NOT falsely trigger keyboard-open
  const focused = computeKeyboardMetrics({
    vvHeight: 600,
    vvWidth: 1024,
    vvTop: 0,
    windowInnerHeight: 600,
    layoutHeight: 600,
    baselineHeight: shrunk.baselineHeight,
    lastWidth: 1024,
    activeIsEditable: true,
    wasKeyboardOpen: false,
  });
  assert.equal(focused.isKeyboardOpen, false);
});

test("floating bar never spawns behind app-bar or off-screen when flipped upward", () => {
  const pos = computeFloatingBarPosition({
    targetRect: { left: 20, top: 80, bottom: 780, width: 350 },
    barWidth: 320,
    barHeight: 56,
    vvTop: 0,
    vvHeight: 844,
    windowInnerWidth: 390,
    appBarBottom: 68,
    isKeyboardOpen: false,
  });
  assert.ok(pos.top >= 76, `Expected top >= 76 (below app-bar), got ${pos.top}`);
  assert.ok(pos.left >= 12);
});

test("floating bar stays above open keyboard", () => {
  const pos = computeFloatingBarPosition({
    targetRect: { left: 20, top: 410, bottom: 470, width: 350 },
    barWidth: 320,
    barHeight: 56,
    vvTop: 0,
    vvHeight: 480,
    windowInnerWidth: 390,
    appBarBottom: 68,
    isKeyboardOpen: true,
  });
  assert.ok(pos.top + 56 <= 468, `Expected bar bottom <= 468, got ${pos.top + 56}`);
});

test("PIN validation accepts empty or digits only and rejects spaces/letters", () => {
  assert.deepEqual(validatePinInput(""), { valid: true, normalized: "" });
  assert.deepEqual(validatePinInput(" 231305 "), {
    valid: true,
    normalized: "231305",
  });
  assert.equal(validatePinInput("231 305").valid, false);
  assert.equal(validatePinInput("abc").valid, false);
});

test("toast anchors to top whenever modal or keyboard is active", () => {
  assert.equal(
    resolveToastPlacement({ isModalOpen: true, isKeyboardOpen: false }),
    "top"
  );
  assert.equal(
    resolveToastPlacement({ isModalOpen: false, isKeyboardOpen: true }),
    "top"
  );
  assert.equal(
    resolveToastPlacement({ isModalOpen: false, isKeyboardOpen: false }),
    "bottom"
  );
});
