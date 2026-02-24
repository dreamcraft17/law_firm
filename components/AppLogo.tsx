'use client';

import Image from 'next/image';

type AppLogoProps = {
  width?: number;
  height?: number;
  showText?: boolean;
  textSize?: 'sm' | 'md' | 'lg';
  className?: string;
};

export default function AppLogo({
  width = 40,
  height = 40,
  showText = true,
  textSize = 'md',
  className = '',
}: AppLogoProps) {
  const sizeClass = textSize === 'sm' ? 'text-xs' : textSize === 'lg' ? 'text-base' : 'text-sm';
  const subClass = textSize === 'sm' ? 'text-[10px]' : textSize === 'lg' ? 'text-xs' : 'text-[11px]';

  if (!showText) {
    return (
      <Image
        src="/logoapplagio.png"
        alt="LEGALTECH"
        width={width}
        height={height}
        className={`object-contain shrink-0 ${className}`}
        priority
      />
    );
  }

  return (
    <div className={`flex items-center gap-3 shrink-0 ${className}`}>
      <Image
        src="/logoapplagio.png"
        alt="LEGALTECH"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
      <div className="flex flex-col leading-tight">
        <span className={`font-bold text-white tracking-[0.15em] uppercase ${sizeClass}`}>
          LEGALTECH
        </span>
        <span className={`text-slate-400 ${subClass} tracking-wide`}>
          Firma Hukum & Konsultan
        </span>
      </div>
    </div>
  );
}
