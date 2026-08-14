import React, { memo } from 'react';

interface RollingDigitProps {
  digit: string;
  heightEm?: number;
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const RollingDigit: React.FC<RollingDigitProps> = memo(({ digit, heightEm = 1.15 }) => {
  const isNumber = !isNaN(parseInt(digit, 10));

  if (!isNumber) {
    return (
      <span className="inline-block" style={{ height: `${heightEm}em`, lineHeight: `${heightEm}em` }}>
        {digit}
      </span>
    );
  }

  const numVal = parseInt(digit, 10);
  const translateYPercent = numVal * -10; // 0% to -90%

  return (
    <span
      className="inline-block overflow-hidden relative"
      style={{
        height: `${heightEm}em`,
        lineHeight: `${heightEm}em`,
        verticalAlign: 'top',
      }}
    >
      <span
        className="flex flex-col will-change-transform"
        style={{
          transform: `translateY(${translateYPercent}%)`,
          transition: 'transform 0.6s cubic-bezier(0.34, 1.45, 0.64, 1)',
        }}
      >
        {DIGITS.map((d) => (
          <span
            key={d}
            className="flex items-center justify-center"
            style={{ height: `${heightEm}em` }}
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
});

interface RollingNumberProps {
  value: number | string;
  className?: string;
  heightEm?: number;
}

export const RollingNumber: React.FC<RollingNumberProps> = memo(({
  value,
  className = '',
  heightEm = 1.15,
}) => {
  const chars = String(value).split('');

  return (
    <span className={`inline-flex items-center select-none font-mono ${className}`}>
      {chars.map((char, index) => (
        <RollingDigit key={`${index}`} digit={char} heightEm={heightEm} />
      ))}
    </span>
  );
});