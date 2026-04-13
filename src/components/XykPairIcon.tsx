import AssetIcon from '@/components/AssetIcon';

export interface XykPairIconProps {
  symbolA: string;
  symbolB: string;
  size?: number;
}

export function XykPairIcon({ symbolA, symbolB, size = 24 }: XykPairIconProps) {
  return (
    <span className='flex items-center'>
      <span
        className='inline-block'
        style={{ marginRight: -size / 4, zIndex: 1 }}
      >
        <AssetIcon symbol={symbolA} size={size} />
      </span>
      <span className='inline-block' style={{ zIndex: 0 }}>
        <AssetIcon symbol={symbolB} size={size} />
      </span>
    </span>
  );
}
