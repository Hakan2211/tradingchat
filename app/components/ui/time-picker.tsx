// app/components/ui/time-picker.tsx
import * as React from 'react';
import { Clock } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { cn } from '#/lib/utils';

interface TimePickerProps {
  date: Date;
  setDate: (date: Date) => void;
  className?: string;
}

export function TimePicker({ date, setDate, className }: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    if (timeValue) {
      const [hours, minutes] = timeValue.split(':').map(Number);
      const newDate = new Date(date);
      newDate.setHours(hours, minutes, 0, 0);
      setDate(newDate);
    }
  };

  const handleHourChange = (value: string) => {
    const newDate = new Date(date);
    newDate.setHours(parseInt(value, 10));
    setDate(newDate);
  };

  const handleMinuteChange = (value: string) => {
    const newDate = new Date(date);
    newDate.setMinutes(parseInt(value, 10));
    setDate(newDate);
  };

  const hours = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, '0')
  );
  const minutes = Array.from({ length: 12 }, (_, i) =>
    String(i * 5).padStart(2, '0')
  );

  return (
    <div className={cn('flex gap-2', className)}>
      {/* Mobile: Simple time input */}
      <div className="flex sm:hidden w-full">
        <Input
          type="time"
          value={formatTime(date)}
          onChange={handleTimeInputChange}
          className="w-full"
        />
      </div>

      {/* Desktop: Enhanced time picker with popover */}
      <div className="hidden sm:flex w-full">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal h-11 bg-transparent dark:bg-input/30 border-input hover:bg-transparent dark:hover:bg-input/30 hover:border-input focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
              )}
            >
              <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>{formatTime(date)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-3">
              <div className="text-sm font-medium text-center">Select Time</div>
              <div className="flex items-center gap-3">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground text-center">
                    Hour
                  </div>
                  <Select
                    value={String(date.getHours()).padStart(2, '0')}
                    onValueChange={handleHourChange}
                  >
                    <SelectTrigger className="w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-xl font-bold text-muted-foreground pt-6">
                  :
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground text-center">
                    Minute
                  </div>
                  <Select
                    value={String(
                      Math.floor(date.getMinutes() / 5) * 5
                    ).padStart(2, '0')}
                    onValueChange={handleMinuteChange}
                  >
                    <SelectTrigger className="w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {minutes.map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          {minute}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const newDate = new Date(date);
                    newDate.setHours(now.getHours(), now.getMinutes(), 0, 0);
                    setDate(newDate);
                  }}
                  className="flex-1 bg-transparent cursor-pointer hover:bg-muted-foreground/10"
                >
                  Now
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-transparent cursor-pointer hover:bg-muted-foreground/10"
                >
                  Done
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
