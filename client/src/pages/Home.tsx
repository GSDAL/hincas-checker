import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import HincasValidator from '@/components/HincasValidator';
import HincasValidatorWizard from '@/components/HincasValidatorWizard';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';

/**
 * Design Philosophy: Industrial Minimalista
 * - Precision and clarity for critical validation tasks
 * - Monochromatic palette with validation accents (green/red)
 * - Clear hierarchy and immediate visual feedback
 * - Trusted, reliable appearance for technical tools
 */
export default function Home() {
  const [location, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<'wizard' | 'classic' | 'history'>('wizard');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'classic') {
      setViewMode('classic');
    } else if (view === 'history') {
      setViewMode('history');
    } else {
      setViewMode('wizard');
    }
  }, [location]);

  const handleViewChange = (mode: 'wizard' | 'classic' | 'history') => {
    setViewMode(mode);
    if (mode === 'wizard') {
      setLocation('/');
    } else {
      setLocation(`/?view=${mode}`);
    }
  };

  // If viewing history, use classic component with history shown
  if (viewMode === 'history') {
    return (
      <div className="min-h-screen">
        <HincasValidator initialShowHistory={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* View Mode Toggle */}
      <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-slate-200 p-2 flex gap-2">
        <Button
          onClick={() => handleViewChange('wizard')}
          variant={viewMode === 'wizard' ? 'default' : 'outline'}
          size="sm"
          className={viewMode === 'wizard' ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          <LayoutGrid className="w-4 h-4 mr-2" />
          Wizard
        </Button>
        <Button
          onClick={() => handleViewChange('classic')}
          variant={viewMode === 'classic' ? 'default' : 'outline'}
          size="sm"
          className={viewMode === 'classic' ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          <List className="w-4 h-4 mr-2" />
          Clásica
        </Button>
      </div>

      {viewMode === 'wizard' ? <HincasValidatorWizard /> : <HincasValidator />}
    </div>
  );
}
