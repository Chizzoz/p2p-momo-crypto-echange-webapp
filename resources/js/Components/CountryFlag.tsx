import React from 'react';
import { flagSrcSet, flagUrl } from '@/lib/mnoBrand';

type Props = {
  iso2: string;
  name: string;
  className?: string;
};

export default function CountryFlag({ iso2, name, className = '' }: Props) {
  return (
    <img
      src={flagUrl(iso2, 40)}
      srcSet={flagSrcSet(iso2)}
      alt={`${name} flag`}
      className={`h-5 w-7 rounded-sm object-cover shadow-sm ${className}`}
      loading="lazy"
    />
  );
}
