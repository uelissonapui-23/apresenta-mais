import React, { useState, useEffect, useRef } from 'react';

export default function PresentationTimer({ plannedSeconds = 0, isRunning = false, initialElapsed = 0, onElapsedChange }) {
  const [elapsed, setElapsed] = useState(initialElapsed);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          onElapsedChange?.(next);
          return next;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  useEffect(() => { setElapsed(initialElapsed); }, [initialElapsed]);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const remaining = Math.max(0, plannedSeconds - elapsed);
  const isOver = elapsed > plannedSeconds && plannedSeconds > 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`text-2xl font-mono font-bold tabular-nums ${isOver ? 'text-destructive' : 'text-foreground'}`}>
        {fmt(elapsed)}
      </div>
      {plannedSeconds > 0 && (
        <div className="text-xs text-muted-foreground">
          {isOver ? `+${fmt(elapsed - plannedSeconds)} além` : `${fmt(remaining)} restante`}
        </div>
      )}
    </div>
  );
}