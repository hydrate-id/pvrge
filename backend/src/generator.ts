import type { Domain } from "./types";

const ADJECTIVES = [
  "amber", "swift", "silent", "brave", "bright", "calm", "clever", "cosmic",
  "crisp", "dawn", "eager", "gentle", "golden", "grand", "green", "happy",
  "iron", "jade", "keen", "lucky", "lunar", "noble", "polar", "proud",
  "pure", "quick", "quiet", "rapid", "ruby", "silver", "solar", "spark",
  "stellar", "storm", "tidy", "urban", "vivid", "warm", "wild", "wise"
];

const NOUNS = [
  "falcon", "river", "beacon", "breeze", "cedar", "comet", "cove", "crest",
  "crane", "drift", "echo", "ember", "fern", "finch", "fjord", "flame",
  "forest", "fox", "glade", "grove", "hawk", "haven", "island", "leaf",
  "lynx", "meadow", "moss", "nebula", "nexus", "oasis", "orbit", "otter",
  "peak", "pine", "quartz", "raven", "reef", "shadow", "spark", "spruce",
  "tide", "valley", "vortex", "wave", "wolf"
];

export function generateUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}${noun}${num}`;
}

export async function getRandomDomain(db: D1Database): Promise<string> {
  const result = await db.prepare("SELECT id FROM domains WHERE is_active = 1").all<Domain>();
  if (result.results && result.results.length > 0) {
    const idx = Math.floor(Math.random() * result.results.length);
    return result.results[idx].id;
  }
  return "pvrge.com";
}
