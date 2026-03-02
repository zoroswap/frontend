import type { PoolInfo } from '@/hooks/usePoolsInfo';
import { ModalContext } from '@/providers/ModalContext';
import { useContext } from 'react';
import AssetIcon from './AssetIcon';
import { Button } from './ui/button';
import { X } from 'lucide-react';

const feeTierForSymbol = (symbol: string) =>
  /USDC|USDT|DAI|BUSD/i.test(symbol) ? '0.01%' : '0.30%';

export function SelectPoolModal({
  pools,
  onSelect,
  onClose,
}: {
  pools: PoolInfo[];
  onSelect: (pool: PoolInfo) => void;
  onClose: () => void;
}) {
  const { closeModal } = useContext(ModalContext);

  const handleSelect = (pool: PoolInfo) => {
    closeModal();
    onSelect(pool);
  };

  return (
    <div className="flex flex-col gap-4 max-h-[70vh]">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-cal-sans text-foreground">
          Choose a pool to add liquidity
        </h2>
        <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => { onClose(); closeModal(); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Select a pool to open the deposit modal and add liquidity.
      </p>
      <div className="overflow-auto space-y-2 pr-1">
        {pools.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No pools available.</p>
        ) : (
          pools.map((pool) => (
            <button
              key={pool.faucetIdBech32}
              type="button"
              onClick={() => handleSelect(pool)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 text-left transition-colors"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden border-2 border-card shrink-0">
                <AssetIcon symbol={pool.symbol} size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">{pool.name}</div>
                <div className="text-xs text-muted-foreground">{feeTierForSymbol(pool.symbol)}</div>
              </div>
              <span className="text-sm text-primary font-medium shrink-0">Add liquidity</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
