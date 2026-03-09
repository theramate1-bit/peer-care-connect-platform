import React from 'react';
import { HeaderClean } from '@/components/landing/HeaderClean';
import { FooterClean } from '@/components/FooterClean';
import { MobileRequestStatus } from '@/components/client/MobileRequestStatus';

const GuestMobileRequests: React.FC = () => {
  return (
    <>
      <HeaderClean />
      <main id="main-content" className="container mx-auto p-6 mt-16">
        <MobileRequestStatus />
      </main>
      <FooterClean />
    </>
  );
};

export default GuestMobileRequests;
