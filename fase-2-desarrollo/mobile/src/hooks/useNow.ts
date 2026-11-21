import { useEffect, useState } from 'react';

/** La hora actual, renovada cada `everyMs`. Quien la usa se redibuja a ese ritmo. */
export function useNow(everyMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
}
