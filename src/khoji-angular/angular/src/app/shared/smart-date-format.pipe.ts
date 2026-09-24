import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'smartDateFormat',
    standalone: true
})
export class SmartDateFormatPipe implements PipeTransform {
    private readonly months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    private readonly days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    transform(value: Date | string | number): string {
        if (!value) return '';

        const inputDate = new Date(value);
        const today = new Date();

        // Reset time components for date comparison
        const inputDateOnly = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const diffTime = todayOnly.getTime() - inputDateOnly.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // If it's today, show only time
        if (diffDays === 0) {
            return this.formatTime(inputDate);
        }

        // If it's yesterday
        if (diffDays === 1) {
            return `Yesterday ${this.formatTime(inputDate)}`;
        }

        // If it's within the last week (2-6 days ago), show day name
        if (diffDays > 1 && diffDays < 7) {
            const dayName = this.getDayName(inputDate);
            return `${dayName} ${this.formatTime(inputDate)}`;
        }

        // If it's within the same year, show date without year
        if (inputDate.getFullYear() === today.getFullYear()) {
            return this.formatDateWithoutYear(inputDate);
        }

        // Otherwise, show full date
        return this.formatFullDate(inputDate);
    }

    private formatTime(date: Date): string {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        return `${displayHours}:${displayMinutes} ${ampm}`;
    }

    private getDayName(date: Date): string {
        return this.days[date.getDay()];
    }

    private formatDateWithoutYear(date: Date): string {
        const day = date.getDate();
        const month = this.months[date.getMonth()];
        const time = this.formatTime(date);
        return `${month} ${day} ${time}`;
    }

    private formatFullDate(date: Date): string {
        const day = date.getDate();
        const month = this.months[date.getMonth()];
        const year = date.getFullYear();
        const time = this.formatTime(date);
        return `${month} ${day}, ${year} ${time}`;
    }
}
