/* Journal v7: preserve direct-manipulation continuity across pointer and keyboard input. */
(() => {
  let activeMotionCard = null;
  let clearTimer = 0;
  let focusFrame = 0;

  const clearSelection = () => window.getSelection()?.removeAllRanges();
  const focusCard = card => {
    if (!card || !document.contains(card)) return;
    clearSelection();
    if (document.activeElement !== card) card.focus({ preventScroll: true });
  };
  const stabilizeFocus = card => {
    focusCard(card);
    queueMicrotask(() => focusCard(card));
    cancelAnimationFrame(focusFrame);
    focusFrame = requestAnimationFrame(() => focusCard(card));
    window.setTimeout(() => focusCard(card), 0);
  };
  const beginContinuity = card => {
    clearTimeout(clearTimer);
    activeMotionCard = card;
    stabilizeFocus(card);
  };
  const finishContinuity = () => {
    const card = activeMotionCard;
    if (!card) return;
    stabilizeFocus(card);
    clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => {
      if (activeMotionCard === card) activeMotionCard = null;
    }, 220);
  };

  document.addEventListener('pointerdown', event => {
    const card = event.target instanceof Element ? event.target.closest('[data-motion-card]') : null;
    if (!card) return;
    beginContinuity(card);
  }, true);

  document.addEventListener('mousedown', event => {
    const card = event.target instanceof Element ? event.target.closest('[data-motion-card]') : null;
    if (!card || event.button !== 0) return;
    if (event.cancelable) event.preventDefault();
    beginContinuity(card);
  }, true);

  window.addEventListener('pointermove', event => {
    if (!activeMotionCard || !(event.buttons & 1)) return;
    focusCard(activeMotionCard);
  }, true);

  window.addEventListener('pointerup', finishContinuity, true);
  window.addEventListener('pointercancel', finishContinuity, true);
})();
