import { useId } from 'react';
import type { Wonder } from '../../data/types';
import './eiffelLoading.css';
import {
  arrivalDrawingFor,
  arrivalPlaceFor,
} from './wonderArrivalDrawings';

const EIFFEL_WAVE =
  'M-80 16 Q-60 0 -40 16 T0 16 T40 16 T80 16 T120 16 T160 16 T200 16 T240 16';

function waveCrest(width: number): string {
  if (width === 160) return EIFFEL_WAVE;
  const start = -80;
  const end = Math.ceil((width + 160) / 40) * 40;
  let path = `M${start} 16 Q${start + 20} 0 ${start + 40} 16`;
  for (let x = start + 80; x <= end; x += 40) path += ` T${x} 16`;
  return path;
}

export function WonderArrival({
  wonder,
  percent,
  stage,
}: {
  wonder: Wonder;
  percent: number;
  stage: string;
}) {
  const fillClipId = useId();
  const monumentClipId = useId();
  const drawing = arrivalDrawingFor(wonder.id);
  const [width, height] = drawing.viewBox;
  const progress = Math.max(0, Math.min(100, percent));
  const fillY =
    progress === 100 ? drawing.fillTop : drawing.fillBottom - (drawing.fillSpan * progress) / 100;
  const waveY = Math.min(fillY, drawing.waveCap);
  const hasWave = progress < 100;
  const crest = waveCrest(width);
  const isEiffel = wonder.id === 'eiffel-tower';
  return (
    <div
      className="eiffel-arrival"
      data-testid={isEiffel ? 'eiffel-arrival' : 'wonder-arrival'}
      data-wonder={wonder.id}
      data-empty={progress === 0}
    >
      <div className="eiffel-arrival-haze" />
      <div className="eiffel-arrival-panel">
        <p className="eiffel-arrival-place">{arrivalPlaceFor(wonder.location, wonder.completedYear)}</p>
        <div
          role="progressbar"
          aria-label={`Loading ${wonder.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={`${progress}% prepared · ${stage}`}
        >
          <div
            className="eiffel-arrival-tower-frame"
            data-testid={isEiffel ? 'eiffel-arrival-tower-frame' : 'wonder-arrival-frame'}
            style={{
              aspectRatio: `${width} / ${height}`,
              ['--fill-y' as string]: String(fillY),
              ['--wave-y' as string]: String(waveY),
            }}
          >
            <svg
              className="eiffel-arrival-tower"
              viewBox={`0 0 ${width} ${height}`}
              aria-hidden="true"
            >
              <defs>
                <clipPath
                  id={fillClipId}
                  transform={`translate(0 ${fillY})`}
                  data-testid={isEiffel ? 'eiffel-loading-fill' : 'wonder-arrival-fill'}
                >
                  <rect x="0" y="0" width={width} height={height} />
                </clipPath>
                <clipPath id={monumentClipId}>
                  <path d={drawing.outline} clipRule={drawing.fillRule} />
                </clipPath>
              </defs>
              <ellipse
                cx={drawing.ground.cx}
                cy={drawing.ground.cy}
                rx={drawing.ground.rx}
                ry={drawing.ground.ry}
                className="eiffel-arrival-ground"
              />
              <g className="eiffel-arrival-skeleton">
                <path d={drawing.outline} />
                <path d={drawing.detail} />
                <path d={drawing.extra} />
              </g>
              <g clipPath={`url(#${fillClipId})`} className="eiffel-arrival-filled">
                <path d={drawing.outline} fillRule={drawing.fillRule} className="eiffel-arrival-surface" />
                <path d={drawing.outline} />
                <path d={drawing.detail} />
                <path d={drawing.extra} />
              </g>
              {hasWave && (
                <g clipPath={`url(#${monumentClipId})`} className="eiffel-arrival-liquid">
                  <rect
                    className="eiffel-arrival-pool"
                    x="0"
                    y={waveY}
                    width={width}
                    height="22"
                  />
                  <g transform={`translate(0 ${waveY - 16})`}>
                    <g
                      className="eiffel-arrival-wave"
                      data-testid={isEiffel ? 'eiffel-loading-wave' : 'wonder-arrival-wave'}
                    >
                      <path className="eiffel-arrival-wave-body" d={`${crest} V28 H-80 Z`} />
                      <path className="eiffel-arrival-wave-line" d={crest} />
                    </g>
                  </g>
                </g>
              )}
            </svg>
          </div>
        </div>
        <h2 className="eiffel-arrival-title">Loading {wonder.name}…</h2>
        <p className="eiffel-arrival-status" role="status">
          <span>{stage}</span>
          <span className="eiffel-arrival-percent">{progress}%</span>
        </p>
      </div>
    </div>
  );
}
