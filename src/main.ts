import './styles/global.css';
import { GrayScottScene } from './background';

new GrayScottScene(document.getElementById('bg') as HTMLCanvasElement).init();

const wrap = document.getElementById('linkedin-wrap')!;
const btn  = wrap.querySelector('.linkedin-btn')!;

btn.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = wrap.classList.toggle('qr-open');
  btn.setAttribute('aria-expanded', String(open));
});

document.addEventListener('click', () => {
  wrap.classList.remove('qr-open');
  btn.setAttribute('aria-expanded', 'false');
});
