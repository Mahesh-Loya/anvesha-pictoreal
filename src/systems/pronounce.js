// Spoken-only pronunciation fixes. Applied when generating the ElevenLabs
// clips AND in the browser-TTS fallback — never to what's shown on screen.
//   - "PICT"      → the college, said letter by letter (P. I. C. T.)
//   - "Pictoreal" → the Devanagari पिक्टोरियल, so ElevenLabs says "picto-ree-yal"
//     as one flowing word (not "Picto" + English "real")
// The manifest key stays hashed from the ORIGINAL text, so clips still match.
export function pronounce(text) {
  return String(text)
    .replace(/Pictoreal/gi, "पिक्टोरियल")
    .replace(/\bPICT\b/g, "Pee Eye See Tee");
}
