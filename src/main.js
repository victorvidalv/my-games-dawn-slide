/**
 * Punto de entrada: carga los estilos, conecta los módulos y abre el menú.
 * La lógica pura (tableros, solver, dificultad, puntaje) vive en src/engine y src/game/heroes.js;
 * el resto son módulos de interfaz que se comunican mediante el estado compartido de src/state.js.
 */
import './i18n.js';
import './styles/layers.css';
import './styles/properties.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/world.css';
import './styles/components.css';
import './styles/hud.css';
import './styles/board.css';
import './styles/specials.css';
import './styles/powers.css';
import './styles/menus.css';
import './styles/fate.css';
import './styles/results.css';
import './styles/customize.css';
import './styles/skins.css';
import './styles/lite.css';
import './ui/transitions.js';
import './ui/achievements.js';
import { hooks } from './audio/sound.js';
import './ui/sound-button.js';
import { warmBanks } from './data/banks.js';
import { warmLevelWorker } from './game/level-builder.js';
import './ui/share.js';
import { initSaveTransfer } from './ui/save-transfer.js';
import { saveRun } from './game/session.js';
import { S, persist, store } from './state.js';
import { fitBoard } from './ui/board.js';
import { syncHero } from './ui/heroes.js';
import { openMenu } from './ui/menu.js';
import { hydrateIcons } from './ui/icons.js';
import './ui/controls.js';
import './pwa.js';

hydrateIcons(); // iconos propios en el HTML estático (botones, avisos)
// Evita zoom accidental por pellizco o doble toque en móvil, iPad y trackpad
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
}
document.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false },
);
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false },
);
document.addEventListener(
  'wheel',
  (e) => {
    if (e.ctrlKey) e.preventDefault();
  },
  { passive: false },
);
hooks.onSuspend = () => (S.run ? saveRun() : persist());
syncHero(store.run?.hero || store.heroChoice || 'lia');
fitBoard();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBoard);
openMenu();
initSaveTransfer();
warmBanks();
warmLevelWorker(); // los tableros se descargan en un momento libre, mientras ves el menú
