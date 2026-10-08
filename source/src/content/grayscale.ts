const STYLE_ID = 'earntime-grayscale';

/** Greys out the page for Unproductive Mode on a half-productive site. */
export function applyGrayscale(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = 'html { filter: grayscale(100%) !important; transition: filter .5s ease-in-out; }';
  (document.head || document.documentElement).append(style);
}
