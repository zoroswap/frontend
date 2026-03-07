import { Button } from '@/components/ui/button';
import { emptyFn } from '@/lib/shared';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const XykStep4 = () => {
  return (
    <div className='flex flex-col gap-6'>
      <div className='relative flex justify-center'>
        <h2 className='text-xl font-bold font-cal-sans text-foreground text-center'>
          Congratulations!
        </h2>
      </div>
      <div className='flex flex-col items-center gap-4 py-2'>
        <div className='h-20 w-20 rounded-full border-2 border-green-500 bg-white flex items-center justify-center'>
          <Check className='h-10 w-10 text-green-600 stroke-[2.5]' />
        </div>
        <p className='text-lg font-medium text-foreground'>
          Pool created successfully!
        </p>
        <p className='text-sm text-muted-foreground'>
          View your Pool at Address: (saved to Your pools)
        </p>
      </div>
      <div className='flex flex-col gap-2'>
        <Link to={'/pools'}>
          <Button
            className='w-full rounded-lg bg-primary text-primary-foreground h-11'
            onClick={emptyFn}
          >
            Go to Pools
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default XykStep4;
