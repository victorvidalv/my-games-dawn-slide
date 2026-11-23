/* Diccionario español → inglés: se reparte por temas para mantenerlo ordenable. */
import { EN_UI } from './en-ui.js';
import { EN_GAME } from './en-game.js';
import { EN_STORY } from './en-story.js';
import { EN_LORE } from './en-lore.js';

export const EN = { ...EN_UI, ...EN_GAME, ...EN_STORY, ...EN_LORE };
