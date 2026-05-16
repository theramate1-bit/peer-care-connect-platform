// src/components/PricingInfo.tsx — optional callout for marketplace (session) fees
import { MARKETPLACE_FEE_DISPLAY } from "@/config/payments";

export default function PricingInfo() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center mb-2">
        <div className="text-blue-600 text-lg mr-2">💰</div>
        <h3 className="text-blue-800 font-semibold">Session pricing</h3>
      </div>
      <div className="text-blue-700 text-sm space-y-1">
        <p>
          <strong>Online card payments:</strong> Theramate applies a platform
          fee of <strong>{MARKETPLACE_FEE_DISPLAY}</strong> on the session total
          (same model as our live database billing). Practitioners receive the
          remainder after this fee.
        </p>
        <p>
          <strong>Pay at clinic:</strong> No platform fee on in-person /
          cash-at-clinic bookings where that option is enabled.
        </p>
        <p className="text-xs text-blue-600 mt-2">
          Subscription plans for practitioners are billed separately; see your
          billing settings.
        </p>
      </div>
    </div>
  );
}
