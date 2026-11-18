import { $ } from '../dom.js';
import { exportSaveLink, readSaveHash, readSaveLink } from '../game/save-transfer.js';
import { qrSvg } from '../qr.js';
import { importProgress, S, store } from '../state.js';
import { applyLook } from './achievements.js';
import { openMenu } from './menu.js';

const dialog = $('saveTransfer');
const exportPanel = $('transferExport');
const importPanel = $('transferImport');
const linkField = $('transferLink');
const pasteField = $('transferPaste');
const confirmPanel = $('transferConfirm');
const status = $('transferStatus');
let pending = null;

const isPlaying = () => Boolean(S.run || S.busy);
const clearHash = (hash) => {
  if (hash && location.hash === hash) history.replaceState(history.state, '', location.pathname + location.search);
};

function setView(view) {
  exportPanel.hidden = view !== 'export';
  importPanel.hidden = view !== 'import';
  confirmPanel.hidden = view !== 'confirm';
  status.textContent = '';
  if (!dialog.open) dialog.showModal();
}

function showExport() {
  pending = null;
  linkField.hidden = true;
  setView('export');
  try {
    linkField.value = exportSaveLink(store);
    $('transferQr').innerHTML = qrSvg(linkField.value);
    $('transferCopy').disabled = false;
  } catch {
    $('transferQr').replaceChildren();
    $('transferCopy').disabled = true;
    status.textContent = 'No se pudo crear un enlace para esta partida.';
  }
  $('transferCopy').focus();
}

function showImport() {
  pending = null;
  setView('import');
  pasteField.focus();
}

function attemptImport(save, hash, replaceRun = false) {
  if (isPlaying()) {
    setView('status');
    status.textContent = 'Guarda y sal de la partida antes de importar.';
    return;
  }

  const outcome = importProgress(save, { replaceRun });
  if (outcome === 'confirm') {
    pending = { save, hash };
    setView('confirm');
    $('transferKeep').focus();
    return;
  }

  pending = null;
  setView('status');
  if (outcome === 'error') {
    status.textContent = 'No se pudo guardar el progreso en este dispositivo.';
    return;
  }
  clearHash(hash);
  pasteField.value = '';
  applyLook();
  openMenu();
  status.textContent = 'Progreso importado.';
  $('transferClose').focus();
}

function importFromHash() {
  const { hash } = location;
  if (!hash.startsWith('#s=') || isPlaying()) return false;
  let save;
  try {
    save = readSaveHash(hash);
  } catch {
    clearHash(hash);
    setView('status');
    status.textContent = 'El enlace de partida no es válido o pertenece a otra versión.';
    return true;
  }
  attemptImport(save, hash);
  return true;
}

export function initSaveTransfer() {
  importFromHash();
  window.addEventListener('hashchange', importFromHash);
}

$('bTransfer').onclick = () => { if (!importFromHash()) showExport(); };
$('transferOpenImport').onclick = showImport;
$('transferBack').onclick = showExport;
$('transferClose').onclick = () => dialog.close();
$('transferKeep').onclick = () => dialog.close();
$('transferReplace').onclick = () => {
  if (pending) attemptImport(pending.save, pending.hash, true);
};
dialog.addEventListener('close', () => {
  clearHash(pending?.hash);
  pending = null;
  pasteField.value = '';
  $('bTransfer').focus();
});
importPanel.addEventListener('submit', (event) => {
  event.preventDefault();
  let save;
  try {
    save = readSaveLink(pasteField.value);
  } catch {
    status.textContent = 'El enlace de partida no es válido o pertenece a otra versión.';
    pasteField.focus();
    return;
  }
  attemptImport(save);
});
$('transferCopy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(linkField.value);
    status.textContent = '¡Enlace copiado!';
  } catch {
    linkField.hidden = false;
    linkField.focus();
    linkField.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { /* ofrecer selección manual */ }
    status.textContent = copied ? '¡Enlace copiado!' : 'Copia el enlace seleccionado.';
  }
};
