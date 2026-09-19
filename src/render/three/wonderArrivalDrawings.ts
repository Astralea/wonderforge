/** Original arrival elevations (Spec 05). Separate from construction geometry. */

export interface WonderArrivalDrawing {
  viewBox: readonly [number, number];
  outline: string;
  detail: string;
  extra: string;
  fillBottom: number;
  fillSpan: number;
  fillTop: number;
  waveCap: number;
  ground: { cx: number; cy: number; rx: number; ry: number };
}

const EIFFEL: WonderArrivalDrawing = {
  viewBox: [160, 246],
  outline:
    'M78 16 L82 16 L85 50 L91 108 L99 146 L114 183 L139 224 L111 224 Q100 186 80 186 Q60 186 49 224 L21 224 L46 183 L61 146 L69 108 L75 50 Z',
  detail:
    'M75 50H85 M72 78H88 M69 108H91 M65 127H95 M61 146H99 M54 164H106 M46 183H114 M33 204H56 M104 204H127 M75 50L88 78L69 108L95 127L61 146L106 164L46 183L56 204L21 224 M85 50L72 78L91 108L65 127L99 146L54 164L114 183L104 204L139 224',
  extra: 'M80 4V16 M64 107H96V113H64Z M51 161H109V167H51Z M72 48H88',
  fillBottom: 224,
  fillSpan: 208,
  fillTop: 0,
  waveCap: 198,
  ground: { cx: 80, cy: 231, rx: 62, ry: 3 },
};

const GIZA: WonderArrivalDrawing = {
  viewBox: [200, 140],
  outline:
    'M10 126 L48 126 L72 54 L86 86 L118 18 L176 126 L190 126 L190 132 L10 132 Z',
  detail:
    'M48 126 L72 54 L86 86 M86 86 L118 18 L176 126 M54 114 L70 70 M64 114 L74 82 M96 114 L116 42 M132 114 L118 48 M118 18 L124 32 L112 32 Z M28 126 L48 126 L40 102 Z',
  extra: 'M10 132 H190 M72 126 V114 M118 126 V96',
  fillBottom: 126,
  fillSpan: 108,
  fillTop: 12,
  waveCap: 108,
  ground: { cx: 100, cy: 134, rx: 88, ry: 3 },
};

const STONEHENGE: WonderArrivalDrawing = {
  viewBox: [220, 130],
  outline:
    'M18 108 L28 108 L28 62 L48 62 L48 108 L58 108 L58 48 L92 48 L92 108 L102 108 L102 38 L138 38 L138 108 L148 108 L148 52 L178 52 L178 108 L202 108 L202 114 L18 114 Z',
  detail:
    'M28 62 H48 M58 48 H92 M102 38 H138 M148 52 H178 M36 108 V70 M40 108 V70 M70 108 V56 M80 108 V56 M114 108 V46 M126 108 V46 M158 108 V60 M168 108 V60',
  extra: 'M12 114 H208 M88 108 L102 96 L112 108',
  fillBottom: 114,
  fillSpan: 80,
  fillTop: 28,
  waveCap: 96,
  ground: { cx: 110, cy: 118, rx: 96, ry: 3 },
};

const COLOSSEUM: WonderArrivalDrawing = {
  viewBox: [220, 150],
  outline:
    'M18 118 Q110 148 202 118 L196 58 Q110 18 24 58 Z',
  detail:
    'M28 112 Q110 138 192 112 M32 92 Q110 114 188 92 M36 72 Q110 90 184 72 M42 58 Q110 42 178 58 M48 118 V62 M72 124 V52 M110 128 V40 M148 124 V52 M172 118 V62',
  extra:
    'M54 108 Q62 96 70 108 M86 112 Q94 98 102 112 M118 112 Q126 98 134 112 M150 108 Q158 96 166 108 M54 88 Q62 78 70 88 M86 90 Q94 80 102 90 M118 90 Q126 80 134 90 M150 88 Q158 78 166 88',
  fillBottom: 132,
  fillSpan: 108,
  fillTop: 18,
  waveCap: 110,
  ground: { cx: 110, cy: 138, rx: 94, ry: 4 },
};

const PETRA: WonderArrivalDrawing = {
  viewBox: [180, 170],
  outline:
    'M8 158 L8 22 Q28 8 48 28 L48 48 L78 22 L102 48 L102 22 L132 8 L132 48 L152 28 Q172 12 172 32 L172 158 Z',
  detail:
    'M48 158 V64 H132 V158 M64 158 V88 H116 V158 M78 88 V70 H102 V88 M70 118 H110 M70 138 H110 M86 158 V128 H94 V158',
  extra: 'M78 70 Q90 52 102 70 M90 22 V8 M8 158 H172',
  fillBottom: 158,
  fillSpan: 140,
  fillTop: 8,
  waveCap: 138,
  ground: { cx: 90, cy: 162, rx: 78, ry: 3 },
};

const CHICHEN: WonderArrivalDrawing = {
  viewBox: [180, 160],
  outline:
    'M14 142 L42 142 L54 112 L66 112 L76 84 L86 84 L94 58 L104 58 L104 36 L124 36 L124 58 L134 58 L142 84 L152 84 L162 112 L166 142 L14 142 Z',
  detail:
    'M42 142 L54 112 H126 L138 142 M54 112 L66 84 H114 L126 112 M66 84 L76 58 H104 L114 84 M94 58 H124 V36 H104 V58 M88 142 V58 M120 142 V58',
  extra: 'M14 142 H166 M76 142 Q70 128 82 134 M112 142 Q118 128 106 134',
  fillBottom: 142,
  fillSpan: 108,
  fillTop: 28,
  waveCap: 122,
  ground: { cx: 90, cy: 148, rx: 80, ry: 3 },
};

const MACHU: WonderArrivalDrawing = {
  viewBox: [200, 150],
  outline:
    'M8 128 L46 58 L68 86 L96 22 L128 70 L168 42 L192 128 L192 134 L8 134 Z',
  detail:
    'M22 128 H120 M32 116 H112 M44 104 H104 M54 92 H96 M64 80 H88 M72 128 V88 H108 L116 78 H140 V128',
  extra: 'M96 22 L104 40 L88 38 Z M8 134 H192',
  fillBottom: 134,
  fillSpan: 112,
  fillTop: 16,
  waveCap: 114,
  ground: { cx: 100, cy: 138, rx: 88, ry: 3 },
};

const ANGKOR: WonderArrivalDrawing = {
  viewBox: [200, 160],
  outline:
    'M16 138 L16 108 L36 108 L28 78 L48 78 L40 52 L60 52 L50 22 L70 22 L60 8 L80 8 L90 22 L110 22 L100 8 L120 8 L130 22 L150 22 L140 52 L160 52 L152 78 L172 78 L164 108 L184 108 L184 138 Z',
  detail:
    'M16 138 H184 M36 108 H164 M48 78 H152 M60 52 H140 M70 22 H130 M80 8 H120 M70 138 V108 M100 138 V52 M130 138 V108',
  extra: 'M50 22 Q70 4 90 22 M100 8 Q110 0 120 8 M110 22 Q130 4 150 22',
  fillBottom: 138,
  fillSpan: 124,
  fillTop: 6,
  waveCap: 118,
  ground: { cx: 100, cy: 144, rx: 86, ry: 3 },
};

const FORBIDDEN: WonderArrivalDrawing = {
  viewBox: [200, 150],
  outline:
    'M20 132 L20 118 L40 118 L40 78 L16 78 L100 42 L184 78 L160 78 L160 118 L180 118 L180 132 Z',
  detail:
    'M40 118 H160 M52 118 V78 M80 118 V90 H120 V118 M148 118 V78 M16 78 L100 42 L184 78 M36 68 L100 38 L164 68',
  extra: 'M100 42 V28 M20 132 H180 M88 132 V118 M112 132 V118',
  fillBottom: 132,
  fillSpan: 104,
  fillTop: 22,
  waveCap: 112,
  ground: { cx: 100, cy: 138, rx: 86, ry: 3 },
};

const SYDNEY: WonderArrivalDrawing = {
  viewBox: [220, 140],
  outline:
    'M16 114 L16 98 L48 98 Q72 42 110 98 Q132 28 176 98 L204 98 L204 114 Z',
  detail:
    'M48 98 Q68 58 92 98 M72 98 Q96 36 128 98 M110 98 Q138 32 168 98 M48 98 H204 M28 114 H196',
  extra: 'M110 48 L118 28 L128 46 M154 40 L164 18 L174 38',
  fillBottom: 114,
  fillSpan: 92,
  fillTop: 16,
  waveCap: 96,
  ground: { cx: 110, cy: 122, rx: 96, ry: 4 },
};

export const WONDER_ARRIVAL_DRAWINGS: Record<string, WonderArrivalDrawing> = {
  'eiffel-tower': EIFFEL,
  'pyramids-of-giza': GIZA,
  stonehenge: STONEHENGE,
  colosseum: COLOSSEUM,
  petra: PETRA,
  'chichen-itza': CHICHEN,
  'machu-picchu': MACHU,
  'angkor-wat': ANGKOR,
  'forbidden-city': FORBIDDEN,
  'sydney-opera-house': SYDNEY,
};

export const ARRIVAL_PENDING_STAGE: Record<string, string> = {
  'pyramids-of-giza': 'Plateau',
  stonehenge: 'Downs',
  colosseum: 'Valley',
  petra: 'Siq',
  'chichen-itza': 'Terrace',
  'machu-picchu': 'Ridge',
  'angkor-wat': 'Causeway',
  'forbidden-city': 'Axis',
  'sydney-opera-house': 'Harbour',
};

export function arrivalDrawingFor(id: string): WonderArrivalDrawing {
  return WONDER_ARRIVAL_DRAWINGS[id] ?? GIZA;
}

export function arrivalStageFor(id: string): string {
  if (id === 'eiffel-tower') return 'City';
  return ARRIVAL_PENDING_STAGE[id] ?? 'Ground';
}

export function arrivalPlaceFor(location: string, completedYear: number): string {
  const city = location.split(',')[0]!.trim();
  if (completedYear < 0) return `${city} · c. ${Math.abs(completedYear)} BC`;
  if (completedYear < 1000) return `${city} · ${completedYear} AD`;
  return `${city} · ${completedYear}`;
}
