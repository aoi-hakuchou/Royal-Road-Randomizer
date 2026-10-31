/* ------------------- ENTRY POINT ------------------- */

import { loadTranslations, initLanguage, applyTranslations, toggleLanguage } from "./i18n.js";
import { renderHistory } from "./history.js";
import { initPlayerControls, markAppReady } from "./player.js";
import { initMusicPanel } from "./music.js";
import { buildBgCollage } from "./collage.js";

function onDomReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

async function init() {
  sessionStorage.clear();

  buildBgCollage();

  await loadTranslations();
  initLanguage();
  applyTranslations();
  renderHistory();

  document.getElementById("langToggle")?.addEventListener("click", toggleLanguage);

  initPlayerControls();
  initMusicPanel();

  // Tells the player module our setup is done; it starts the YouTube
  // player as soon as the YT API is also ready.
  markAppReady();
}

onDomReady(init);
