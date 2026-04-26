/**
 * Formats a Date object to YYYY-MM-DD in Berlin timezone.
 */
export function formatBerlinDate(date: Date) {
  const timeZone = 'Europe/Berlin';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Utility to get the start and end of a day in a specific timezone.
 * @param date Optional date to get range for. Defaults to now.
 */
export function getBerlinDayRange(date?: Date | string) {
  const timeZone = 'Europe/Berlin';
  
  // 1. Parse input date or use now
  let refDate: Date;
  if (!date) {
    refDate = new Date();
  } else if (typeof date === 'string') {
    // If it's a yyyy-mm-dd string, we want to treat it as "at 12:00 noon" 
    // to avoid boundary issues when converting to different timezones.
    refDate = new Date(`${date}T12:00:00`);
  } else {
    refDate = date;
  }
  
  // 2. Get the yyyy-mm-dd representation in Berlin
  const dateStr = formatBerlinDate(refDate);
  const [y, m, d] = dateStr.split('-');

  // 3. Construct UTC date for midnight in Berlin
  // We use the same logic as before:
  const start = new Date(`${y}-${m}-${d}T00:00:00`);
  const berlinMidnight = new Date(start.toLocaleString('en-US', { timeZone }));
  const diff = berlinMidnight.getTime() - start.getTime();
  
  const finalStart = new Date(start.getTime() - diff);
  const finalEnd = new Date(finalStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  return {
    start: finalStart,
    end: finalEnd,
    dateStr
  };
}

/**
 * Returns the current slot based on Berlin time
 */
export function getBerlinCurrentSlot(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const timeZone = 'Europe/Berlin';
  const now = new Date();
  const hour = parseInt(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone }).format(now));

  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 18 && hour < 21) return 'dinner';
  return 'snack';
}
