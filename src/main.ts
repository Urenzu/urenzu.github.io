import './styles/global.css';
import { initTransitions, initTheme } from './transitions';

const qr = document.getElementById('qr-popup') as HTMLElement;

function closeQr(): void {
  try { (qr as any).hidePopover(); } catch {}
}

// Close before view-transition snapshot (capture phase = before browser processes the click)
document.addEventListener('click', (e: MouseEvent) => {
  const link = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null;
  if (!link || link.target === '_blank') return;
  closeQr();
}, true);

// Close before BFCache entry and on BFCache restore
window.addEventListener('pagehide', closeQr);
window.addEventListener('pageshow', closeQr);

initTransitions();
initTheme();
