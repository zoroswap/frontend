import { TokenAutocomplete } from '@/components/TokenAutocomplete';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useBalance } from '@/hooks/useBalance';
import { type PositionAssetInput } from '@/lib/ZoroPositionNote';
import { type TokenConfig } from '@/providers/ZoroProvider';
import { Loader2, Plus, X } from 'lucide-react';
import { useCallback, useId, useMemo, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';

const validateValue = (val: bigint, max: bigint) => {
  return val > max
    ? 'Amount too large'
    : val === BigInt(0)
    ? "Amount can't be zero"
    : val <= 0
    ? 'Invalid value'
    : undefined;
};

interface AssetRowState {
  id: string;
  token?: TokenConfig;
  stringAmount: string;
  rawAmount: bigint;
  inputError?: string;
}

interface PositionAssetRowProps {
  row: AssetRowState;
  tokens: TokenConfig[];
  hasWallet: boolean;
  canRemove: boolean;
  disabledBech32s: ReadonlySet<string>;
  priorityBech32s?: ReadonlySet<string>;
  onTokenChange: (id: string, token: TokenConfig) => void;
  onAmountChange: (id: string, value: string, rawAmount: bigint, error?: string) => void;
  onRemove: (id: string) => void;
}

function PositionAssetRow({
  row,
  tokens,
  hasWallet,
  canRemove,
  disabledBech32s,
  priorityBech32s,
  onTokenChange,
  onAmountChange,
  onRemove,
}: PositionAssetRowProps) {
  const { balance, formattedLong: balanceFmt } = useBalance({ token: row.token });

  const onInputChange = useCallback((val: string) => {
    val = val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    const decimals = row.token?.decimals || 6;
    if (val === '' || val === '.') {
      onAmountChange(row.id, val, BigInt(0), undefined);
      return;
    }
    const newAmount = parseUnits(val, decimals);
    const validationError = validateValue(newAmount, balance ?? BigInt(0));
    onAmountChange(
      row.id,
      val,
      validationError ? BigInt(0) : newAmount,
      validationError,
    );
  }, [row.id, row.token?.decimals, balance, onAmountChange]);

  const handleMaxClick = useCallback(() => {
    if (!row.token) return;
    onInputChange(formatUnits(balance || BigInt(0), row.token.decimals));
  }, [onInputChange, balance, row.token]);

  return (
    <div className='rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4 space-y-3'>
      <div className='flex items-start justify-between gap-2'>
        <span className='text-xs text-muted-foreground pt-1'>Asset</span>
        {canRemove && (
          <button
            type='button'
            onClick={() => onRemove(row.id)}
            className='text-muted-foreground hover:text-foreground transition-colors'
            aria-label='Remove asset'
          >
            <X className='h-4 w-4' />
          </button>
        )}
      </div>

      <div className='flex items-center justify-between gap-3 sm:gap-4'>
        <Input
          value={row.stringAmount}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder='0'
          disabled={!row.token}
          aria-errormessage={row.inputError}
          className={`border-none bg-transparent text-3xl sm:text-4xl font-semibold text-foreground outline-none flex-1 p-0 h-auto focus-visible:ring-0 no-spinner placeholder:text-foreground/70 ${
            row.inputError ? 'text-orange-600 placeholder:text-destructive/50' : ''
          }`}
        />
        <div className='relative shrink-0'>
          <TokenAutocomplete
            tokens={tokens}
            value={row.token}
            onChange={(id) => {
              const next = tokens.find(t => t.faucetIdBech32 === id);
              if (next) onTokenChange(row.id, next);
            }}
            disabledBech32s={disabledBech32s}
            priorityBech32s={priorityBech32s}
          />
        </div>
      </div>

      {row.inputError && <p className='text-xs text-orange-600'>{row.inputError}</p>}

      {hasWallet && row.token && (
        <div className='flex items-center justify-end text-sm'>
          {balance === null
            ? (
              <span className='text-muted-foreground/60 text-xs inline-flex items-center gap-1.5 animate-pulse'>
                <span className='inline-block h-3 w-12 rounded bg-muted-foreground/15' />
                {row.token.symbol}
              </span>
            )
            : (
              <button
                type='button'
                onClick={handleMaxClick}
                disabled={balance === BigInt(0)}
                className={`transition-colors cursor-pointer ${
                  row.inputError
                    ? 'text-orange-600 hover:text-destructive'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {balanceFmt} {row.token.symbol}
              </button>
            )}
        </div>
      )}
    </div>
  );
}

interface PositionCreatePanelProps {
  tokens: TokenConfig[];
  defaultToken?: TokenConfig;
  isLoading: boolean;
  hasWallet: boolean;
  onCreate: (assets: PositionAssetInput[]) => void;
  priorityBech32s?: ReadonlySet<string>;
}

function createEmptyRow(defaultToken?: TokenConfig): AssetRowState {
  return {
    id: crypto.randomUUID(),
    token: defaultToken,
    stringAmount: '',
    rawAmount: BigInt(0),
  };
}

export function PositionCreatePanel({
  tokens,
  defaultToken,
  isLoading,
  hasWallet,
  onCreate,
  priorityBech32s,
}: PositionCreatePanelProps) {
  const rowIdPrefix = useId();
  const [rows, setRows] = useState<AssetRowState[]>(() => [
    createEmptyRow(defaultToken ?? tokens[0]),
  ]);

  const usedBech32s = useMemo(
    () => new Set(rows.map(r => r.token?.faucetIdBech32).filter(Boolean) as string[]),
    [rows],
  );

  const canAddAsset = usedBech32s.size < tokens.length;

  const nextAvailableToken = useMemo(
    () => tokens.find(t => !usedBech32s.has(t.faucetIdBech32)),
    [tokens, usedBech32s],
  );

  const handleTokenChange = useCallback((id: string, token: TokenConfig) => {
    setRows(prev => prev.map(row => (
      row.id === id
        ? { ...row, token, stringAmount: '', rawAmount: BigInt(0), inputError: undefined }
        : row
    )));
  }, []);

  const handleAmountChange = useCallback((
    id: string,
    stringAmount: string,
    rawAmount: bigint,
    inputError?: string,
  ) => {
    setRows(prev => prev.map(row => (
      row.id === id ? { ...row, stringAmount, rawAmount, inputError } : row
    )));
  }, []);

  const handleRemoveRow = useCallback((id: string) => {
    setRows(prev => prev.filter(row => row.id !== id));
  }, []);

  const handleAddRow = useCallback(() => {
    if (!nextAvailableToken) return;
    setRows(prev => [...prev, createEmptyRow(nextAvailableToken)]);
  }, [nextAvailableToken]);

  const validAssets = useMemo((): PositionAssetInput[] => {
    return rows
      .filter(row => row.token && row.rawAmount > BigInt(0) && !row.inputError)
      .map(row => ({ token: row.token!, amount: row.rawAmount }));
  }, [rows]);

  const createDisabled = isLoading
    || validAssets.length === 0
    || rows.some(row => !!row.inputError || (row.stringAmount !== '' && row.rawAmount <= BigInt(0)));

  const handleCreate = useCallback(() => {
    if (validAssets.length === 0) return;
    onCreate(validAssets);
  }, [validAssets, onCreate]);

  return (
    <Card className='border border-border/60 rounded-xl sm:rounded-2xl bg-card shadow-none'>
      <CardContent className='p-4 py-6 sm:p-8 space-y-4'>
        <div>
          <div className='text-xs sm:text-sm text-primary font-semibold mb-1'>
            Open Position
          </div>
          <p className='text-xs text-muted-foreground'>
            Choose tokens and amounts to open your first position.
          </p>
        </div>

        <div className='space-y-3'>
          {rows.map((row) => {
            const disabledBech32s = new Set(
              [...usedBech32s].filter(b => b !== row.token?.faucetIdBech32),
            );
            return (
              <PositionAssetRow
                key={`${rowIdPrefix}-${row.id}`}
                row={row}
                tokens={tokens}
                hasWallet={hasWallet}
                canRemove={rows.length > 1}
                disabledBech32s={disabledBech32s}
                priorityBech32s={priorityBech32s}
                onTokenChange={handleTokenChange}
                onAmountChange={handleAmountChange}
                onRemove={handleRemoveRow}
              />
            );
          })}
        </div>

        {canAddAsset && (
          <Button
            type='button'
            variant='outline'
            onClick={handleAddRow}
            disabled={isLoading}
            className='w-full h-10 rounded-xl text-sm font-medium'
          >
            <Plus className='h-4 w-4 mr-2' />
            Add asset
          </Button>
        )}

        <Button
          onClick={handleCreate}
          disabled={createDisabled}
          variant='outline'
          className='w-full h-14 sm:h-16 rounded-2xl font-bold text-base sm:text-xl transition-colors disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 border-primary'
        >
          {isLoading
            ? (
              <>
                <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                Opening Position...
              </>
            )
            : validAssets.length > 1
            ? `Open Position (${validAssets.length} assets)`
            : 'Open Position'}
        </Button>
      </CardContent>
    </Card>
  );
}
