import { PoolDetailLayout } from '@/components/PoolDetailLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function XykPoolDetailSkeleton() {
  return (
    <PoolDetailLayout backTo='/explore' backLabel='Back to pools' title='Pool'>
      <div className='flex flex-wrap items-start justify-between gap-4 mb-8'>
        <div className='flex items-center gap-3'>
          <Skeleton className='h-12 w-12 shrink-0 rounded-full' />
          <Skeleton className='h-12 w-12 shrink-0 rounded-full' />
          <div className='space-y-2'>
            <Skeleton className='h-7 w-48' />
            <Skeleton className='h-4 w-32' />
          </div>
        </div>
        <div className='flex gap-2'>
          <Skeleton className='h-10 w-32 rounded-lg' />
          <Skeleton className='h-10 w-24 rounded-lg' />
        </div>
      </div>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-8'>
        <Skeleton className='h-20 rounded-xl' />
        <Skeleton className='h-20 rounded-xl' />
        <Skeleton className='h-20 rounded-xl md:block hidden' />
        <Skeleton className='h-20 rounded-xl md:block hidden' />
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-1 space-y-6'>
          <Card className='rounded-xl'>
            <CardHeader className='pb-2'>
              <Skeleton className='h-5 w-32' />
            </CardHeader>
            <CardContent className='space-y-3'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
              <Skeleton className='h-8 w-full rounded-lg' />
              <Skeleton className='h-8 w-full rounded-lg' />
            </CardContent>
          </Card>
          <Card className='rounded-xl'>
            <CardHeader className='pb-2'>
              <Skeleton className='h-5 w-24' />
            </CardHeader>
            <CardContent className='space-y-2'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-2/3' />
            </CardContent>
          </Card>
          <Card className='rounded-xl'>
            <CardHeader className='pb-2'>
              <Skeleton className='h-5 w-28' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-16 w-full rounded-lg' />
            </CardContent>
          </Card>
        </div>
        <div className='lg:col-span-2 space-y-6'>
          <Card className='rounded-xl'>
            <CardHeader className='pb-2'>
              <Skeleton className='h-5 w-16' />
            </CardHeader>
            <CardContent className='space-y-3'>
              <Skeleton className='h-4 w-12' />
              <Skeleton className='h-12 w-full rounded-lg' />
              <div className='flex gap-1'>
                <Skeleton className='h-8 flex-1 rounded-md' />
                <Skeleton className='h-8 flex-1 rounded-md' />
                <Skeleton className='h-8 flex-1 rounded-md' />
                <Skeleton className='h-8 flex-1 rounded-md' />
              </div>
              <div className='flex justify-center'>
                <Skeleton className='h-9 w-9 rounded-full' />
              </div>
              <Skeleton className='h-4 w-12' />
              <Skeleton className='h-12 w-full rounded-lg' />
              <Skeleton className='h-10 w-full rounded-md' />
            </CardContent>
          </Card>
        </div>
      </div>
    </PoolDetailLayout>
  );
}
