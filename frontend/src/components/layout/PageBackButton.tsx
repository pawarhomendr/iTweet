import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@/components/ui/Icons';

interface PageBackButtonProps {
  fallback?: string;
}

export const PageBackButton: React.FC<PageBackButtonProps> = ({ fallback = '/' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    const historyIndex = typeof window.history.state?.idx === 'number' ? window.history.state.idx : null;
    const sameOriginReferrer = document.referrer.startsWith(window.location.origin);
    if ((historyIndex !== null && historyIndex > 0) || (historyIndex === null && sameOriginReferrer)) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true, state: { from: location.pathname } });
  };

  return (
    <button type="button" className="page-back" onClick={goBack} aria-label="Go back" title="Go back">
      <ArrowLeftIcon />
      <span>Back</span>
    </button>
  );
};
