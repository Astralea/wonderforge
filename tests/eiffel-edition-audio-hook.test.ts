// @vitest-environment jsdom
import {act,cleanup,renderHook} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {useSoundtrack,primeSoundtrack} from '../src/ui/useSoundtrack';
import {trackFor} from '../src/data/soundtrack';
import {createInitialState,usePlaybackStore} from '../src/store/playback';
import {useAudioStore} from '../src/store/audio';
import {eiffelFilmEditDuration} from '../src/engine/eiffelFilmEdit';
vi.mock('../src/ui/a11y',()=>({prefersReducedMotion:()=>false}));

class AudioDouble extends EventTarget{
  src:string;loop=false;volume=1;preload='';preservesPitch=false;muted=false;currentTime=0;playbackRate=1;paused=true;
  readyState=4;ended=false;error:{code:number}|null=null;
  constructor(src:string){super();this.src=src;instances.push(this);}
  play=vi.fn(()=>{this.paused=false;});pause=vi.fn(()=>{this.paused=true;});load=vi.fn();
  removeAttribute=vi.fn((name:string)=>{if(name==='src')this.src='';});
}
const instances:AudioDouble[]=[];
afterEach(()=>{cleanup();vi.unstubAllGlobals();instances.length=0;usePlaybackStore.setState(createInitialState());useAudioStore.setState({muted:false,unlocked:false});});
it('replaces and disposes the selected edition score, seeks and resumes without automatic looping',()=>{
  vi.stubGlobal('Audio',AudioDouble);
  usePlaybackStore.setState({...createInitialState(),wonderId:'eiffel-tower',eiffelEdit:'detailed',durationMs:eiffelFilmEditDuration('detailed')*1000,status:'playing',t:.4,assetsReady:true});
  const mounted=renderHook(()=>useSoundtrack('eiffel-tower','cinematic'));
  expect(instances).toHaveLength(1);const old=instances[0]!;
  expect(old.src).toBe(trackFor('eiffel-tower','cinematic','detailed')!.src);expect(old.loop).toBe(false);expect(old.preservesPitch).toBe(true);
  expect(old.currentTime).toBeCloseTo(trackFor('eiffel-tower','cinematic','detailed')!.duration*.4,8);
  act(()=>usePlaybackStore.getState().setEiffelEdit('cinematic'));
  expect(instances).toHaveLength(2);const short=instances[1]!;
  expect(old.pause).toHaveBeenCalled();expect(old.removeAttribute).toHaveBeenCalledWith('src');expect(old.load).toHaveBeenCalled();
  expect(short.src).toBe(trackFor('eiffel-tower','cinematic','cinematic')!.src);expect(short.loop).toBe(false);expect(short.currentTime).toBe(0);
  act(()=>{usePlaybackStore.getState().seek(.8);usePlaybackStore.getState().play();});
  expect(short.currentTime).toBeCloseTo(trackFor('eiffel-tower','cinematic','cinematic')!.duration*.8,8);expect(short.paused).toBe(false);
  act(()=>{usePlaybackStore.getState().pause();usePlaybackStore.getState().seek(.1);});expect(short.paused).toBe(true);expect(short.currentTime).toBeCloseTo(trackFor('eiffel-tower','cinematic','cinematic')!.duration*.1,8);
  mounted.unmount();expect(short.removeAttribute).toHaveBeenCalledWith('src');expect(short.load).toHaveBeenCalled();
});

it('keeps BGM at native speed without tick-driven seeks at 1x, 2x or 4x',()=>{
  vi.stubGlobal('Audio',AudioDouble);
  usePlaybackStore.setState(createInitialState());
  const state=usePlaybackStore.getState();state.select('eiffel-tower');state.play();
  renderHook(()=>useSoundtrack('eiffel-tower','cinematic'));
  const audio=instances[0]!;
  for(const speed of [1,2,4] as const){
    audio.currentTime=12;
    act(()=>{state.setSpeed(speed);state.tick(2000);});
    expect(audio.playbackRate).toBe(1);expect(audio.currentTime).toBe(12);
    expect(audio.paused).toBe(false);
  }
  act(()=>state.pause());expect(audio.paused).toBe(true);
  act(()=>state.play());expect(audio.currentTime).toBe(12);expect(audio.paused).toBe(false);
  expect(audio.src).toBe(trackFor('eiffel-tower','cinematic','cinematic')!.src);
  act(()=>state.seek(.8));expect(audio.currentTime).toBeCloseTo(trackFor('eiffel-tower','cinematic','cinematic')!.duration*.8);
  act(()=>state.seek(.1));expect(audio.currentTime).toBeCloseTo(trackFor('eiffel-tower','cinematic','cinematic')!.duration*.1);
  act(()=>state.replay());expect(audio.currentTime).toBe(0);
  audio.currentTime=20;
  act(()=>state.tick(1000000));expect(audio.paused).toBe(true);expect(audio.currentTime).toBe(20);
});

it('does not restart a looping ambient bed on a native loop wrap',()=>{
  vi.stubGlobal('Audio',AudioDouble);
  renderHook(()=>useSoundtrack('pyramids-of-giza','ambient'));
  const audio=instances[0]!;
  expect(audio.loop).toBe(true);
  expect(audio.play).toHaveBeenCalledTimes(1);
  audio.currentTime=0;audio.paused=true;
  act(()=>{audio.dispatchEvent(new Event('pause'));audio.dispatchEvent(new Event('canplay'));});
  expect(audio.play).toHaveBeenCalledTimes(1);
  audio.currentTime=12;audio.paused=true;
  act(()=>audio.dispatchEvent(new Event('pause')));
  expect(audio.play).toHaveBeenCalledTimes(1);
  audio.currentTime=29.5;audio.paused=true;
  act(()=>audio.dispatchEvent(new Event('ended')));
  expect(audio.currentTime).toBe(0);
  expect(audio.play).toHaveBeenCalledTimes(2);
});

it('does not layer another ambient decoder when title/catalog chrome is clicked',()=>{
  vi.stubGlobal('Audio',AudioDouble);
  renderHook(()=>useSoundtrack('pyramids-of-giza','ambient'));
  const audio=instances[0]!;
  expect(instances).toHaveLength(1);
  expect(audio.play).toHaveBeenCalledTimes(1);
  audio.paused=false;
  act(()=>{
    window.dispatchEvent(new Event('pointerdown'));
    audio.dispatchEvent(new Event('pause'));
    audio.dispatchEvent(new Event('canplay'));
  });
  expect(instances).toHaveLength(1);
  expect(audio.play).toHaveBeenCalledTimes(1);
});

it('shares one ambient bed across duplicate mounts instead of layering decoders',()=>{
  vi.stubGlobal('Audio',AudioDouble);
  const first=renderHook(()=>useSoundtrack('pyramids-of-giza','ambient'));
  renderHook(()=>useSoundtrack('pyramids-of-giza','ambient'));
  expect(instances).toHaveLength(1);
  expect(instances[0]!.play).toHaveBeenCalled();
  expect(instances[0]!.removeAttribute).not.toHaveBeenCalled();
  first.unmount();
  expect(instances[0]!.src).toBe(trackFor('pyramids-of-giza','ambient')!.src);
});
it('cancels denied autoplay across ticks, pause and late promise rejection', async()=>{
  const rejections: Array<(error: Error)=>void> = [];
  class DeniedAudio extends AudioDouble {
    play=vi.fn(()=>new Promise<void>((_resolve,reject)=>rejections.push(reject)));
  }
  vi.stubGlobal('Audio',DeniedAudio);
  usePlaybackStore.setState({...createInitialState(),wonderId:'eiffel-tower',status:'playing'});
  const mounted=renderHook(()=>useSoundtrack('eiffel-tower','cinematic'));
  const audio=instances[0]!;
  await act(async()=>{rejections.shift()!(new DOMException('Autoplay denied','NotAllowedError'));await Promise.resolve();});
  act(()=>{usePlaybackStore.getState().tick(1000);usePlaybackStore.getState().tick(1000);});
  expect(audio.play).toHaveBeenCalledTimes(1);
  act(()=>usePlaybackStore.getState().pause());
  window.dispatchEvent(new Event('pointerdown'));window.dispatchEvent(new Event('keydown'));
  expect(audio.play).toHaveBeenCalledTimes(1);
  act(()=>usePlaybackStore.getState().play());
  expect(audio.play).toHaveBeenCalledTimes(2);
  mounted.unmount();
  await act(async()=>{rejections.shift()!(new Error('Late rejection'));await Promise.resolve();});
  window.dispatchEvent(new Event('pointerdown'));window.dispatchEvent(new Event('keydown'));
  expect(audio.play).toHaveBeenCalledTimes(2);
});


it('recovers a browser pause after resolved playback without seeking, including unmute', async()=>{
  class ResolvedAudio extends AudioDouble {
    play=vi.fn(()=>{this.paused=false;return Promise.resolve();});
  }
  vi.stubGlobal('Audio',ResolvedAudio);
  useAudioStore.setState({muted:true});
  usePlaybackStore.setState({...createInitialState(),wonderId:'eiffel-tower',status:'playing'});
  renderHook(()=>useSoundtrack('eiffel-tower','cinematic'));
  const audio=instances[0]!;
  await act(async()=>{await Promise.resolve();});
  audio.currentTime=38;
  audio.paused=true;
  act(()=>useAudioStore.getState().setMuted(false));
  await act(async()=>{await Promise.resolve();});
  expect(audio.play).toHaveBeenCalledTimes(2);
  expect(audio.currentTime).toBe(38);expect(audio.muted).toBe(false);
  audio.paused=true;
  await act(async()=>{audio.dispatchEvent(new Event('pause'));await Promise.resolve();});
  expect(audio.play).toHaveBeenCalledTimes(3);expect(audio.currentTime).toBe(38);
  act(()=>usePlaybackStore.getState().pause());
  audio.dispatchEvent(new Event('pause'));audio.dispatchEvent(new Event('canplay'));
  expect(audio.play).toHaveBeenCalledTimes(3);
});

it('reloads transient network failures only twice and restores the native score position',()=>{
  vi.stubGlobal('Audio',AudioDouble);
  usePlaybackStore.setState({...createInitialState(),wonderId:'eiffel-tower',status:'playing'});
  const mounted=renderHook(()=>useSoundtrack('eiffel-tower','cinematic'));
  const audio=instances[0]!;
  audio.currentTime=27;
  audio.error={code:2};audio.paused=true;
  act(()=>audio.dispatchEvent(new Event('error')));
  expect(audio.load).toHaveBeenCalledTimes(1);
  audio.currentTime=0;audio.error=null;
  act(()=>{audio.dispatchEvent(new Event('loadedmetadata'));audio.dispatchEvent(new Event('canplay'));});
  expect(audio.currentTime).toBe(27);expect(audio.play).toHaveBeenCalledTimes(2);
  for(let failure=0;failure<4;failure++){
    audio.error={code:2};audio.paused=true;
    act(()=>audio.dispatchEvent(new Event('error')));
    audio.error=null;
    act(()=>audio.dispatchEvent(new Event('canplay')));
  }
  expect(audio.load).toHaveBeenCalledTimes(2);
  expect(audio.play).toHaveBeenCalledTimes(3);
  act(()=>{usePlaybackStore.getState().tick(1000);usePlaybackStore.getState().tick(1000);});
  expect(audio.load).toHaveBeenCalledTimes(2);expect(audio.play).toHaveBeenCalledTimes(3);
  mounted.unmount();
  audio.dispatchEvent(new Event('canplay'));audio.dispatchEvent(new Event('error'));
  expect(audio.play).toHaveBeenCalledTimes(3);
});

it('waits for a gesture only for policy denial and cancels readiness recovery while paused',async()=>{
  class PolicyAudio extends AudioDouble {
    play=vi.fn(()=>Promise.reject(new DOMException('Policy','NotAllowedError')));
  }
  vi.stubGlobal('Audio',PolicyAudio);
  usePlaybackStore.setState({...createInitialState(),wonderId:'eiffel-tower',status:'playing'});
  const mounted=renderHook(()=>useSoundtrack('eiffel-tower','cinematic'));
  const audio=instances[0]!;
  await act(async()=>{await Promise.resolve();});
  audio.dispatchEvent(new Event('canplay'));
  expect(audio.play).toHaveBeenCalledTimes(1);
  await act(async()=>{window.dispatchEvent(new Event('pointerdown'));await Promise.resolve();});
  expect(audio.play).toHaveBeenCalledTimes(2);
  mounted.unmount();

  class InterruptedAudio extends AudioDouble {
    readyState=0;
    play=vi.fn(()=>Promise.reject(new DOMException('Loading','AbortError')));
  }
  vi.stubGlobal('Audio',InterruptedAudio);
  renderHook(()=>useSoundtrack('eiffel-tower','cinematic'));
  const interrupted=instances[1]!;
  await act(async()=>{await Promise.resolve();});
  window.dispatchEvent(new Event('pointerdown'));
  expect(interrupted.play).toHaveBeenCalledTimes(1);
  act(()=>usePlaybackStore.getState().pause());
  interrupted.dispatchEvent(new Event('canplay'));
  expect(interrupted.play).toHaveBeenCalledTimes(1);
});

it('does not convert unsupported media into gesture or animation-tick retries',async()=>{
  class UnsupportedAudio extends AudioDouble {
    play=vi.fn(()=>Promise.reject(new DOMException('Unsupported','NotSupportedError')));
  }
  vi.stubGlobal('Audio',UnsupportedAudio);
  usePlaybackStore.setState({...createInitialState(),wonderId:'eiffel-tower',status:'playing'});
  renderHook(()=>useSoundtrack('eiffel-tower','cinematic'));
  const audio=instances[0]!;
  await act(async()=>{await Promise.resolve();});
  act(()=>{usePlaybackStore.getState().tick(1000);window.dispatchEvent(new Event('pointerdown'));audio.dispatchEvent(new Event('canplay'));});
  expect(audio.play).toHaveBeenCalledTimes(1);expect(audio.load).not.toHaveBeenCalled();
});


it('recovers stalled initial loading, cancels its old promise, and resumes after readiness',async()=>{
  let rejectOld:(reason:Error)=>void=()=>{};
  class StalledAudio extends AudioDouble {
    readyState=0;
    play=vi.fn().mockImplementationOnce(()=>new Promise<void>((_resolve,reject)=>{rejectOld=reject;}))
      .mockImplementation(()=>{this.paused=false;return Promise.resolve();});
  }
  vi.stubGlobal('Audio',StalledAudio);
  usePlaybackStore.setState({...createInitialState(),wonderId:'eiffel-tower',status:'playing'});
  renderHook(()=>useSoundtrack('eiffel-tower','cinematic'));
  const audio=instances[0]!;
  audio.currentTime=14;
  act(()=>audio.dispatchEvent(new Event('stalled')));
  expect(audio.load).toHaveBeenCalledTimes(1);
  await act(async()=>{rejectOld(new DOMException('Interrupted by load','AbortError'));await Promise.resolve();});
  audio.currentTime=0;audio.readyState=4;
  await act(async()=>{audio.dispatchEvent(new Event('canplay'));await Promise.resolve();});
  expect(audio.play).toHaveBeenCalledTimes(2);expect(audio.currentTime).toBe(14);
  act(()=>audio.dispatchEvent(new Event('stalled')));
  expect(audio.load).toHaveBeenCalledTimes(1);
});

it('bounds interruptions when media is already ready and never retries them on film ticks',async()=>{
  class InterruptedAudio extends AudioDouble {
    play=vi.fn(()=>Promise.reject(new DOMException('Interrupted','AbortError')));
  }
  vi.stubGlobal('Audio',InterruptedAudio);
  usePlaybackStore.setState({...createInitialState(),wonderId:'eiffel-tower',status:'playing'});
  renderHook(()=>useSoundtrack('eiffel-tower','cinematic'));
  const audio=instances[0]!;
  await act(async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();});
  expect(audio.play).toHaveBeenCalledTimes(3);
  act(()=>{usePlaybackStore.getState().tick(1000);usePlaybackStore.getState().tick(1000);audio.dispatchEvent(new Event('canplay'));});
  expect(audio.play).toHaveBeenCalledTimes(3);
});


it('retries a Chromium pre-metadata format error received before scene assets are ready',async()=>{
  class InitialFailureAudio extends AudioDouble {
    readyState=0;
    error={code:4};
  }
  vi.stubGlobal('Audio',InitialFailureAudio);
  usePlaybackStore.setState({...createInitialState(),wonderId:'eiffel-tower',status:'playing',assetsReady:false});
  renderHook(()=>useSoundtrack('eiffel-tower','cinematic'));
  const audio=instances[0]!;
  audio.dispatchEvent(new Event('error'));
  expect(audio.load).not.toHaveBeenCalled();expect(audio.play).not.toHaveBeenCalled();
  act(()=>usePlaybackStore.setState({assetsReady:true}));
  expect(audio.load).toHaveBeenCalledTimes(1);expect(audio.play).not.toHaveBeenCalled();
  audio.error=null;audio.readyState=4;
  act(()=>{audio.dispatchEvent(new Event('loadedmetadata'));audio.dispatchEvent(new Event('canplay'));});
  expect(audio.play).toHaveBeenCalledTimes(1);expect(audio.paused).toBe(false);
});

it('bounds repeated pre-metadata unsupported failures and ignores late rejected play promises',async()=>{
  let rejectOld:(error:Error)=>void=()=>{};
  class InitialFailureAudio extends AudioDouble {
    readyState=0;
    play=vi.fn(()=>new Promise<void>((_resolve,reject)=>{rejectOld=reject;}));
  }
  vi.stubGlobal('Audio',InitialFailureAudio);
  usePlaybackStore.setState({...createInitialState(),wonderId:'eiffel-tower',status:'playing'});
  renderHook(()=>useSoundtrack('eiffel-tower','cinematic'));
  const audio=instances[0]!;
  audio.error={code:4};
  act(()=>audio.dispatchEvent(new Event('error')));
  expect(audio.load).toHaveBeenCalledTimes(1);
  await act(async()=>{rejectOld(new DOMException('Format error','NotSupportedError'));await Promise.resolve();});
  expect(audio.load).toHaveBeenCalledTimes(1);
  for(let failure=0;failure<4;failure++)act(()=>audio.dispatchEvent(new Event('error')));
  expect(audio.load).toHaveBeenCalledTimes(2);
  act(()=>{usePlaybackStore.getState().tick(1000);window.dispatchEvent(new Event('pointerdown'));audio.dispatchEvent(new Event('canplay'));});
  expect(audio.load).toHaveBeenCalledTimes(2);expect(audio.play).toHaveBeenCalledTimes(1);
});

it('also retries a pre-metadata NotSupportedError before the media error event arrives',async()=>{
  class InitialFailureAudio extends AudioDouble {
    readyState=0;
    play=vi.fn(()=>Promise.reject(new DOMException('Initial load failed','NotSupportedError')));
  }
  vi.stubGlobal('Audio',InitialFailureAudio);
  usePlaybackStore.setState({...createInitialState(),wonderId:'eiffel-tower',status:'playing'});
  renderHook(()=>useSoundtrack('eiffel-tower','cinematic'));
  const audio=instances[0]!;
  await act(async()=>{await Promise.resolve();});
  expect(audio.load).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new Event('pointerdown'));
  expect(audio.play).toHaveBeenCalledTimes(1);
});

it('reuses a bed primed inside the catalog click instead of constructing a second decoder',()=>{
  vi.stubGlobal('Audio',AudioDouble);
  usePlaybackStore.setState({...createInitialState(),wonderId:'colosseum',status:'idle',assetsReady:true});
  primeSoundtrack('colosseum','cinematic');
  expect(instances).toHaveLength(1);
  const primed=instances[0]!;
  expect(primed.src).toBe(trackFor('colosseum','cinematic')!.src);
  expect(primed.play).toHaveBeenCalledTimes(1);
  usePlaybackStore.setState({status:'playing',assetsReady:true});
  renderHook(()=>useSoundtrack('colosseum','cinematic'));
  expect(instances).toHaveLength(1);
  expect(primed.paused).toBe(false);
});

it('does not pause a primed cinematic bed when the canvas marks assets unready',()=>{
  vi.stubGlobal('Audio',AudioDouble);
  usePlaybackStore.setState({...createInitialState(),wonderId:'colosseum',status:'playing',assetsReady:true});
  primeSoundtrack('colosseum','cinematic');
  const primed=instances[0]!;
  renderHook(()=>useSoundtrack('colosseum','cinematic'));
  expect(primed.paused).toBe(false);
  primed.pause.mockClear();
  act(()=>usePlaybackStore.setState({assetsReady:false,status:'playing'}));
  expect(instances).toHaveLength(1);
  expect(primed.paused).toBe(false);
  expect(primed.pause).not.toHaveBeenCalled();
});

it('keeps the cinematic cue silent until the first ready frame',()=>{
  vi.stubGlobal('Audio',AudioDouble);
  usePlaybackStore.setState({...createInitialState(),wonderId:'eiffel-tower',status:'idle',assetsReady:true});
  primeSoundtrack('eiffel-tower','cinematic');
  const primed=instances[0]!;
  expect(primed.paused).toBe(true);
  usePlaybackStore.setState({status:'playing',assetsReady:false});
  renderHook(()=>useSoundtrack('eiffel-tower','cinematic'));
  expect(primed.paused).toBe(true);
  expect(primed.play).toHaveBeenCalledTimes(1);
  act(()=>usePlaybackStore.setState({assetsReady:true}));
  expect(primed.paused).toBe(false);
  expect(primed.play).toHaveBeenCalledTimes(2);
  expect(primed.currentTime).toBe(0);
});
