import React from 'react';
import OfficerPortal from '../components/reviewer/OfficerPortal';

/**
 * OfficerPage
 * Top-level page container for the internal bank compliance & forensic review console.
 */
export default function OfficerPage({ initialSessionId }) {
  return (
    <div className="w-full">
      <OfficerPortal initialSessionId={initialSessionId} />
    </div>
  );
}
