/** Cache the bytes, never a playing Image: preloading an animated WebP can otherwise leave it on its last frame. */
const gifs = new Map();
export const AWAKENING_MS = 1150;

export function preloadAwakening(hero) {
  if (hero === 'lia') return Promise.resolve(null);
  if (!gifs.has(hero)) {
    gifs.set(
      hero,
      fetch(`heroes/${hero}-power-anim.webp`)
        .then((response) => {
          if (!response.ok) throw new Error('No se pudo cargar la animación del héroe');
          return response.blob();
        })
        .catch((error) => {
          gifs.delete(hero);
          throw error;
        }),
    );
  }
  return gifs.get(hero);
}

/** A unique object URL gives every activation its own animation timeline, even with a warm/offline cache. */
export async function prepareAwakening(hero, reduced) {
  let objectURL;
  const img = document.createElement('img');
  img.id = 'powerPortrait';
  img.alt = '';
  try {
    if (!reduced) objectURL = URL.createObjectURL(await preloadAwakening(hero));
    const loaded = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    img.src = objectURL || `heroes/${hero}-power.webp`;
    await loaded;
    return {
      img,
      release: () => {
        if (objectURL) URL.revokeObjectURL(objectURL);
      },
    };
  } catch (error) {
    if (objectURL) URL.revokeObjectURL(objectURL);
    throw error;
  }
}
