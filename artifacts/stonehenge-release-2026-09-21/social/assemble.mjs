import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='artifacts/stonehenge-release-2026-09-21/social',take=process.argv[2]??'take-01',dir=`${root}/${take}`,out=`${dir}/export`;
const capture=JSON.parse(await readFile(`${dir}/capture-report.json`,'utf8'));
if(capture.dry||capture.shots.length!==4||capture.framesPerShot!==150)throw new Error('Need all four final public captures.');
if(capture.shots.some(s=>s.frames.length!==150||s.errors.length||s.failed.length))throw new Error('Incomplete or errored public capture.');
try{await access(`${out}/wonderforge-four-films-20s.mp4`);throw new Error('Refusing to overwrite preserved final export.');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(out,{recursive:true});
const commands=[];
const run=async(cmd,args)=>{commands.push({cmd,args});return await new Promise((resolve,reject)=>{const p=spawn(cmd,args,{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';p.stdout.on('data',b=>stdout+=b);p.stderr.on('data',b=>stderr+=b);p.on('exit',code=>code?reject(new Error(`${cmd} failed ${code}: ${stderr}`)):resolve({stdout,stderr}));});};
const clips=[];
for(let i=0;i<capture.shots.length;i++){
 const shot=capture.shots[i],source=`${dir}/${shot.id}`,file=`${out}/${String(i+1).padStart(2,'0')}-${shot.id}.mp4`;
 const args=['-hide_banner','-loglevel','error','-framerate','30','-start_number','0','-i',`${source}/%04d.png`,'-loop','1','-framerate','30','-i',`${source}/label.png`];
 let filter='[0:v][1:v]overlay=0:0:shortest=1,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]';
 if(i===3){args.push('-loop','1','-framerate','30','-i',`${dir}/end-label.png`);filter='[0:v][1:v]overlay=0:0:shortest=1[base];[2:v]format=rgba,fade=t=in:st=3:d=0.35:alpha=1[brand];[base][brand]overlay=0:0:shortest=1,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]';}
 args.push('-filter_complex',filter,'-map','[v]','-an','-frames:v','150','-r','30','-fps_mode','cfr','-c:v','libx264','-preset','slow','-crf','18','-profile:v','high','-level:v','4.1','-pix_fmt','yuv420p','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv','-maxrate','16M','-bufsize','32M','-g','60','-keyint_min','30','-video_track_timescale','15360','-movflags','+faststart',file);
 console.log('Encoding '+shot.id);await run('ffmpeg',args);clips.push(file);
}
await writeFile(`${out}/concat.txt`,clips.map(p=>`file '${process.cwd()}/${p}'`).join('\n')+'\n');
const final=`${out}/wonderforge-four-films-20s.mp4`;
await run('ffmpeg',['-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',`${out}/concat.txt`,'-i',`${dir}/stonehenge-cinematic.mp3`,'-filter_complex','[1:a]atrim=start=40:end=60,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.6,afade=t=out:st=19.1:d=0.9[a]','-map','0:v:0','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t','20','-movflags','+faststart','-metadata','title=WonderForge — Four films','-metadata','comment=Actual WonderForge renderer. Giza27–32s; Eiffel18–23s; Colosseum54–59s; Stonehenge55–60s. Existing original instrumental score; no narration.','-metadata','artist=WonderForge',final]);
const probe=JSON.parse((await run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',final])).stdout);
const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
const checks={durationExactly20:Math.abs(Number(probe.format.duration)-20)<.0001,width1920:video.width===1920,height1080:video.height===1080,h264:video.codec_name==='h264',yuv420p:video.pix_fmt==='yuv420p',fps30:video.avg_frame_rate==='30/1',frames600:Number(video.nb_read_frames)===600,aac:audio.codec_name==='aac',stereo:audio.channels===2,rate48000:audio.sample_rate==='48000'};
const loudness=await run('ffmpeg',['-hide_banner','-nostats','-i',final,'-af','loudnorm=I=-18:TP=-2:LRA=11:print_format=json','-f','null','-']);
await writeFile(`${out}/audio-measurement.txt`,loudness.stderr);
const frames=[];for(const frame of[0,75,149,150,225,299,300,375,449,450,525,599,555]){
 const seconds=frame/30,p=`${out}/frame-${String(frame).padStart(4,'0')}.png`;await run('ffmpeg',['-hide_banner','-loglevel','error','-i',final,'-vf',`select=eq(n\\,${frame})`,'-fps_mode','vfr','-frames:v','1',p]);frames.push({frame,seconds,file:p});
}
await run('ffmpeg',['-hide_banner','-loglevel','error','-i',final,'-vf','select=eq(n\\,555)','-fps_mode','vfr','-frames:v','1','-q:v','2',`${out}/wonderforge-thumbnail.jpg`]);
const bytes=await readFile(final),report={createdAt:new Date().toISOString(),source:capture.base,bundle:capture.expectedBundle,final,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),checks,probe,frames,clips,audioSource:capture.audio,commands,scope:'Technical codec/frame/timing validation and visual keyframe review; no subjective audio-listening claim.'};
await writeFile(`${out}/validation.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({final,bytes:bytes.length,checks}));if(Object.values(checks).some(v=>!v))process.exitCode=1;
