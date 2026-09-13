import { useId } from 'react';
import './eiffelLoading.css';

// Original elevation drawing: arch, splayed legs, two platforms and summit.
// This illustration is deliberately separate from construction geometry.
const outline =
  'M78 16 L82 16 L85 50 L91 108 L99 146 L114 183 L139 224 L111 224 Q100 186 80 186 Q60 186 49 224 L21 224 L46 183 L61 146 L69 108 L75 50 Z';
const lattice =
  'M75 50H85 M72 78H88 M69 108H91 M65 127H95 M61 146H99 M54 164H106 M46 183H114 M33 204H56 M104 204H127 M75 50L88 78L69 108L95 127L61 146L106 164L46 183L56 204L21 224 M85 50L72 78L91 108L65 127L99 146L54 164L114 183L104 204L139 224';
const waveCrest =
  'M-80 16 Q-60 0 -40 16 T0 16 T40 16 T80 16 T120 16 T160 16 T200 16 T240 16';

export function EiffelLoading({
  percent,
  stage,
}: {
  percent: number;
  stage: string;
}) {
  const fillClipId = useId();
  const towerClipId = useId();
  const progress = Math.max(0, Math.min(100, percent));
  const fillY = progress === 100 ? 0 : 224 - (208 * progress) / 100;
  const waveY = Math.min(fillY, 198);
  const hasWave = progress < 100;
  return (
    <div className="eiffel-arrival" data-testid="eiffel-arrival" data-empty={progress === 0}>
      <div className="eiffel-arrival-haze" />
      <div className="eiffel-arrival-panel">
        <p className="eiffel-arrival-place">Paris · 1889</p>
        <div
          role="progressbar"
          aria-label="Loading Eiffel Tower"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={`${progress}% prepared · ${stage}`}
        >
          <div
            className="eiffel-arrival-tower-frame"
            data-testid="eiffel-arrival-tower-frame"
            style={{ ['--fill-y' as string]: String(fillY), ['--wave-y' as string]: String(waveY) }}
          >
            <svg
              className="eiffel-arrival-tower"
              viewBox="0 0 160 246"
              aria-hidden="true"
            >
              <defs>
                <clipPath id={fillClipId} transform={`translate(0 ${fillY})`} data-testid="eiffel-loading-fill">
                  <rect x="0" y="0" width="160" height="246" />
                </clipPath>
                <clipPath id={towerClipId}>
                  <path d={outline} />
                </clipPath>
              </defs>
              <ellipse
                cx="80"
                cy="231"
                rx="62"
                ry="3"
                className="eiffel-arrival-ground"
              />
              <g className="eiffel-arrival-skeleton">
                <path d={outline} />
                <path d={lattice} />
                <path d="M80 4V16 M64 107H96V113H64Z M51 161H109V167H51Z M72 48H88" />
              </g>
              <g clipPath={`url(#${fillClipId})`} className="eiffel-arrival-filled">
                <path d={outline} className="eiffel-arrival-surface" />
                <path d={outline} />
                <path d={lattice} />
                <path d="M80 4V16 M64 107H96V113H64Z M51 161H109V167H51Z M72 48H88" />
              </g>
              {hasWave && (
                <g clipPath={`url(#${towerClipId})`} className="eiffel-arrival-liquid">
                  <rect
                    className="eiffel-arrival-pool"
                    x="0"
                    y={waveY}
                    width="160"
                    height="22"
                  />
                  <g transform={`translate(0 ${waveY - 16})`}>
                    <g className="eiffel-arrival-wave" data-testid="eiffel-loading-wave">
                      <path className="eiffel-arrival-wave-body" d={`${waveCrest} V28 H-80 Z`} />
                      <path className="eiffel-arrival-wave-line" d={waveCrest} />
                    </g>
                  </g>
                </g>
              )}
            </svg>
          </div>
        </div>
        <h2 className="eiffel-arrival-title">Eiffel Tower</h2>
        <p className="eiffel-arrival-status" role="status">
          <span>{stage}</span>
          <span className="eiffel-arrival-percent">{progress}%</span>
        </p>
        <p className="eiffel-arrival-caption">
          An iron landmark, piece by piece.
        </p>
      </div>
    </div>
  );
}
