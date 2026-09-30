export const dynamic = 'force-dynamic';
export const revalidate = 0;

import ResultClient from './ResultClient';

export default async function ResultPage({ params }: { params: Promise<{ sessionId: string }> | { sessionId: string } }) {
  const resolvedParams = await Promise.resolve(params);
  const rawSessionId = resolvedParams?.sessionId;
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId || '';

  return <ResultClient sessionId={sessionId} />;
}
