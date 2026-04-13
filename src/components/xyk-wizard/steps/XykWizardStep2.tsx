import { fullNumberBigintFormat } from '@/lib/format';
import { accountIdToBech32 } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { TokenInput } from '../TokenInput';
import { type XykStepProps } from '../XykWizard';

const PERCENTAGES = [25, 50, 75, 100] as const;

const XykStep2 = (
  { tokensWithBalance, tokenMetadata, form, setForm }: XykStepProps,
) => {
  const tokenA = useMemo(() => {
    return tokenMetadata[form.tokenA ? accountIdToBech32(form.tokenA) : ''];
  }, [form.tokenA, tokenMetadata]);
  const tokenB = useMemo(() => {
    return tokenMetadata[form.tokenB ? accountIdToBech32(form.tokenB) : ''];
  }, [form.tokenB, tokenMetadata]);

  const [amountAStr, setAmountAStr] = useState('');
  const [amountBStr, setAmountBStr] = useState('');

  useEffect(() => {
    if (tokenA) {
      setAmountAStr(
        form.amountA != null ? formatUnits(form.amountA, tokenA.decimals) : '',
      );
    }
  }, [tokenA, form.amountA]);
  useEffect(() => {
    if (tokenB) {
      setAmountBStr(
        form.amountB != null ? formatUnits(form.amountB, tokenB.decimals) : '',
      );
    }
  }, [tokenB, form.amountB]);

  const setAmountA = useCallback(
    (raw: string) => {
      setAmountAStr(raw);
      if (raw === '') {
        setForm({ ...form, amountA: undefined });
        return;
      }
      if (tokenA) {
        try {
          const val = parseUnits(raw, tokenA.decimals);
          setForm({ ...form, amountA: val });
        } catch {
          setForm({ ...form, amountA: undefined });
        }
      }
    },
    [form, setForm, tokenA],
  );
  const setAmountB = useCallback(
    (raw: string) => {
      setAmountBStr(raw);
      if (raw === '') {
        setForm({ ...form, amountB: undefined });
        return;
      }
      if (tokenB) {
        try {
          const val = parseUnits(raw, tokenB.decimals);
          setForm({ ...form, amountB: val });
        } catch {
          setForm({ ...form, amountB: undefined });
        }
      }
    },
    [form, setForm, tokenB],
  );

  const setMaxA = useCallback(() => {
    if (tokenA) {
      const token = tokensWithBalance.find(
        ({ config }) => tokenA != null && config.faucetIdBech32 === tokenA.faucetIdBech32,
      );
      const amount = token?.amount ?? BigInt(0);
      setForm({ ...form, amountA: amount });
      setAmountAStr(formatUnits(amount, tokenA.decimals));
    }
  }, [form, setForm, tokenA, tokensWithBalance]);

  const setMaxB = useCallback(() => {
    if (tokenB) {
      const token = tokensWithBalance.find(
        ({ config }) => tokenB != null && config.faucetIdBech32 === tokenB.faucetIdBech32,
      );
      const amount = token?.amount ?? BigInt(0);
      setForm({ ...form, amountB: amount });
      setAmountBStr(formatUnits(amount, tokenB.decimals));
    }
  }, [form, setForm, tokenB, tokensWithBalance]);

  const balanceABigint = useMemo(() => {
    const token = tokensWithBalance.find(
      ({ config }) => tokenA != null && config.faucetIdBech32 === tokenA.faucetIdBech32,
    );
    return token?.amount ?? BigInt(0);
  }, [tokenA, tokensWithBalance]);
  const balanceBBigint = useMemo(() => {
    const token = tokensWithBalance.find(
      ({ config }) => tokenB != null && config.faucetIdBech32 === tokenB.faucetIdBech32,
    );
    return token?.amount ?? BigInt(0);
  }, [tokenB, tokensWithBalance]);

  const setPercentA = useCallback(
    (pct: number) => {
      if (!tokenA) return;
      const amount = (balanceABigint * BigInt(pct)) / BigInt(100);
      setForm({ ...form, amountA: amount });
      setAmountAStr(formatUnits(amount, tokenA.decimals));
    },
    [form, setForm, tokenA, balanceABigint],
  );
  const setPercentB = useCallback(
    (pct: number) => {
      if (!tokenB) return;
      const amount = (balanceBBigint * BigInt(pct)) / BigInt(100);
      setForm({ ...form, amountB: amount });
      setAmountBStr(formatUnits(amount, tokenB.decimals));
    },
    [form, setForm, tokenB, balanceBBigint],
  );

  const formattedBalanceA = useMemo(() => {
    const token = tokensWithBalance.find(
      ({ config }) => tokenA != null && config.faucetIdBech32 === tokenA.faucetIdBech32,
    );
    return fullNumberBigintFormat({
      value: token?.amount || BigInt(0),
      expo: tokenA?.decimals,
    });
  }, [tokenA, tokensWithBalance]);
  const formattedBalanceB = useMemo(() => {
    const token = tokensWithBalance.find(
      ({ config }) => tokenB != null && config.faucetIdBech32 === tokenB.faucetIdBech32,
    );
    return fullNumberBigintFormat({
      value: token?.amount || BigInt(0),
      expo: tokenB?.decimals,
    });
  }, [tokenB, tokensWithBalance]);

  const balanceAText = `${formattedBalanceA ?? '0.00'} ${tokenA?.symbol ?? ''}`.trim();
  const balanceBText = `${formattedBalanceB ?? '0.00'} ${tokenB?.symbol ?? ''}`.trim();

  const errorA =
    amountAStr !== '' && form.amountA != null && form.amountA > balanceABigint
      ? 'Exceeds your balance'
      : amountAStr !== ''
          && form.amountA != null
          && form.amountA < BigInt(0)
      ? 'Must be at least 0'
      : undefined;
  const errorB =
    amountBStr !== '' && form.amountB != null && form.amountB > balanceBBigint
      ? 'Exceeds your balance'
      : amountBStr !== ''
          && form.amountB != null
          && form.amountB < BigInt(0)
      ? 'Must be at least 0'
      : undefined;

  return (
    <div className='flex flex-col gap-4 w-full'>
      <div>
        <h3 className='text-xl font-cal-sans text-foreground'>
          Deposit tokens
        </h3>
        <p className='text-foreground/50'>
          Specify the token amounts for your liquidity contribution.
        </p>
      </div>
      <TokenInput
        value={amountAStr}
        onChange={setAmountA}
        symbol={tokenA?.symbol ?? '?'}
        balanceText={balanceAText}
        onMaxClick={setMaxA}
        placeholder='0'
        error={errorA}
        bottomLeft={
          <div className='flex flex-wrap gap-1.5'>
            {PERCENTAGES.map((pct) => (
              <button
                key={pct}
                type='button'
                onClick={() => setPercentA(pct)}
                className='px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 text-xs transition-colors'
              >
                {pct}%
              </button>
            ))}
          </div>
        }
      />
      <TokenInput
        value={amountBStr}
        onChange={setAmountB}
        symbol={tokenB?.symbol ?? '?'}
        balanceText={balanceBText}
        onMaxClick={setMaxB}
        placeholder='0'
        error={errorB}
        bottomLeft={
          <div className='flex flex-wrap gap-1.5'>
            {PERCENTAGES.map((pct) => (
              <button
                key={pct}
                type='button'
                onClick={() => setPercentB(pct)}
                className='px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 text-xs transition-colors'
              >
                {pct}%
              </button>
            ))}
          </div>
        }
      />
    </div>
  );
};

export default XykStep2;
