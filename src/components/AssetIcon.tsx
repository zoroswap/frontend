import { memo } from 'react';

interface AssetIconProps {
  symbol: string;
  size?: 'small' | 'normal' | number;
}

/** LP tokens (zBTC, zUSDC) use the same icon as the underlying token (BTC, USDC). */
const iconSymbol = (s: string) => (s.startsWith('z') ? s.slice(1) : s);

/** Symbols that have a dedicated icon (must match .icon-* classes in CSS). */
const SYMBOLS_WITH_ICONS = new Set(['BTC', 'USDC', 'ETH', 'ANY']);

const AssetIcon = ({ symbol, size = 'normal' }: AssetIconProps) => {
  const iconSize =
    size === 'normal'
      ? 32
      : size === 'small'
        ? 24
        : typeof size === 'number'
          ? size
          : 32;
  const symbolForIcon = iconSymbol(symbol);
  const hasIcon = SYMBOLS_WITH_ICONS.has(symbolForIcon.toUpperCase());

  if (hasIcon) {
    return (
      <span
        className={`icon-any icon-${symbolForIcon} inline-block flex-shrink-0`}
        style={{ width: iconSize, height: iconSize }}
      />
    );
  }

  const letter = (symbolForIcon || '?')[0].toUpperCase();
  return (
    <span
      className='inline-flex items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-foreground flex-shrink-0'
      style={{ width: iconSize, height: iconSize }}
    >
      {letter}
    </span>
  );
};

export default memo(AssetIcon);
