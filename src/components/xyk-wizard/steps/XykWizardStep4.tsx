import { Button } from '@/components/ui/button';
import { emptyFn } from '@/lib/shared';
import { accountIdToBech32 } from '@/lib/utils';
import { getMidenscanAccountUrl } from '@/hooks/useLaunchpad';
import { Check, ExternalLink } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { XYK_WIZARD_STORAGE_KEY, type XykStepProps } from '../XykWizard';

function clearPersistedWizard() {
  try {
    localStorage.removeItem(XYK_WIZARD_STORAGE_KEY);
  } catch {
    // ignore
  }
}

const XykStep4 = ({
  form,
  tokenMetadata,
  restart,
  lastDeployedPoolIdBech32,
}: XykStepProps) => {
  const tokenA = useMemo(() => {
    return tokenMetadata[form.tokenA ? accountIdToBech32(form.tokenA) : ''];
  }, [form.tokenA, tokenMetadata]);
  const tokenB = useMemo(() => {
    return tokenMetadata[form.tokenB ? accountIdToBech32(form.tokenB) : ''];
  }, [form.tokenB, tokenMetadata]);
  const poolName = useMemo(() => {
    return `${tokenA.name}/${tokenB.name}`;
  }, [tokenA, tokenB]);
  useEffect(() => {
    clearPersistedWizard();
  }, []);
  return (
    <div className='flex flex-col gap-6 max-w-[450px]'>
      <div className='flex flex-col items-center gap-4 py-2'>
        <div className='h-36 w-36 rounded-full bg-green-100/50 dark:bg-green-900/20 flex items-center justify-center'>
          <div className='h-16 w-16 rounded-full border-4 border-green-500 bg-green/10 flex items-center justify-center'>
            <Check className='h-10 w-10 text-green-600 stroke-[2.5]' />
          </div>
        </div>
        <p className='text-lg font-medium text-foreground'>
          Pool {poolName} created successfully!
        </p>
        {lastDeployedPoolIdBech32 && (
          <div className='flex flex-col items-center gap-1 text-sm'>
            <span className='text-muted-foreground'>Pool address</span>
            <code className='text-xs font-mono text-foreground bg-muted px-2 py-1 rounded break-all max-w-full text-center'>
              {lastDeployedPoolIdBech32}
            </code>
            <a
              href={getMidenscanAccountUrl(lastDeployedPoolIdBech32)}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-primary hover:underline'
            >
              View on MidenScan
              <ExternalLink className='h-3.5 w-3.5' />
            </a>
          </div>
        )}
      </div>
      <div className='flex flex-col gap-4'>
        {lastDeployedPoolIdBech32
          ? (
            <Link to={`/pools/xyk/${encodeURIComponent(lastDeployedPoolIdBech32)}`}>
              <Button
                className='w-full rounded-lg bg-primary text-primary-foreground h-11 font-normal'
                onClick={emptyFn}
              >
                View pool
              </Button>
            </Link>
          )
          : (
            <Link to='/pools'>
              <Button
                className='w-full rounded-lg bg-primary text-primary-foreground h-11 font-normal'
                onClick={emptyFn}
              >
                Your pools
              </Button>
            </Link>
          )}
        <Button
          className='w-full rounded-lg bg-card hover:bg-gray-100 dark:hover:bg-gray-500/10 text-foreground h-11 font-normal'
          onClick={restart}
        >
          Create another
        </Button>
      </div>
    </div>
  );
};

export default XykStep4;
