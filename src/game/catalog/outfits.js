/** Atuendos de los héroes: catálogo por héroe y traje de serie (datos puros). */
import { RARITY_ORDER } from './rewards.js';

/**
 * Atuendos: 10 conjuntos de traje por héroe, 15 en todos (el primero es el de serie). Cada uno cambia al héroe en la aventura
 * (cuerpo entero) y en la selección de personaje (busto y pose). Las imágenes salen de scripts/slice-outfits.mjs.
 * El id interno de Juth sigue siendo `van`.
 */
/** [id, nombre, rareza]; se ordenan de más común a más raro (el de serie primero). La rareza sigue el diseño del traje. */
const outfits = (list) =>
  list
    .map(([id, name, rarity]) => ({ id, name, rarity }))
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
/** Traje de serie de cada héroe (el primero de su primera lámina): no hay que desbloquearlo. */
export const DEFAULT_OUTFIT = { lia: 'capitana', jean: 'vigia', van: 'escriba' };
export const OUTFITS = {
  lia: outfits([
    ['capitana', 'Capitana del alba', 'common'],
    ['aviadora', 'Aviadora de las cumbres', 'common'],
    ['arquera', 'Arquera del bosque', 'common'],
    ['cartografa', 'Cartógrafa', 'common'],
    ['alquimista', 'Alquimista errante', 'rare'],
    ['buscatesoros', 'Buscatesoros', 'rare'],
    ['ingeniera', 'Ingeniera de luz', 'rare'],
    ['mecanica', 'Mecánica de la forja', 'rare'],
    ['piloto', 'Piloto estelar', 'epic'],
    ['neon', 'Hackeadora neón', 'epic'],
    ['violeta', 'Hechicera violeta', 'epic'],
    ['brasas', 'Hechicera de las brasas', 'legendary'],
    ['vampira', 'Dama vampira', 'legendary'],
    ['lunar', 'Maga lunar', 'legendary'],
    ['guerrera', 'Guerrera carmesí', 'legendary'],
  ]),
  jean: outfits([
    ['vigia', 'Vigía del reloj', 'common'],
    ['aviador', 'Aviador de las cumbres', 'common'],
    ['nomada', 'Nómada del polvo', 'common'],
    ['astronomo', 'Astrónomo', 'common'],
    ['relojero', 'Relojero carmesí', 'rare'],
    ['erudito', 'Erudito', 'rare'],
    ['arqueologo', 'Arqueólogo', 'rare'],
    ['principe', 'Príncipe de las arenas', 'rare'],
    ['centurion', 'Centurión del sol', 'epic'],
    ['astrologo', 'Astrólogo estelar', 'epic'],
    ['sakura', 'Ninja de las flores', 'epic'],
    ['cibernetico', 'Sombra cibernética', 'epic'],
    ['oni', 'Máscara oni', 'legendary'],
    ['violeta', 'Hacker violeta', 'legendary'],
    ['shogun', 'Shogun dorado', 'legendary'],
  ]),
  van: outfits([
    ['escriba', 'Escriba astral', 'common'],
    ['navegante', 'Navegante', 'common'],
    ['maga', 'Maga de la pluma', 'common'],
    ['boticaria', 'Boticaria', 'common'],
    ['oraculo', 'Oráculo del laurel', 'rare'],
    ['carmesi', 'Hechicera carmesí', 'rare'],
    ['astral', 'Hechicera del cosmos', 'rare'],
    ['verde', 'Alquimista del veneno', 'rare'],
    ['cuervo', 'Doctora cuervo', 'epic'],
    ['dama', 'Dama carmesí', 'epic'],
    ['cuervera', 'Bruja de plumas', 'epic'],
    ['guardiana', 'Guardiana del tiempo', 'epic'],
    ['necromante', 'Reina necromante', 'legendary'],
    ['espinas', 'Reina de espinas', 'legendary'],
    ['cuervos', 'Señora de los cuervos', 'legendary'],
  ]),
};
