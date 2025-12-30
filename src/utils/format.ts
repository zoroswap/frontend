import { formatUnits } from 'viem';

export const formatAmount = (n: number) => {
  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: n >= 1000 ? 2 : 3,
  });
  return formatter.format(n);
};

export const formatTokenAmount = (
  { value, expo = 0, digits = 8 }: {
    value?: bigint | null;
    expo: number;
    digits?: number;
  },
) => {
  if (value == null) return undefined;
  return roundDown(formatUnits(BigInt(value), expo), digits);
};
export const prettyBigintFormat = (
  { value, expo }: { value?: bigint; expo: number },
) => {
  return preetyNumberFormat(Number(formatUnits(value ?? BigInt(0), expo)));
};

export const roundDown = (value = '0', digits = 4) =>
  Number(
    (new RegExp(`([-]*\\d+\\.\\d{${digits}})(\\d)`).exec(value))?.[1]
      ?? value.valueOf(),
  );

export const shortenNumber = (val: number, round = 1): [number, string] => {
  const isNegative = val < 0;
  if (isNegative ? val > -1000 : val < 1000) {
    return [Number(val.toFixed(round)), ''];
  }
  if (isNegative ? val > -1000000 : val < 1000000) {
    return [Number((val / 1000).toFixed(round)), 'k'];
  }
  if (isNegative ? val > -1000000000 : val < 1000000000) {
    return [Number((val / 1000000).toFixed(round)), 'm'];
  }
  return [Number((val / 1000000000).toFixed(round)), 'b'];
};

export const intlDefault = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 16,
});
export const preetyNumberFormat = (
  val?: number,
  round?: number,
): string => {
  if (val == null) return '';
  const rounding = round || (val > 1 ? 2 : val > 0.0001 ? 4 : 6);
  const response = shortenNumber(val, rounding);
  return `${intlDefault.format(response[0])}${response[1]}`;
};

export const formalNumberFormat = (
  val?: number,
  round?: number,
) => {
  if (val == null) return '';
  const rounding = round || (val > 1 ? 2 : val > 0.0001 ? 4 : 6);
  return (new Intl.NumberFormat('en-US', {
    maximumFractionDigits: rounding,
  })).format(val);
};

export const formalBigIntFormat = ({ val, expo, round }: {
  val?: bigint;
  expo: number;
  round?: number;
}) => {
  if (val == null) return '';
  const numval = Number(formatUnits(BigInt(val), expo));
  return formalNumberFormat(numval, round);
};

export const base64ToHex = (b64: string) =>
  Array.from(
    atob(
      b64
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(b64.length + (4 - (b64.length % 4)) % 4, '='),
    ),
  )
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

export const toDays = (milliseconds: number): number =>
  Math.floor(milliseconds / 86400000);
export const toHours = (milliseconds: number): number =>
  Math.floor(milliseconds / 3600000);
export const toMinutes = (milliseconds: number): number =>
  Math.floor(milliseconds / 60000);
export const secondsToMaxUnit = (milliseconds: number) => {
  const days = toDays(milliseconds);
  if (days > 0) return [days, 'days'];
  const hours = toHours(milliseconds);
  if (hours > 0) return [hours, 'hours'];
  const minutes = toMinutes(milliseconds);
  if (minutes > 0) return [minutes, 'minutes'];
  const seconds = milliseconds / 1000;
  return [seconds, 'seconds'];
};
