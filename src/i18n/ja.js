/* Diccionario español → japonés: se reparte por temas, igual que el inglés. */
import { JA_UI } from './ja-ui.js';
import { JA_GAME } from './ja-game.js';
import { JA_STORY } from './ja-story.js';
import { JA_SHOP } from './ja-shop.js';

export const JA = { ...JA_UI, ...JA_GAME, ...JA_STORY, ...JA_SHOP };
