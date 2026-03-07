import { Button } from '@/components/ui/button';
import useTokensWithBalance from '@/hooks/useTokensWithBalance';
import {
  type CreatedPoolDraft,
  readCreatedPools,
  writeCreatedPools,
} from '@/lib/poolUtils';
import { accountIdToBech32 } from '@/lib/utils';
import { type TokenConfigWithBalance } from '@/providers/ZoroContext';
import type { AccountId } from '@miden-sdk/miden-sdk';
import { ChevronLeft } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import XykStep1 from './steps/XykWizardStep1';
import XykStep2 from './steps/XykWizardStep2';
import XykStep3 from './steps/XykWizardStep3';
import XykStep4 from './steps/XykWizardStep4';

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
  loading: boolean;
  form: XykWizardForm;
  setForm: (newForm: XykWizardForm) => void;
}

const XykWizard = () => {
  const [form, setForm] = useState<XykWizardForm>({
    amountA: BigInt(0),
    amountB: BigInt(0),
  });
  const [step, setStep] = useState<number>(0);
  const tokensWithBalance = useTokensWithBalance();

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
    setStep(4);
  }, [form, tokensWithBalance]);

  const stepTitle = step === 1
    ? 'Create a new Liquidity Pool'
    : step === 2
    ? 'Deposit Tokens'
    : 'Confirm your details';

  const activeStep = useMemo(() => {
    const Step = wizardSteps[step];
    return (
      <Step
        form={form}
        setForm={setForm}
        tokensWithBalance={tokensWithBalance.tokensWithBalance}
        loading={tokensWithBalance.loading}
      />
    );
  }, [step, form, tokensWithBalance]);

  return (
    <div className='flex flex-col gap-6'>
      <div className='relative flex items-center justify-center gap-2'>
        {step < 3 && (
          <Button
            variant='ghost'
            size='icon'
            className='absolute left-0 top-0 rounded-full shrink-0 -ml-2'
            disabled={step === 0}
            onClick={back}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
        )}
        <div className='flex flex-col items-center'>
          {step < 3 && (
            <span className='text-xs text-muted-foreground mb-0.5'>
              Step {step} of 3
            </span>
          )}
          <h2 className='text-xl font-bold font-cal-sans text-foreground text-center'>
            {step === 1
              ? (
                <>
                  Create a new{' '}
                  <span className='underline decoration-primary decoration-2 underline-offset-2'>
                    Liquidity Pool
                  </span>
                </>
              )
              : stepTitle}
          </h2>
        </div>
      </div>

      {activeStep}

      {/* Actions: primary first; Back only on steps 2–3 (step 1 has chevron only) */}
      <div className='flex flex-col gap-2 pt-1'>
        {step < 3
          ? (
            <Button
              className='w-full rounded-lg bg-primary text-primary-foreground h-11'
              onClick={next}
              disabled={!canContinueWizard}
            >
              Next Step
            </Button>
          )
          : (
            <Button
              className='w-full rounded-lg bg-primary text-primary-foreground h-11'
              onClick={onCreate}
            >
              Confirm
            </Button>
          )}
        <Button
          variant='outline'
          className='w-full rounded-lg h-10 bg-primary/10 text-primary border-primary/30 hover:bg-primary/15'
          onClick={back}
          disabled={!canGoBackInWizard}
        >
          Back
        </Button>
      </div>
    </div>
  );
};

export default XykWizard;
