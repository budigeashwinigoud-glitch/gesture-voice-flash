// Web Speech API text-to-speech service

let lastSpoken = "";
let lastSpokeAt = 0;
const COOLDOWN_MS = 2000;

export function speak(text: string, force = false): void {
  if (!window.speechSynthesis) return;

  const now = Date.now();
  if (!force && text === lastSpoken && now - lastSpokeAt < COOLDOWN_MS) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  // Prefer English voice
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find((v) => v.lang.startsWith("en"));
  if (englishVoice) utterance.voice = englishVoice;

  window.speechSynthesis.speak(utterance);
  lastSpoken = text;
  lastSpokeAt = now;
}

export function replayLast(): void {
  if (lastSpoken) speak(lastSpoken, true);
}
