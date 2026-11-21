/**
 * Compartir y «jugar en el móvil»: un botón bajo el menú abre una ventana con el código QR del enlace del juego, un botón para
 * copiar el enlace y, si el navegador lo permite (móviles), el menú nativo de compartir.
 */
import { $ } from '../dom.js';
import { qrSvg } from '../qr.js';
import { sfx } from '../audio/sound.js';
import { t } from '../i18n.js';

const gameUrl = () => location.origin + location.pathname;
const shareData = () => ({
  title: 'DAWNSLIDE',
  text: t('Prueba DAWNSLIDE: un puzle de bloques con tres héroes y 21 niveles.'),
  url: gameUrl(),
});
const canShare = () => typeof navigator.share === 'function';
const touchFirst = () => matchMedia('(pointer: coarse)').matches;

function open() {
  const url = gameUrl();
  $('shareQr').innerHTML = qrSvg(url);
  $('shareUrl').textContent = url.replace(/^https?:\/\//, '');
  $('shareNative').hidden = !canShare();
  $('shareCopy').textContent = 'Copiar enlace';
  $('share').classList.add('show');
  $('shareCopy').focus();
}
const close = () => $('share').classList.remove('show');

async function copy() {
  const url = gameUrl();
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const box = document.createElement('textarea');
    box.value = url;
    document.body.appendChild(box);
    box.select();
    try {
      document.execCommand('copy');
    } catch {
      /* sin portapapeles */
    }
    box.remove();
  }
  $('shareCopy').textContent = '¡Enlace copiado!';
  sfx.hint();
  setTimeout(() => {
    $('shareCopy').textContent = 'Copiar enlace';
  }, 1800);
}

$('bShare').addEventListener('click', async () => {
  // En el móvil se abre directamente el menú de compartir; en el ordenador, el QR para jugar en el móvil
  if (canShare() && touchFirst()) {
    try {
      await navigator.share(shareData());
    } catch {
      /* cancelado */
    }
    return;
  }
  open();
});
$('shareClose').addEventListener('click', close);
$('share').addEventListener('click', (e) => {
  if (e.target === $('share')) close();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('share').classList.contains('show')) close();
});
$('shareCopy').addEventListener('click', copy);
$('shareNative').addEventListener('click', async () => {
  try {
    await navigator.share(shareData());
  } catch {
    /* cancelado */
  }
});
document.addEventListener('langchange', () => {
  if ($('share').classList.contains('show')) open();
});
