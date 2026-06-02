import { TokenAutocomplete } from '@/components/TokenAutocomplete';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useBalance } from '@/hooks/useBalance';
import { type TokenConfig } from '@/providers/ZoroProvider';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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

interface PositionCreatePanelProps {
  tokens: TokenConfig[];
  defaultToken?: TokenConfig;
  isLoading: boolean;
  hasWallet: boolean;
  onCreate: (token: TokenConfig, amount: bigint) => void;
  priorityBech32s?: ReadonlySet<string>;
}

export function PositionCreatePanel({
  tokens,
  defaultToken,
  isLoading,
  hasWallet,
  onCreate,
  priorityBech32s,
}: PositionCreatePanelProps) {
  const [selectedToken, setSelectedToken] = useState<TokenConfig | undefined>(
    defaultToken ?? tokens[0],
  );

  useEffect(() => {
    if (!selectedToken && tokens.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedToken(defaultToken ?? tokens[0]);
    }
  }, [defaultToken, selectedToken, tokens]);

  const {
    balance,
    formattedLong: balanceFmt,
    refetch: refetchBalance,
  } = useBalance({ token: selectedToken });

  const [rawAmount, setRawAmount] = useState<bigint>(BigInt(0));
  const [stringAmount, setStringAmount] = useState<string>('');
  const [inputError, setInputError] = useState<string | undefined>(undefined);

  const onInputChange = useCallback((val: string) => {
    val = val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    const decimals = selectedToken?.decimals || 6;
    setStringAmount(val);
    if (val === '' || val === '.') {
      setInputError(undefined);
      setRawAmount(BigInt(0));
      return;
    }
    const newAmount = parseUnits(val, decimals);
    const validationError = validateValue(newAmount, balance ?? BigInt(0));
    if (validationError) {
      setInputError(validationError);
    } else {
      setInputError(undefined);
      setRawAmount(newAmount);
    }
  }, [selectedToken, balance]);

  const handleMaxClick = useCallback(() => {
    onInputChange(formatUnits(balance || BigInt(0), selectedToken?.decimals || 6));
  }, [onInputChange, balance, selectedToken?.decimals]);

  const handleCreate = useCallback(() => {
    if (!selectedToken || rawAmount <= BigInt(0)) return;
    onCreate(selectedToken, rawAmount);
    void refetchBalance();
  }, [selectedToken, rawAmount, onCreate, refetchBalance]);

  const createDisabled = isLoading || !selectedToken || stringAmount === ''
    || !!inputError || rawAmount <= BigInt(0);

  return (
    <Card className='border border-border/60 rounded-xl sm:rounded-2xl bg-card shadow-none'>
      <CardContent className='p-4 py-6 sm:p-8 space-y-4'>
        <div>
          <div className='text-xs sm:text-sm text-primary font-semibold mb-1'>
            Open Position
          </div>
          <p className='text-xs text-muted-foreground'>
            Deposit a token into a position note to enable position swaps.
          </p>
        </div>

        <div className='flex items-center justify-between gap-3 sm:gap-4'>
          <Input
            value={stringAmount}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder='0'
            aria-errormessage={inputError}
            className={`border-none bg-transparent text-4xl sm:text-6xl font-semibold text-foreground outline-none flex-1 p-0 h-auto focus-visible:ring-0 no-spinner placeholder:text-foreground/70 ${
              inputError ? 'text-orange-600 placeholder:text-destructive/50' : ''
            }`}
          />
          <div className='relative'>
            <TokenAutocomplete
              tokens={tokens}
              value={selectedToken}
              onChange={(id) => {
                const next = tokens.find(t => t.faucetIdBech32 === id);
                if (next) setSelectedToken(next);
              }}
              priorityBech32s={priorityBech32s}
            />
          </div>
        </div>

        {inputError && <p className='text-xs text-orange-600'>{inputError}</p>}

        {hasWallet && selectedToken && (
          <div className='flex items-center justify-end text-sm'>
            {balance === null
              ? (
                <span className='text-muted-foreground/60 text-xs inline-flex items-center gap-1.5 animate-pulse'>
                  <span className='inline-block h-3 w-12 rounded bg-muted-foreground/15' />
                  {selectedToken.symbol}
                </span>
              )
              : (
                <button
                  onClick={handleMaxClick}
                  disabled={balance === BigInt(0)}
                  className={`transition-colors cursor-pointer ${
                    inputError
                      ? 'text-orange-600 hover:text-destructive'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {balanceFmt} {selectedToken.symbol}
                </button>
              )}
          </div>
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
            : 'Open Position'}
        </Button>
      </CardContent>
    </Card>
  );
}
