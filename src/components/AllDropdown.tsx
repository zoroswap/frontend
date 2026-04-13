import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { Button } from './ui/button';

export function AllDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='rounded-lg bg-muted/50 border-muted-foreground/20 gap-1'
        >
          All
          <ChevronDown className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='rounded-lg'>
        <DropdownMenuItem>All</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
