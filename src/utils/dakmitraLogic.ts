export interface KeyboardMetricInput {
  vvHeight: number;
  vvWidth: number;
  vvTop: number;
  windowInnerHeight: number;
  layoutHeight: number;
  baselineHeight: number;
  lastWidth: number;
  activeIsEditable: boolean;
  wasKeyboardOpen: boolean;
}

export interface KeyboardMetricResult {
  baselineHeight: number;
  lastWidth: number;
  kbHeight: number;
  fixedOffset: number;
  isKeyboardOpen: boolean;
}

/**
 * Computes mobile soft-keyboard state without falsely dropping `keyboard-open`
 * when the user taps a button (e.g. "Save Changes") while the soft keyboard is
 * still physically open or animating closed, and without locking permanently
 * when a desktop window or Android split-screen shrinks.
 */
export function computeKeyboardMetrics(
  input: KeyboardMetricInput
): KeyboardMetricResult {
  let { baselineHeight, lastWidth } = input;
  const {
    vvHeight,
    vvWidth,
    vvTop,
    windowInnerHeight,
    layoutHeight,
    activeIsEditable,
    wasKeyboardOpen,
  } = input;

  // Reset baseline on rotation / width resize
  if (Math.abs(vvWidth - lastWidth) > 50) {
    lastWidth = vvWidth;
    baselineHeight = Math.max(windowInnerHeight, vvHeight);
  }

  // Update baseline both UPWARD and DOWNWARD when no input is focused and keyboard is not active
  if (!activeIsEditable && !wasKeyboardOpen) {
    if (vvHeight > baselineHeight) {
      baselineHeight = vvHeight;
    } else if (
      Math.abs(windowInnerHeight - vvHeight) < 20 &&
      vvHeight < baselineHeight
    ) {
      // Legitimate desktop resize or split-screen shrink
      baselineHeight = vvHeight;
    }
  } else if (!activeIsEditable && vvHeight > baselineHeight) {
    baselineHeight = vvHeight;
  }

  const kbHeight = Math.max(0, Math.round(baselineHeight - vvHeight));
  const refHeight = layoutHeight > 0 ? layoutHeight : windowInnerHeight;
  const fixedOffset = Math.max(0, Math.round(refHeight - vvHeight - vvTop));

  // Stay open while viewport is still physically shrunk (>110px) even after button blur
  const isKeyboardOpen = kbHeight > 110 && (activeIsEditable || wasKeyboardOpen);

  return {
    baselineHeight,
    lastWidth,
    kbHeight: isKeyboardOpen ? kbHeight : 0,
    fixedOffset: isKeyboardOpen ? fixedOffset : 0,
    isKeyboardOpen,
  };
}

export interface FloatingBarInput {
  targetRect: { left: number; top: number; bottom: number; width: number };
  barWidth: number;
  barHeight: number;
  vvTop: number;
  vvHeight: number;
  windowInnerWidth: number;
  appBarBottom: number;
  isKeyboardOpen: boolean;
  margin?: number;
}

/**
 * Positions the floating action bar relative to the tapped card/chip while
 * clamping strictly inside the visual viewport (below .app-bar and above
 * .bottom-nav or soft keyboard).
 */
export function computeFloatingBarPosition(input: FloatingBarInput): {
  left: number;
  top: number;
} {
  const margin = input.margin ?? 12;
  const {
    targetRect,
    barWidth,
    barHeight,
    vvTop,
    vvHeight,
    windowInnerWidth,
    appBarBottom,
    isKeyboardOpen,
  } = input;

  const rawLeft = targetRect.left + targetRect.width / 2 - barWidth / 2;
  const left = Math.max(
    margin,
    Math.min(rawLeft, Math.max(margin, windowInnerWidth - barWidth - margin))
  );

  const minTop = Math.max(vvTop + 12, appBarBottom + 8);
  const bottomReserve = isKeyboardOpen ? 12 : 90;
  const maxBottom = vvTop + vvHeight - bottomReserve;

  let top = targetRect.bottom + 8;
  if (top + barHeight > maxBottom) {
    top = targetRect.top - barHeight - 8;
  }

  const maxAllowedTop = Math.max(minTop, maxBottom - barHeight);
  top = Math.max(minTop, Math.min(top, maxAllowedTop));

  return { left: Math.round(left), top: Math.round(top) };
}

export function validatePinInput(pin: string): {
  valid: boolean;
  normalized: string;
} {
  const trimmed = String(pin ?? "").trim();
  if (trimmed === "") return { valid: true, normalized: "" };
  const isDigitsOnly = /^\d+$/.test(trimmed);
  return { valid: isDigitsOnly, normalized: trimmed };
}

export function resolveToastPlacement(opts: {
  isModalOpen: boolean;
  isKeyboardOpen: boolean;
}): "top" | "bottom" {
  return opts.isModalOpen || opts.isKeyboardOpen ? "top" : "bottom";
}
