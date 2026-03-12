/**
 * XYK pool math matching on-chain logic (constant product, 30BP fee).
 * All amounts are in token/LP raw units (e.g. 10^decimals).
 */

/** Integer square root (floor). */
export function isqrt(n: bigint): bigint {
  if (n < 0n) throw new Error('isqrt: negative');
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

/**
 * Expected LP tokens received for depositing amount0 and amount1.
 * When total_lp === 0 (first deposit): isqrt(amount0 * amount1) - 100.
 * Otherwise: min(amount0 * total_lp / reserve0, amount1 * total_lp / reserve1).
 */
export function computeExpectedLp(
  amount0: bigint,
  amount1: bigint,
  reserve0: bigint,
  reserve1: bigint,
  totalLp: bigint,
): bigint {
  if (totalLp === 0n) {
    const product = amount0 * amount1;
    const root = isqrt(product);
    return root > 100n ? root - 100n : 0n;
  }
  const lp0 = (amount0 * totalLp) / reserve0;
  const lp1 = (amount1 * totalLp) / reserve1;
  return lp0 < lp1 ? lp0 : lp1;
}

/**
 * Expected token amounts received when burning lpAmount.
 * amount0 = lp_amount * reserve_0 / total_supply, amount1 = lp_amount * reserve_1 / total_supply.
 */
export function computeExpectedWithdraw(
  totalSupply: bigint,
  lpAmount: bigint,
  reserve0: bigint,
  reserve1: bigint,
): [bigint, bigint] {
  if (totalSupply === 0n) return [0n, 0n];
  const amount0 = (lpAmount * reserve0) / totalSupply;
  const amount1 = (lpAmount * reserve1) / totalSupply;
  return [amount0, amount1];
}

/**
 * Exact tokens for tokens: amount out for a given amount in (30BP fee).
 * get_amount_out(amount_in, reserve_in, reserve_out).
 */
export function getAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): bigint {
  const feeAdjusted = amountIn * 997n;
  const numerator = reserveOut * feeAdjusted;
  const denominator = reserveIn * 1000n + feeAdjusted;
  return numerator / denominator;
}

/**
 * Expected tokens for exact tokens (reverse quote): amount in needed to get amount_out.
 * get_amount_in(amount_out, reserve_in, reserve_out).
 */
export function getAmountIn(
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): bigint {
  const amountOutScaled = amountOut * 1000n;
  const numerator = reserveIn * amountOutScaled;
  const denominator = (reserveOut - amountOut) * 997n;
  if (denominator <= 0n) return 0n;
  return numerator / denominator;
}
