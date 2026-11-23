/* Diccionario español → chino simplificado: se reparte por temas, igual que el inglés. */
import { ZH_UI } from './zh-ui.js';
import { ZH_GAME } from './zh-game.js';
import { ZH_STORY } from './zh-story.js';
import { ZH_SHOP } from './zh-shop.js';

export const ZH = { ...ZH_UI, ...ZH_GAME, ...ZH_STORY, ...ZH_SHOP };
