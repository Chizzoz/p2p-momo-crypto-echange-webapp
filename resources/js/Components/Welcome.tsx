import React from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ListingCard from './ListingCard';

type Props = {
    address: string;
}

export default function Welcome({ address }: Props) {
    return (
        <div>
            <ListingCard address={address} />
        </div>
    );
}
