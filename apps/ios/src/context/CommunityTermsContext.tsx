import { createContext, useContext } from 'react';

export const CommunityTermsContext = createContext<(() => Promise<void>) | null>(null);

export function useAcceptCommunityTerms() {
  const accept = useContext(CommunityTermsContext);
  if (!accept) throw new Error('CommunityTermsContext is missing');
  return accept;
}
