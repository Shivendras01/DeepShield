import React from 'react';
import ApplicantPortal from '../components/applicant/ApplicantPortal';

/**
 * ApplicantPage
 * Top-level page container for the candidate-facing e-KYC flow.
 */
export default function ApplicantPage({ onScreeningComplete }) {
  return (
    <div className="w-full">
      <ApplicantPortal onScreeningComplete={onScreeningComplete} />
    </div>
  );
}
