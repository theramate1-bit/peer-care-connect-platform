import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TimeSelectProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    disabled?: boolean;
    intervalMinutes?: number;
    placeholder?: string;
}

export const TimeSelect: React.FC<TimeSelectProps> = ({
    value,
    onChange,
    className,
    disabled = false,
    intervalMinutes = 15,
    placeholder = "Select time"
}) => {
    // Generate time options
    const timeOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [];
        const totalMinutesInDay = 24 * 60;

        for (let minutes = 0; minutes < totalMinutesInDay; minutes += intervalMinutes) {
            const hour = Math.floor(minutes / 60);
            const minute = minutes % 60;

            // Format 24h time for value (HH:MM)
            const valueStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

            // Format 12h time for label (h:MM AM/PM)
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            const labelStr = `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;

            options.push({ value: valueStr, label: labelStr });
        }

        return options;
    }, [intervalMinutes]);

    // Ensure value is in valid format (it might come as "9:00" instead of "09:00")
    const normalizedValue = useMemo(() => {
        if (!value) return '';
        const [h, m] = value.split(':');
        if (!h || !m) return value;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }, [value]);

    return (
        <Select
            value={normalizedValue}
            onValueChange={onChange}
            disabled={disabled}
        >
            <SelectTrigger className={cn("w-32", className)}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
                {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};
