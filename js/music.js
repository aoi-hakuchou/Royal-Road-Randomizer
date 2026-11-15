/* ------------------- MUSIC PANEL ------------------- */
// Requires Tone.js to be loaded as a classic <script> before this module runs
// (it provides the global `Tone`).

/* ------------------- DATA ------------------- */

// map simple letters → real notes
const noteMap = {
  A: "A3",
  Bb: "A#3",
  B: "B3",
  C: "C4",
  Cs: "C#4",
  D: "D4",
  Eb: "D#4",
  E: "E4",
  F: "F4",
  Fs: "F#4",
  G: "G4",
  Gs: "G#4"
};

// chord formulas (intervals)
const chordMap = {
  "M": [0, 4, 7],
  "m": [0, 3, 7],
  "m7": [0, 3, 7, 10],
  "7": [0, 4, 7, 10],
  "M7": [0, 4, 7, 11],
  "dim7": [0, 3, 6, 9]
};

/* ------------------- STATE ------------------- */

let synth = null;
let audioStarted = false;

let activeChord = null;
let activeNotes = [];
let musicLogData = [];
let generateMode = false;
let generateBtn = null;

/* ------------------- HELPERS ------------------- */

// convert note like C4 → MIDI number
function noteToMidi(note) {
  return Tone.Frequency(note).toMidi();
}

// convert MIDI back to note
function midiToNote(midi) {
  return Tone.Frequency(midi, "midi").toNote();
}

function getMajorScale(rootMidi) {
  const intervals = [0, 2, 4, 5, 7, 9, 11]; // major scale
  return intervals.map(i => rootMidi + i);
}

function getNoteName(note) {
  return note.replace(/[0-9]/g, ""); // remove octave (C4 → C)
}

function formatNoteDisplay(note) {
  return note.replace("s", "#");
}

function stopTransport() {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  if (synth) synth.releaseAll();
}

function logMusicInput(text) {
  const log = document.getElementById("musicLog");
  if (!log) return;

  const item = document.createElement("div");
  item.className = "log-item";
  item.textContent = text;

  log.appendChild(item);

  if (log.children.length > 30) {
    log.removeChild(log.firstChild);
  }
}

/* ------------------- AUDIO ------------------- */

/* 🎧 Start audio on first interaction */
async function ensureAudio() {
  if (audioStarted) return;

  await Tone.start();

  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: {
      attack: 0.01,
      decay: 0.3,
      sustain: 0.2,
      release: 1.5
    },
    portamento: 0,
    volume: -8,
    detune: 0
  }).toDestination();

  audioStarted = true;
  console.log("Audio started");
}

/* ------------------- PLAYBACK ------------------- */

async function playMusicLog() {
  if (musicLogData.length === 0) return;

  await ensureAudio();
  stopTransport();

  musicLogData.forEach((entry, index) => {
    Tone.Transport.schedule(time => {
      synth.triggerAttackRelease(entry.notes, "4n", time);
    }, `0:${index}:0`); // quarter note steps
  });

  Tone.Transport.start();
}

/* ------------------- GENERATE CHORD SEQUENCE ------------------- */

async function generateChordSequence(rootNote) {
  await ensureAudio();

  const root = noteMap[rootNote];
  const rootMidi = noteToMidi(root);

  const scale = getMajorScale(rootMidi);
  const progressionDegrees = [3, 4, 2, 5]; // IV, V, iii, vi

  stopTransport();

  progressionDegrees.forEach((degree, index) => {
    const chordRoot = scale[degree];

    let chordIntervals;
    let chordName;

    if (degree === 2 || degree === 5) {
      // iii, vi → minor
      chordIntervals = [0, 3, 7];
      chordName = getNoteName(midiToNote(chordRoot)) + "m";
    } else {
      // IV, V → major
      chordIntervals = [0, 4, 7];
      chordName = getNoteName(midiToNote(chordRoot));
    }

    const notes = chordIntervals.map(i => midiToNote(chordRoot + i));

    Tone.Transport.schedule(time => {
      synth.triggerAttackRelease(notes, "4n", time);
    }, `0:${index}:0`);

    musicLogData.push({ type: "chord", notes });
    logMusicInput(chordName);
  });

  Tone.Transport.start();
}

/* ------------------- UI WIRING ------------------- */

function initChordButtons() {
  const buttons = document.querySelectorAll(".chord-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("active")) {
        btn.classList.remove("active");
        activeChord = null;
        return;
      }

      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeChord = btn.dataset.chord;
    });
  });
}

function initNoteButtons() {
  document.querySelectorAll(".note-btn").forEach(btn => {
    const base = btn.dataset.note;

    async function press() {
      await ensureAudio();

      if (generateMode) {
        generateMode = false;
        if (generateBtn) generateBtn.classList.remove("active");

        generateChordSequence(base);
        return; // stop normal note playback
      }

      const root = noteMap[base];

      if (!activeChord) {
        synth.triggerAttack(root);
        activeNotes = [root];

        logMusicInput(formatNoteDisplay(base));
        musicLogData.push({ type: "note", notes: [root] });
      } else {
        const rootMidi = noteToMidi(root);
        const intervals = chordMap[activeChord];

        activeNotes = intervals.map(i => midiToNote(rootMidi + i));
        synth.triggerAttack(activeNotes);

        logMusicInput(`${formatNoteDisplay(base)}${activeChord}`);
        musicLogData.push({ type: "chord", notes: activeNotes });
      }
    }

    function release() {
      if (!synth) return;
      synth.triggerRelease(activeNotes);
      activeNotes = [];
    }

    btn.addEventListener("mousedown", press);
    btn.addEventListener("mouseup", release);
    btn.addEventListener("mouseleave", release);

    // mobile
    btn.addEventListener("touchstart", e => {
      e.preventDefault();
      press();
    });
    btn.addEventListener("touchend", release);
  });
}

function initTransportButtons() {
  document.getElementById("playLogBtn")?.addEventListener("click", playMusicLog);

  document.getElementById("stopBtn")?.addEventListener("click", stopTransport);

  document.getElementById("clearLogBtn")?.addEventListener("click", () => {
    const log = document.getElementById("musicLog");
    if (log) log.innerHTML = "";

    sessionStorage.removeItem("musicLog");
    musicLogData = [];
  });

  generateBtn = document.getElementById("generateBtn");
  generateBtn?.addEventListener("click", () => {
    generateMode = !generateMode;
    generateBtn.classList.toggle("active", generateMode);
  });
}

function initBpmSlider() {
  const bpmSlider = document.getElementById("bpmSlider");
  const bpmValue = document.getElementById("bpmValue");
  if (!bpmSlider || !bpmValue) return;

  bpmValue.textContent = bpmSlider.value;

  bpmSlider.addEventListener("input", () => {
    const bpm = parseInt(bpmSlider.value, 10);
    bpmValue.textContent = bpm;
    Tone.Transport.bpm.rampTo(bpm, 0.1);
  });
}

/** Wire up the whole music panel. Call once the DOM is ready. */
export function initMusicPanel() {
  initChordButtons();
  initNoteButtons();
  initTransportButtons();
  initBpmSlider();
}
