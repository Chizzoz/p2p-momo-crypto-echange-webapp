import React, { useState } from 'react';
import {
  mnoBrandLabel,
  mnoLogoPath,
  resolveMnoBrandKey,
} from '@/lib/mnoBrand';
import { PaymentMethodOption } from '@/types';

type Props = {
  method: PaymentMethodOption;
  className?: string;
};

export default function MnoLogo({ method, className = '' }: Props) {
  const brand = resolveMnoBrandKey(method);
  const src = mnoLogoPath(brand);
  const label = mnoBrandLabel(brand, method.method);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className={`inline-flex h-11 min-w-[5.5rem] items-center justify-center rounded-lg border border-[var(--line)] bg-white px-3 text-xs font-semibold text-ink ${className}`}
        title={label}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 ${className}`}
      title={label}
    >
      <img
        src={src}
        alt={label}
        className="h-7 w-auto max-w-[6.5rem] object-contain"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
