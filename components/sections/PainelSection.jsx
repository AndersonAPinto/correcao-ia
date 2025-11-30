'use client';

import { FeaturesSectionWithHoverEffects } from '@/components/ui/feature-section-with-hover-effects';


export default function PainelSection({ onUploadSuccess, setActiveView }) {
  

  return (
    <div className="space-y-1">

      <FeaturesSectionWithHoverEffects setActiveView={setActiveView} />

    </div>
  );
}
