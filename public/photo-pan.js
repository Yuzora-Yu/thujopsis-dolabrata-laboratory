// Enhance the shared image viewport; touch and keyboard scrolling remain native.
(() => {
 let activePan = null;
 const viewportFor = target => target instanceof Element
  ? target.closest('.image-dialog[open] .image-viewport') : null;
 function refresh(viewport) {
  if (!viewport) return;
  const image = viewport.querySelector('img');
  if (image) image.draggable = false;
  viewport.dataset.canPan = String(viewport.scrollWidth > viewport.clientWidth + 1
   || viewport.scrollHeight > viewport.clientHeight + 1);
 }
 function finish() {
  if (!activePan) return;
  const {viewport,pointerId} = activePan;
  activePan = null;
  viewport.classList.remove('is-photo-panning');
  if (viewport.hasPointerCapture(pointerId)) viewport.releasePointerCapture(pointerId);
 }
 document.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.pointerType === 'touch' || !event.isPrimary) return;
  const viewport = viewportFor(event.target);
  refresh(viewport);
  if (!viewport || viewport.dataset.canPan !== 'true') return;
  event.preventDefault();
  activePan = {viewport,pointerId:event.pointerId,x:event.clientX,y:event.clientY,
   left:viewport.scrollLeft,top:viewport.scrollTop};
  viewport.setPointerCapture(event.pointerId);
  viewport.focus({preventScroll:true});
  viewport.classList.add('is-photo-panning');
 });
 document.addEventListener('pointermove', event => {
  if (!activePan) { refresh(viewportFor(event.target)); return; }
  if (event.pointerId !== activePan.pointerId) return;
  const {viewport,x,y,left,top} = activePan;
  if (!viewport.isConnected || !viewport.closest('dialog').open || !event.buttons) {
   finish(); return;
  }
  viewport.scrollLeft = left + x - event.clientX;
  viewport.scrollTop = top + y - event.clientY;
  event.preventDefault();
 });
 for (const name of ['pointerup','pointercancel','lostpointercapture']) {
  document.addEventListener(name, event => {
   if (activePan?.pointerId === event.pointerId) finish();
  }, true);
 }
 document.addEventListener('close', finish, true);
 document.addEventListener('click', () => refresh(document.querySelector('.image-dialog[open] .image-viewport')));
 document.addEventListener('load', event => {
  const viewport = viewportFor(event.target);
  if (viewport) queueMicrotask(() => refresh(viewport));
 }, true);
})();
