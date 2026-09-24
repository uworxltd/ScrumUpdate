import { SmartDateFormatPipe } from './smart-date-format.pipe';

describe('SmartDateFormatPipe', () => {
    let pipe: SmartDateFormatPipe;

    beforeEach(() => {
        pipe = new SmartDateFormatPipe();
    });

    it('should create an instance', () => {
        expect(pipe).toBeTruthy();
    });

    describe('transform', () => {
        it('should return empty string for null value', () => {
            const result = pipe.transform(null as any);
            expect(result).toBe('');
        });

        it('should return empty string for undefined value', () => {
            const result = pipe.transform(undefined as any);
            expect(result).toBe('');
        });

        it('should return empty string for empty string value', () => {
            const result = pipe.transform('');
            expect(result).toBe('');
        });

        it('should format today\'s date with only time', () => {
            const today = new Date();
            today.setHours(14, 30, 0, 0); // 2:30 PM
            
            const result = pipe.transform(today);
            
            expect(result).toBe('2:30 PM');
        });

        it('should format today\'s date with AM time', () => {
            const today = new Date();
            today.setHours(9, 15, 0, 0); // 9:15 AM
            
            const result = pipe.transform(today);
            
            expect(result).toBe('9:15 AM');
        });

        it('should format midnight as 12:00 AM', () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const result = pipe.transform(today);
            
            expect(result).toBe('12:00 AM');
        });

        it('should format noon as 12:00 PM', () => {
            const today = new Date();
            today.setHours(12, 0, 0, 0);
            
            const result = pipe.transform(today);
            
            expect(result).toBe('12:00 PM');
        });

        it('should format yesterday\'s date', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(16, 45, 0, 0); // 4:45 PM
            
            const result = pipe.transform(yesterday);
            
            expect(result).toBe('Yesterday 4:45 PM');
        });

        it('should format date 2 days ago with day name', () => {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            twoDaysAgo.setHours(10, 20, 0, 0); // 10:20 AM
            
            const result = pipe.transform(twoDaysAgo);
            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][twoDaysAgo.getDay()];
            
            expect(result).toBe(`${dayName} 10:20 AM`);
        });

        it('should format date 3 days ago with day name', () => {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            threeDaysAgo.setHours(15, 30, 0, 0); // 3:30 PM
            
            const result = pipe.transform(threeDaysAgo);
            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][threeDaysAgo.getDay()];
            
            expect(result).toBe(`${dayName} 3:30 PM`);
        });

        it('should format date 6 days ago with day name', () => {
            const sixDaysAgo = new Date();
            sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
            sixDaysAgo.setHours(8, 0, 0, 0); // 8:00 AM
            
            const result = pipe.transform(sixDaysAgo);
            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][sixDaysAgo.getDay()];
            
            expect(result).toBe(`${dayName} 8:00 AM`);
        });

        it('should format date 7 days ago without year (same year)', () => {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            sevenDaysAgo.setHours(11, 45, 0, 0); // 11:45 AM
            
            const result = pipe.transform(sevenDaysAgo);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[sevenDaysAgo.getMonth()];
            const day = sevenDaysAgo.getDate();
            
            expect(result).toBe(`${month} ${day} 11:45 AM`);
        });

        it('should format date in same year without year', () => {
            const dateInSameYear = new Date();
            // Use a date earlier in the same year (e.g., last month if possible, otherwise use March if we're in Jan/Feb)
            const currentMonth = dateInSameYear.getMonth();
            if (currentMonth > 0) {
                dateInSameYear.setMonth(currentMonth - 1);
            } else {
                dateInSameYear.setMonth(2); // Use March if we're in January
            }
            dateInSameYear.setHours(14, 15, 0, 0); // 2:15 PM
            
            const result = pipe.transform(dateInSameYear);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[dateInSameYear.getMonth()];
            const day = dateInSameYear.getDate();
            const resultYear = dateInSameYear.getFullYear();
            const today = new Date();
            
            // If the result date is in a different year, it should include the year
            if (dateInSameYear.getFullYear() !== today.getFullYear()) {
                expect(result).toBe(`${month} ${day}, ${resultYear} 2:15 PM`);
            } else {
                expect(result).toBe(`${month} ${day} 2:15 PM`);
            }
        });

        it('should format date in different year with full date', () => {
            const dateLastYear = new Date();
            dateLastYear.setFullYear(dateLastYear.getFullYear() - 1);
            dateLastYear.setMonth(5); // June
            dateLastYear.setDate(15);
            dateLastYear.setHours(9, 30, 0, 0); // 9:30 AM
            
            const result = pipe.transform(dateLastYear);
            const year = dateLastYear.getFullYear();
            
            expect(result).toBe(`Jun 15, ${year} 9:30 AM`);
        });

        it('should format date in different year with December', () => {
            const dateLastYear = new Date();
            dateLastYear.setFullYear(dateLastYear.getFullYear() - 1);
            dateLastYear.setMonth(11); // December
            dateLastYear.setDate(25);
            dateLastYear.setHours(18, 0, 0, 0); // 6:00 PM
            
            const result = pipe.transform(dateLastYear);
            const year = dateLastYear.getFullYear();
            
            expect(result).toBe(`Dec 25, ${year} 6:00 PM`);
        });

        it('should handle string date input', () => {
            const today = new Date();
            today.setHours(13, 45, 0, 0);
            
            const result = pipe.transform(today.toISOString());
            
            expect(result).toContain(':');
            expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
        });

        it('should handle timestamp (number) input', () => {
            const today = new Date();
            today.setHours(10, 0, 0, 0);
            
            const result = pipe.transform(today.getTime());
            
            expect(result).toBe('10:00 AM');
        });

        it('should pad single digit minutes with zero', () => {
            const today = new Date();
            today.setHours(14, 5, 0, 0); // 2:05 PM
            
            const result = pipe.transform(today);
            
            expect(result).toBe('2:05 PM');
        });

        it('should format 1 PM correctly', () => {
            const today = new Date();
            today.setHours(13, 0, 0, 0); // 1:00 PM
            
            const result = pipe.transform(today);
            
            expect(result).toBe('1:00 PM');
        });

        it('should format 11 PM correctly', () => {
            const today = new Date();
            today.setHours(23, 59, 0, 0); // 11:59 PM
            
            const result = pipe.transform(today);
            
            expect(result).toBe('11:59 PM');
        });

        it('should handle date exactly 1 week ago', () => {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            oneWeekAgo.setHours(12, 0, 0, 0);
            
            const result = pipe.transform(oneWeekAgo);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[oneWeekAgo.getMonth()];
            const day = oneWeekAgo.getDate();
            
            expect(result).toBe(`${month} ${day} 12:00 PM`);
        });

        it('should handle January 1st of current year', () => {
            const janFirst = new Date();
            janFirst.setMonth(0);
            janFirst.setDate(1);
            janFirst.setHours(0, 0, 0, 0);
            
            // Only test if it's not today
            const today = new Date();
            if (today.getMonth() !== 0 || today.getDate() !== 1) {
                const result = pipe.transform(janFirst);
                expect(result).toBe('Jan 1 12:00 AM');
            }
        });

        it('should handle December 31st of previous year', () => {
            const decLast = new Date();
            decLast.setFullYear(decLast.getFullYear() - 1);
            decLast.setMonth(11);
            decLast.setDate(31);
            decLast.setHours(23, 59, 0, 0);
            
            const result = pipe.transform(decLast);
            const year = decLast.getFullYear();
            
            expect(result).toBe(`Dec 31, ${year} 11:59 PM`);
        });
    });
});
