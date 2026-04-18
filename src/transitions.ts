const supportsVT = 'startViewTransition' in document;

export function initTransitions(onPageShow?: () => void): void {
  // Undo the inline opacity:0 gate — triggers the CSS transition to full opacity
  requestAnimationFrame(() => { document.body.style.opacity = '1'; });

  // bfcache restore: browser may resurrect the page mid-state
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      document.body.style.opacity = '1';
      onPageShow?.();
    }
  });

  // JS fallback for browsers without native cross-document view transitions
  if (!supportsVT) {
    document.addEventListener('click', (e: MouseEvent) => {
      const link = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank') return;
      let url: URL;
      try { url = new URL(link.href); } catch { return; }
      if (url.origin !== location.origin) return;
      e.preventDefault();
      const dest = link.href;
      document.body.style.opacity = '0';
      setTimeout(() => { location.href = dest; }, 260);
    });
  }
}
