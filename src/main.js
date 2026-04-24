import Reveal from 'reveal.js';
import 'reveal.js/dist/reveal.css';

const deck = new Reveal({
  hash: true,
  history: true,
  controls: true,
  controlsTutorial: false,
  progress: true,
  slideNumber: 'c/t',
  transition: 'slide',
  backgroundTransition: 'fade',
  center: false,
  width: 1440,
  height: 900,
  margin: 0.04,
  minScale: 0.2,
  maxScale: 2.0
});

deck.initialize();
