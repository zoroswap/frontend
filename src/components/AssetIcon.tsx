import { memo } from 'react';

interface AssetIconProps {
  symbol: string;
  size?: 'small' | 'normal' | number;
}

/** LP tokens (zBTC, zUSDC) use the same icon as the underlying token (BTC, USDC). */
const iconSymbol = (s: string) => (s.startsWith('z') ? s.slice(1) : s);

const AssetIcon = ({ symbol, size = 'normal' }: AssetIconProps) => {
  const iconSize = size === 'normal'
    ? 32
    : size === 'small'
    ? 24
    : typeof size === 'number'
    ? size
    : 32;
  const symbolForIcon = iconSymbol(symbol);
  return (
    <span
      className={`icon-any icon-${symbolForIcon} inline-block`}
      style={{ width: iconSize, height: iconSize }}
    >
    </span>
  );
};

export default memo(AssetIcon);
