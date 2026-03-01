import './styles/global.css';
import { BackgroundEngine } from './lib/engine/index';
import { TopoScene } from './lib/scenes/topo';
import { WireframeScene } from './lib/scenes/wireframe';
import { MechHudScene } from './lib/scenes/mechhud';
import { initScramble } from './lib/scramble';

const canvas = document.getElementById('topo-bg') as HTMLCanvasElement;
const engine = new BackgroundEngine(canvas);

// Registry — add entries here to expose new background styles
const STYLES = [
  { id: 'topographic', label: 'topographic', load: () => engine.load(new TopoScene()) },
  { id: 'wireframe',   label: 'wireframe',   load: () => engine.load(new WireframeScene()) },
  { id: 'mechhud',     label: 'mech hud',    load: () => engine.load(new MechHudScene()) },
];
let activeStyle = STYLES[0].id;
STYLES[0].load();

// Build menu items
const menu = document.getElementById('bg-switcher-menu')!;
for (const style of STYLES) {
  const li = document.createElement('li');
  li.className = 'bg-switcher-item' + (style.id === activeStyle ? ' active' : '');
  li.setAttribute('role', 'option');
  li.dataset.id = style.id;
  li.textContent = style.label;
  li.addEventListener('click', () => {
    if (style.id === activeStyle) { closeMenu(); return; }
    activeStyle = style.id;
    style.load();
    menu.querySelectorAll<HTMLElement>('.bg-switcher-item').forEach(el =>
      el.classList.toggle('active', el.dataset.id === style.id)
    );
    closeMenu();
  });
  menu.appendChild(li);
}

// Toggle open/close
const btn = document.getElementById('bg-switcher-btn')!;
const openMenu  = () => { menu.classList.add('open');    btn.setAttribute('aria-expanded', 'true'); };
const closeMenu = () => { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
btn.addEventListener('click', e => { e.stopPropagation(); menu.classList.contains('open') ? closeMenu() : openMenu(); });
document.addEventListener('click', closeMenu);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

initScramble('.hero-nav a');
initScramble('.footer-links a');
