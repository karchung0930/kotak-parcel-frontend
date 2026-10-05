/**
 * The scanner's beep. One AudioContext serves the whole visit, as the
 * readers do: a page opened again (Counter → order → Counter) reuses it
 * rather than adding another, which browsers limit.
 */
let audio: AudioContext | null = null;

/**
 * Call from the tap that opens the scanner: browsers only let a page start
 * sound in answer to a tap.
 */
export function unlockSound(): void {
    try {
        audio ??= new AudioContext();
        void audio.resume();
    } catch {
        audio = null;
    }
}

/** A short high beep and a buzz: a barcode's number opened. */
export function signalFound(): void {
    navigator.vibrate?.(60);

    if (!audio || audio.state !== 'running') {
        return;
    }

    const now = audio.currentTime;
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.frequency.value = 1320;
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    tone.connect(gain).connect(audio.destination);
    tone.start(now);
    tone.stop(now + 0.13);
}
