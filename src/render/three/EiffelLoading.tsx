import { getWonder } from '../../data';
import { WonderArrival } from './WonderArrival';

export function EiffelLoading({
  percent,
  stage,
}: {
  percent: number;
  stage: string;
}) {
  return <WonderArrival wonder={getWonder('eiffel-tower')} percent={percent} stage={stage} />;
}
