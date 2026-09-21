/** Pure generated-asset schema; also supports a temporarily empty recording set. */
export interface HistoricalNarrationAsset {
  wonderId: string;
  captionId: string;
  captionText: string;
  src: string;
  duration: number;
  volume: number;
  voiceName: string;
  voiceId: string;
  provider: 'ElevenLabs';
  model: 'eleven_multilingual_v2';
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
    speed: number;
  };
  windowSeconds: number;
  sha256: string;
  bytes: number;
  mastering: {
    version: 'measured-limiter-v1';
    integratedLufs: number;
    truePeakDbtp: number;
    gainDb: number;
  };
}
