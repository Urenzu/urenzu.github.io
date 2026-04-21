import './styles/global.css';
import { initTransitions } from './transitions';

const qr = document.getElementById('qr-popup') as HTMLElement;

function closeQr(): void {
  try { (qr as any).hidePopover(); } catch {}
}

document.addEventListener('click', (e: MouseEvent) => {
  const link = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null;
  if (!link || link.target === '_blank') return;
  closeQr();
}, true);

window.addEventListener('pagehide', closeQr);
window.addEventListener('pageshow', closeQr);

// Writings in-page reveal
const writingsLink = document.getElementById('writings-link') as HTMLAnchorElement | null;
const writingsPanel = document.getElementById('writings-panel') as HTMLElement | null;
const pageHome = document.querySelector('.page-home') as HTMLElement | null;

if (writingsLink && writingsPanel && pageHome) {
  writingsLink.addEventListener('click', (e: MouseEvent) => {
    e.preventDefault();
    if (pageHome.classList.contains('expanded')) {
      writingsLink.classList.remove('active');
      const alreadyAtTop = window.scrollY === 0;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const collapse = () => {
        writingsPanel.classList.remove('open');
        writingsPanel.setAttribute('aria-hidden', 'true');
        pageHome.classList.remove('expanded');
      };
      if (alreadyAtTop) {
        collapse();
      } else {
        window.addEventListener('scrollend', collapse, { once: true });
        setTimeout(collapse, 600);
      }
      return;
    }
    pageHome.classList.add('expanded');
    writingsPanel.removeAttribute('aria-hidden');
    writingsPanel.classList.add('open');
    writingsLink.classList.add('active');
    requestAnimationFrame(() => {
      writingsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

initTransitions();
