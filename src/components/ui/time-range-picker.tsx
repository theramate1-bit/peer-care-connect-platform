import React from 'react';
import { TimeSelect } from './time-select';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface TimeRangePickerProps {
    startTime: string;
    endTime: string;
    onChange: (start: string, end: string) => void;
    disabled?: boolean;
    className?: string;
    intervalMinutes?: number;
}

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
    startTime,
    endTime,
    onChange,
    disabled = false,
    className,
    intervalMinutes = 15
}) => {
    const handleStartChange = (newStart: string) => {
        // If new start time is after current end time, update end time to be start + interval
        if (newStart >= endTime) {
            // Calculate next slot
            const [h, m] = newStart.split(':').map(Number);
            const totalMinutes = h * 60 + m + intervalMinutes;
            const nextH = Math.floor(totalMinutes / 60) % 24;
            const nextM = totalMinutes % 60;
            const nextTime = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;

            onChange(newStart, nextTime);
        } else {
            onChange(newStart, endTime);
        }
    };

    const handleEndChange = (newEnd: string) => {
        // Do not allow end time to be before start time
        if (newEnd <= startTime) {
            return;
        }
        onChange(startTime, newEnd);
    };

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <TimeSelect
                value={startTime}
                onChange={handleStartChange}
                disabled={disabled}
                intervalMinutes={intervalMinutes}
                className="w-[110px]"
            />
            <div className="text-muted-foreground flex-shrink-0">
                <ArrowRight className="h-4 w-4" />
            </div>
            <TimeSelect
                value={endTime}
                onChange={handleEndChange}
                disabled={disabled}
                intervalMinutes={intervalMinutes}
                className="w-[110px]"
            />
        </div>
    );
};
