export interface XykPairIconProps {
  symbolA: string;
  symbolB: string;
  size?: number;
}

export function XykPairIcon({ symbolA, symbolB, size = 24 }: XykPairIconProps) {
  const letterA = (symbolA || '?')[0].toUpperCase();
  const letterB = (symbolB || '?')[0].toUpperCase();
  return (
    <span className='flex items-center'>
      <span
        className='inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-foreground'
        style={{ width: size, height: size, marginRight: -size / 4, zIndex: 1 }}
      >
        {letterA}
      </span>
      <span
        className='inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted/80 text-xs font-semibold text-foreground'
        style={{ width: size, height: size, zIndex: 0 }}
      >
        {letterB}
      </span>
    </span>
  );
}
