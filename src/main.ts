import './styles/global.css';
import { initTopoBackground } from './lib/topo';
import { initScramble } from './lib/scramble';

const canvas = document.getElementById('topo-bg') as HTMLCanvasElement;
initTopoBackground(canvas);

initScramble('.hero-nav a');
initScramble('.footer-links a');
