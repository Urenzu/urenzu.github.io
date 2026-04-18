import './styles/global.css';
import { GrayScottScene } from './background';
import { initTransitions } from './transitions';

new GrayScottScene(document.getElementById('bg') as HTMLCanvasElement).init();

const wrap = document.getElementById('linkedin-wrap')!;
const btn  = wrap.querySelector('.linkedin-btn')!;

function closeQr(): void {
  wrap.classList.remove('qr-open');
  btn.setAttribute('aria-expanded', 'false');
}

btn.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = wrap.classList.toggle('qr-open');
  btn.setAttribute('aria-expanded', String(open));
});

document.addEventListener('click', closeQr);

initTransitions(closeQr);
