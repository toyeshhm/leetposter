/**
 * The languages that compile and run on the judge (POST /api/rooms/<code>/run) rather than in the browser, with
 * their ids on Judge0 CE 1.14 (GET /languages): JDK 17, GCC 14, Go 1.23, Rust 1.85.
 * No imports: the browser bundle reads this file too.
 */
export const JUDGED = ["java", "cpp", "go", "rust"] as const;
export type Judged = (typeof JUDGED)[number];

export const JUDGE0_LANGUAGE_IDS: Record<Judged, number> = { java: 91, cpp: 105, go: 107, rust: 108 };
