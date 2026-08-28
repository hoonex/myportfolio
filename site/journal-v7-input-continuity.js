/* Journal v7: preserve direct-manipulation continuity across pointer and keyboard input. */
(() => {
  let activeMotionCard = null;

  const clearSelection = () => window.getSelection()?.removeAllRanges();
  const restoreMotionFocus = () => {
    const card = activeMotionCard;
    activeMotionCard = null;
    if (!card) return;
    queueMicrotask(() => {
      if (!document.contains(card)) return;
      clearSelection();
      card.focus({ preventScroll: true });
    });
  };

  document.addEventListener('pointerdown', event => {
    const card = event.target instanceof Element ? event.target.closest('[data-motion-card]') : null;
    if (!card) return;
    activeMotionCard = card;
  }, true);

  window.addEventListener('mouseup', event => {
    if (!activeMotionCard || event.button !== 0) return;
    if (event.cancelable) event.preventDefault();
    restoreMotionFocus();
  });

  window.addEventListener('pointercancel', restoreMotionFocus);
})();
