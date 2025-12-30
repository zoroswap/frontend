import { memo } from 'react';

interface AssetIconProps {
  symbol: string;
  size?: 'small' | 'normal' | number;
}

const AssetIcon = ({ symbol, size = 'normal' }: AssetIconProps) => {
  const iconSize = size === 'normal'
    ? 32
    : size === 'small'
    ? 24
    : typeof size === 'number'
    ? size
    : 32;
  return (
    <span
      className={`icon-any icon-${symbol} inline-block`}
      style={{ width: iconSize, height: iconSize }}
    >
    </span>
  );
};

export default memo(AssetIcon);
