/**
 * The 95 % Wilson score interval of a proportion: a rate is never published alone
 * (docs/tuteur.md § 7). Unlike the normal approximation, it
 * stays inside [0, 1] and keeps a width when nothing or everything was seen (Brown, Cai and
 * DasGupta, « Interval Estimation for a Binomial Proportion », Statistical Science, 2001).
 */

const Z_95 = 1.959963984540054;

export function wilson(successes: number, trials: number, z = Z_95): { low: number; high: number } {
  if (trials === 0) return { low: 0, high: 1 };
  const p = successes / trials;
  const z2 = z * z;
  const denominator = 1 + z2 / trials;
  const center = (p + z2 / (2 * trials)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / denominator;
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
}

/**
 * The two-sided exact McNemar test of paired verdicts: of the `b` pairs failed by one variant
 * only and the `c` failed by the other only, twice the smaller tail of Binomial(b + c, 1/2),
 * capped at one (McNemar, Psychometrika, 1947; the exact form, Fagerland, Lydersen and Laake,
 * BMC Medical Research Methodology, 2013). The pairs both variants agree on carry no evidence.
 */
export function mcnemarExact(b: number, c: number): number {
  const n = b + c;
  let tail = 0;
  let choose = 1;
  for (let i = 0; i <= Math.min(b, c); i++) {
    tail += choose;
    choose = (choose * (n - i)) / (i + 1);
  }
  return Math.min(1, (2 * tail) / 2 ** n);
}
