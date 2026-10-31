/* ------------------- BG COLLAGE ------------------- */

// Images live in BG-Collage/ and are named CBG_01, CBG_02, ... (no extension).
// Change TOTAL_IMAGES if you add or remove files.
const TOTAL_IMAGES = 42;
const DIGITS = String(TOTAL_IMAGES).length;

const BG_COLLAGE_IMAGES = Array.from(
  { length: TOTAL_IMAGES },
  (_, i) => `BG-Collage/CBG_${String(i + 1).padStart(DIGITS, "0")}`
);

const COLLAGE_COLS = 5;
const COLLAGE_ROWS = 3;
const COLLAGE_TOTAL = COLLAGE_COLS * COLLAGE_ROWS; // cells shown in the grid

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildBgCollage() {
  // Create the overlay div
  const overlay = document.createElement("div");
  overlay.id = "bgOverlay";
  document.body.prepend(overlay);

  // Create the grid container
  const grid = document.createElement("div");
  grid.id = "bgCollage";
  document.body.prepend(grid);

  if (BG_COLLAGE_IMAGES.length === 0) return;

  // Shuffle and tile images to fill every cell
  let pool = shuffleArray(BG_COLLAGE_IMAGES);
  while (pool.length < COLLAGE_TOTAL) {
    pool = pool.concat(shuffleArray(BG_COLLAGE_IMAGES));
  }

  pool.slice(0, COLLAGE_TOTAL).forEach(src => {
    const cell = document.createElement("div");
    cell.className = "collage-cell";

    const img = document.createElement("img");
    img.src = src + ".webp";
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.onerror = () => {
      img.onerror = null;
      img.src = src + ".jpg"; // fallback for very old browsers
    };

    cell.appendChild(img);
    grid.appendChild(cell);
  });
}
