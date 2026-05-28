import React from "react";
import { PageHeader } from "@/components/PageHeader";
import ConnectAccountSetup from "@/components/payments/ConnectAccountSetup";

const ConnectAccount = () => {
  return (
    <div className="h-screen bg-background">
      <PageHeader
        title="Connect Account Setup"
        description="Set up your Stripe Connect account to receive payments from clients"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Payments", href: "/payments" },
          { label: "Connect Account" }
        ]}
        backTo="/payments"
      />

      <div className="max-w-7xl mx-auto p-6">
        <ConnectAccountSetup />
      </div>
    </div>
  );
};

export default ConnectAccount;
