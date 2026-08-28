/* Journal v7: preserve direct-manipulation continuity across pointer and keyboard input. */
(() => {
  let activeMotionCard = null;
  let continuityUntil = 0;
  let clearTimer = 0;

  const clearSelection = () => window.getSelection()?.removeAllRanges();
  const focusCard = card => {
    if (!card || !document.contains(card)) return;
    clearSelection();
    if (document.activeElement !== card) card.focus({ preventScroll: true });
  };
  const beginContinuity = card => {
    clearTimeout(clearTimer);
    activeMotionCard = card;
    continuityUntil = Number.POSITIVE_INFINITY;
    focusCard(card);
  };
  const finishContinuity = () => {
    const card = activeMotionCard;
    if (!card) return;
    continuityUntil = performance.now() + 180;
    focusCard(card);
    clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => {
      if (activeMotionCard === card) activeMotionCard = null;
      continuityUntil = 0;
    }, 180);
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

  document.addEventListener('focusout', event => {
    const card = activeMotionCard;
    if (!card || event.target !== card) return;
    if (performance.now() > continuityUntil) return;
    focusCard(card);
  }, true);

  window.addEventListener('mouseup', event => {
    if (!activeMotionCard || event.button !== 0) return;
    if (event.cancelable) event.preventDefault();
    finishContinuity();
  }, true);

  document.addEventListener('click', event => {
    const card = activeMotionCard;
    if (!card || performance.now() > continuityUntil) return;
    const lab = card.closest('[data-motion-lab]');
    if (!lab || !(event.target instanceof Node) || !lab.contains(event.target)) return;
    if (event.cancelable) event.preventDefault();
    focusCard(card);
  }, true);

  window.addEventListener('pointerup', finishContinuity, true);
  window.addEventListener('pointercancel', finishContinuity, true);
})();
