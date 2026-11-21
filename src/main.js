/**
 * Punto de entrada: carga los estilos, conecta los módulos y abre el menú.
 * La lógica pura (tableros, solver, dificultad, puntaje) vive en src/engine y src/game/heroes.js;
 * el resto son módulos de interfaz que se comunican mediante el estado compartido de src/state.js.
 */
import './i18n.js';
import './styles/01-base.css';
import './styles/02-hud.css';
import './styles/03-board.css';
import './styles/04-buttons-modals.css';
import './styles/05-layout.css';
import './styles/06-effects.css';
import './styles/07-menu-paths.css';
import './styles/08-pause-dialogs.css';
import './styles/09-map-journey.css';
import './styles/10-compact-screens.css';
import './styles/11-bonus.css';
import './styles/12-journal-art.css';
import './styles/13-route-hero.css';
import './styles/14-ink-theme.css';
import './styles/15-cover.css';
import './styles/16-result.css';
import './styles/17-shop.css';
import './styles/18-turns.css';
import './styles/19-specials.css';
import './styles/20-icons.css';
import './styles/21-minimal-hud.css';
import './styles/22-travel.css';
import './styles/23-powers.css';
import './styles/24-heroic-paths.css';
import './styles/25-seals.css';
import './styles/26-handmade.css';
import './styles/27-travel-feedback.css';
import './styles/30-curse.css';
import './styles/31-polish.css';
import './styles/32-menus.css';
import './styles/33-daily.css';
import './styles/34-menu-home.css';
import './styles/36-survival.css';
import './styles/37-achievements-shop.css';
import './styles/38-cosmetics-preview.css';
import './styles/39-menu-palette.css';
import './styles/40-piece-key-skins.css';
import './styles/41-fate-cards.css';
import './styles/35-lite.css'; // modo ligero automático (src/ui/perf.js): siempre la última
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
