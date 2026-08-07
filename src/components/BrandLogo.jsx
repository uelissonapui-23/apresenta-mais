import React from 'react';

const brandMark = '/apresenta-mark.png';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function BrandMark({
  className = '',
  imageClassName = '',
  framed = true,
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        framed
          ? 'rounded-2xl bg-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
          : '',
        className,
      )}
      aria-hidden="true"
    >
      <img
        src={brandMark}
        alt=""
        className={cn(
          'block h-full w-full object-contain',
          imageClassName,
        )}
        draggable="false"
      />
    </span>
  );
}

export default function BrandLogo({
  className = '',
  markClassName = 'h-10 w-10',
  nameClassName = 'text-base',
  taglineClassName = 'text-[11px]',
  showTagline = true,
  compact = false,
  inverse = false,
}) {
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-2.5',
        className,
      )}
    >
      <BrandMark className={markClassName} />

      {!compact && (
        <span className="min-w-0 text-left">
          <span
            className={cn(
              'block truncate font-extrabold leading-none tracking-tight',
              inverse ? 'text-white' : 'text-foreground',
              nameClassName,
            )}
          >
            Apresenta
            <span className={inverse ? 'text-black' : 'text-red-600'}>
              +
            </span>
          </span>

          {showTagline && (
            <span
              className={cn(
                'mt-1 block truncate font-medium leading-tight',
                inverse
                  ? 'text-white/75'
                  : 'text-muted-foreground',
                taglineClassName,
              )}
            >
              Organize
              <span className="mx-1 text-red-600">•</span>
              Ensaie
              <span className="mx-1 text-red-600">•</span>
              Apresente
            </span>
          )}
        </span>
      )}
    </span>
  );
}
