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

// Bio expand
const expandBtn = document.getElementById('hero-expand') as HTMLButtonElement | null;
const heroBio = document.getElementById('hero-bio') as HTMLElement | null;

if (expandBtn && heroBio) {
  expandBtn.addEventListener('click', () => {
    const isOpen = heroBio.classList.contains('open');
    if (isOpen) {
      heroBio.style.maxHeight = '0';
      heroBio.classList.remove('open');
      expandBtn.classList.remove('open');
    } else {
      heroBio.style.maxHeight = heroBio.scrollHeight + 'px';
      heroBio.classList.add('open');
      expandBtn.classList.add('open');
    }
  });
}

initTransitions();
initTheme();
