import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { RealMessagingInterface } from "@/components/messaging/RealMessagingInterface";

const Messages = () => {
  return (
    <div className="h-screen bg-background">
      <PageHeader 
        title="Secure Messaging"
        description="Communicate securely with therapists and clients with end-to-end encryption"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Messages" }
        ]}
        backTo="/dashboard"
      />
      
      <RealMessagingInterface />
    </div>
  );
};

export default Messages;