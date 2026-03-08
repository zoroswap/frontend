import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UnifiedWalletButton } from '@/components/UnifiedWalletButton';
import useTokensWithBalance from '@/hooks/useTokensWithBalance';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import {
  type CreatedPoolDraft,
  readCreatedPools,
  writeCreatedPools,
} from '@/lib/poolUtils';
import { accountIdToBech32 } from '@/lib/utils';
import { type TokenConfigWithBalance } from '@/providers/ZoroContext';
import type { TokenConfig } from '@/providers/ZoroProvider';
import { AccountId } from '@miden-sdk/miden-sdk';
import { ChevronLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import XykStep1 from './steps/XykWizardStep1';
import XykStep2 from './steps/XykWizardStep2';
import XykStep3 from './steps/XykWizardStep3';
import XykStep4 from './steps/XykWizardStep4';

export const XYK_WIZARD_STORAGE_KEY = 'zoro-xyk-wizard';

type PersistedForm = {
  tokenABech32?: string;
  tokenBBech32?: string;
  amountA?: string;
  amountB?: string;
  feeBps?: number;
};

function readPersistedWizard(): {
  step: number;
  form: XykWizardForm;
} {
  const defaultForm: XykWizardForm = {
    amountA: BigInt(0),
    amountB: BigInt(0),
  };
  try {
    const raw = localStorage.getItem(XYK_WIZARD_STORAGE_KEY);
    if (!raw) return { step: 0, form: defaultForm };
    const parsed = JSON.parse(raw) as { step?: number; form?: PersistedForm };
    const step = typeof parsed.step === 'number' && parsed.step >= 0 && parsed.step <= 3
      ? parsed.step
      : 0;
    const f = parsed.form ?? {};
    const form: XykWizardForm = {
      amountA: BigInt(0),
      amountB: BigInt(0),
    };
    if (typeof f.tokenABech32 === 'string' && f.tokenABech32) {
      try {
        form.tokenA = AccountId.fromBech32(f.tokenABech32);
      } catch {
        // ignore invalid
      }
    }
    if (typeof f.tokenBBech32 === 'string' && f.tokenBBech32) {
      try {
        form.tokenB = AccountId.fromBech32(f.tokenBBech32);
      } catch {
        // ignore invalid
      }
    }
    if (typeof f.amountA === 'string') {
      try {
        form.amountA = BigInt(f.amountA);
      } catch {
        // ignore
      }
    }
    if (typeof f.amountB === 'string') {
      try {
        form.amountB = BigInt(f.amountB);
      } catch {
        // ignore
      }
    }
    if (typeof f.feeBps === 'number' && f.feeBps > 0) {
      form.feeBps = f.feeBps;
    }
    return { step, form };
  } catch {
    return { step: 0, form: defaultForm };
  }
}

function writePersistedWizard(step: number, form: XykWizardForm) {
  try {
    const persisted: PersistedForm = {};
    if (form.tokenA != null) persisted.tokenABech32 = accountIdToBech32(form.tokenA);
    if (form.tokenB != null) persisted.tokenBBech32 = accountIdToBech32(form.tokenB);
    if (form.amountA != null) persisted.amountA = String(form.amountA);
    if (form.amountB != null) persisted.amountB = String(form.amountB);
    if (form.feeBps != null) persisted.feeBps = form.feeBps;
    localStorage.setItem(
      XYK_WIZARD_STORAGE_KEY,
      JSON.stringify({ step, form: persisted }),
    );
  } catch {
    // ignore
  }
}

function clearPersistedWizard() {
  try {
    localStorage.removeItem(XYK_WIZARD_STORAGE_KEY);
  } catch {
    // ignore
  }
}

const wizardSteps = [XykStep1, XykStep2, XykStep3, XykStep4];

export const XykPairIcon = (
  { symbolA, symbolB, size = 24 }: { symbolA: string; symbolB: string; size?: number },
) => {
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
};

export interface XykWizardForm {
  tokenA?: AccountId;
  tokenB?: AccountId;
  amountA?: bigint;
  amountB?: bigint;
  feeBps?: number;
}

export interface XykStepProps {
  tokensWithBalance: TokenConfigWithBalance[];
  tokenMetadata: Record<string, TokenConfig>;
  loading: boolean;
  form: XykWizardForm;
  setForm: (newForm: XykWizardForm) => void;
  restart: () => void;
}

const XykWizard = () => {
  const { connected } = useUnifiedWallet();
  const [form, setForm] = useState<XykWizardForm>(() => readPersistedWizard().form);
  const [step, setStep] = useState<number>(() => readPersistedWizard().step);
  const tokensWithBalance = useTokensWithBalance();

  useEffect(() => {
    writePersistedWizard(step, form);
  }, [step, form]);

  const canContinueWizard = useMemo(() => {
    switch (step) {
      case 0:
        return form.tokenA != null && form.tokenB != null && form.tokenA != form.tokenB
          && form.feeBps != null && form.feeBps > 0;
      case 1:
        return form.amountA != null && form.amountA > BigInt(0) && form.amountB != null
          && form.amountB > BigInt(0);
      case 2:
        return true;
      default:
        return false;
    }
  }, [step, form]);

  const canGoBackInWizard = useMemo(() => step > 0 && step < wizardSteps.length - 1, [
    step,
  ]);

  const next = useCallback(() => {
    if (canContinueWizard) {
      setStep(Math.min(Math.max(step + 1, 0), wizardSteps.length - 1));
    }
  }, [canContinueWizard, step]);

  const back = useCallback(() => {
    if (canGoBackInWizard) {
      setStep(Math.min(Math.max(step - 1, 0), wizardSteps.length - 1));
    }
  }, [canGoBackInWizard, step]);

  const onCreate = useCallback(async () => {
    if (
      form.amountA == null || form.amountB == null || form.tokenA == null
      || form.tokenB == null || form.feeBps == null
    ) {
      return;
    }
    const metadata = tokensWithBalance.metadata;
    const tokenAMeta = metadata[accountIdToBech32(form.tokenA)];
    const tokenBMeta = metadata[accountIdToBech32(form.tokenB)];
    const draft: CreatedPoolDraft = {
      id: crypto.randomUUID(),
      type: 'xyk',
      tokenA: {
        symbol: tokenAMeta.symbol,
        name: tokenAMeta.name,
        faucetIdBech32: tokenAMeta.faucetIdBech32,
      },
      tokenB: {
        symbol: tokenBMeta.symbol,
        name: tokenBMeta.name,
        faucetIdBech32: tokenBMeta.faucetIdBech32,
      },
      feeBps: form.feeBps,
      createdAt: Date.now(),
      status: 'draft',
    };
    const existing = readCreatedPools();
    writeCreatedPools([draft, ...existing]);
    next();
  }, [form, tokensWithBalance, next]);

  const stepTitle = step === 0
    ? 'Create a new Liquidity Pool'
    : step === 1
    ? 'Initial liquidity'
    : step === 2
    ? 'Confirm your details'
    : 'Congratulations';

  const restart = useCallback(() => {
    clearPersistedWizard();
    setStep(0);
    setForm(readPersistedWizard().form);
  }, []);

  const activeStep = useMemo(() => {
    const Step = wizardSteps[step];
    return (
      <Step
        form={form}
        setForm={setForm}
        tokensWithBalance={tokensWithBalance.tokensWithBalance}
        tokenMetadata={tokensWithBalance.metadata}
        loading={tokensWithBalance.loading}
        restart={restart}
      />
    );
  }, [step, form, tokensWithBalance, restart]);

  if (!connected) {
    return (
      <Card className='rounded-xl border border-dashed border-muted-foreground/30 overflow-hidden'>
        <CardContent className='flex flex-col items-center justify-center py-16 px-6 text-center'>
          <p className='text-muted-foreground mb-4'>
            Connect your wallet to create a new liquidity pool.
          </p>
          <UnifiedWalletButton className='rounded-lg bg-primary text-primary-foreground h-11 px-6' />
        </CardContent>
      </Card>
    );
  }

  if (tokensWithBalance.loading) {
    return (
      <Card className='rounded-xl border border-dashed border-muted-foreground/30 overflow-hidden'>
        <CardContent className='flex flex-col items-center justify-center py-16 px-6 text-center'>
          <p className='text-muted-foreground'>Loading your tokens…</p>
        </CardContent>
      </Card>
    );
  }

  if (tokensWithBalance.tokensWithBalance.length === 0) {
    return (
      <Card className='rounded-xl border border-dashed border-muted-foreground/30 overflow-hidden'>
        <CardContent className='flex flex-col items-center justify-center py-16 px-6 text-center'>
          <h3 className='text-lg font-semibold text-foreground mb-2'>
            Missing tokens to launch a new pool
          </h3>
          <p className='text-sm text-muted-foreground mb-6'>
            You need tokens to create a liquidity pool. Launch your token on the
            launchpad, or get tokens from the faucet, then come back here to create a
            pool.
          </p>
          <Button
            asChild
            className='rounded-lg bg-primary text-primary-foreground h-11 px-6'
          >
            <Link to='/launchpad'>Go to Launchpad</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='flex flex-col max-w-[900px] gap-8'>
      <div className='relative flex items-center justify-center w-full'>
        {step !== wizardSteps.length - 1
          && (
            <Button
              variant='outline'
              size='icon'
              className='absolute left-0 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full shrink-0 -ml-2 hover:bg-muted'
              disabled={step === 0}
              onClick={back}
              aria-label='Back'
            >
              <ChevronLeft className='h-6 w-6' />
            </Button>
          )}
        <div className='flex flex-col items-center gap-2 w-full'>
          {step < 3 && (
            <span className='text-xs text-foreground font-cal-sans uppercase bg-card rounded-l p-2'>
              Step {step + 1} of 3
            </span>
          )}
          <h2 className='text-2xl font-cal-sans text-foreground text-center'>
            {stepTitle}
          </h2>
          {step !== wizardSteps.length - 1 && (
            <div className='flex gap-3 w-full max-w-[313px]'>
              <div className='flex-1 border-2 border-primary' />
              {step > 0
                ? <div className='flex-1 border-2 border-primary' />
                : <div className='flex-1 border-2 border-gray-500' />}
              {step > 1
                ? <div className='flex-1 border-2 border-primary' />
                : <div className='flex-1 border-2 border-gray-500' />}
            </div>
          )}
        </div>
      </div>
      <div className='flex items-center justify-center w-full'>
        {activeStep}
      </div>
      <div className='flex flex-col gap-2 pt-8'>
        {step !== 2 && step < wizardSteps.length - 1
          && (
            <Button
              className='w-full rounded-lg bg-primary text-primary-foreground h-16'
              onClick={next}
              disabled={!canContinueWizard}
            >
              Next Step
            </Button>
          )}
        {step === 2 && (
          <Button
            className='w-full rounded-lg bg-primary text-primary-foreground h-16'
            onClick={() => onCreate()}
            disabled={!canContinueWizard}
          >
            Create pool
          </Button>
        )}
      </div>
    </div>
  );
};

export default XykWizard;
