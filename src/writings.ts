import './styles/global.css';
import { initScramble } from './lib/scramble';

// Post titles: hover on the <a>, scramble the inner <span>
initScramble('.post-entry', '.post-title');
initScramble('.footer-links a');
