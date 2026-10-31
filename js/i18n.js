/* ------------------- TRANSLATION SYSTEM ------------------- */

const FALLBACK_TRANSLATIONS = {
  en: {
    randomButtonLoading: "Please wait for the player to load",
    randomButton: "Get a random song",
    autoplayOff: "⚪ Autoplay OFF",
    autoplayOn: "🟢 Autoplay ON"
  },
  ja: {}
};

let currentLang = "en";
let translations = null;

export function getLang() {
  return currentLang;
}

/** Look up a translation key in the current language. */
export function t(key, fallback = "") {
  return translations?.[currentLang]?.[key] || fallback;
}

export async function loadTranslations() {
  try {
    // Relative to the HTML page, not to this module
    const res = await fetch(`translations.json?t=${Date.now()}`, {
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    translations = await res.json();
  } catch (err) {
    console.error("Translation load error:", err);
    translations = FALLBACK_TRANSLATIONS;
    currentLang = "en";
  }
}

/** Restore the saved language (call after loadTranslations). */
export function initLanguage() {
  let saved = null;
  try {
    saved = localStorage.getItem("language");
  } catch (err) {
    console.warn("Local storage unavailable:", err);
  }
  if (saved && translations?.[saved]) {
    currentLang = saved;
  }
}

export function applyTranslations(lang = currentLang) {
  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    if (translations?.[lang]?.[key]) {
      element.textContent = translations[lang][key];
    }
  });

  document.querySelectorAll("[data-i18n-img]").forEach(img => {
    const key = img.dataset.i18nImg;
    if (translations?.[lang]?.[key]) {
      img.src = translations[lang][key];
    }
  });

  const langToggle = document.getElementById("langToggle");
  if (langToggle) {
    langToggle.textContent = lang === "en" ? "日本語" : "English";
  }

  // Keep the <html> lang attribute in sync for accessibility
  document.documentElement.lang = lang;
}

export function toggleLanguage() {
  currentLang = currentLang === "en" ? "ja" : "en";
  try {
    localStorage.setItem("language", currentLang);
  } catch (err) {
    console.warn("Could not save language:", err);
  }
  applyTranslations();
}
