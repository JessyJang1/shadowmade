export function makeAudio(){
  let ctx:AudioContext|undefined,main:GainNode|undefined,cover:GainNode|undefined;
  let next=0,i=0,coverIndex=0,nextBar=0,muted=false,requested=false;
  const preference='shadowmade.audio.muted';
  try{muted=localStorage.getItem(preference)==='true';}catch{/* Session-only when storage is restricted. */}
  const phrase=[62,69,74,77,76,69,65,67,62,69,74,79,77,72,69,65];
  // An original eight-bar waltz. The open D–A from the ending is heard
  // here without its resolution, in music-box tines and soft bowed tones.
  const coverBars=[
    [50,57,62,65,69,74],[48,55,60,64,67,72],[46,53,58,62,65,69],[45,52,57,60,64,67],
    [50,57,62,65,69,77],[48,55,60,64,72,76],[46,53,58,62,74,69],[45,52,57,60,67,64],
  ];
  function note(midi:number,delay:number,level=.10,length=1.35,bus=main){
    if(!ctx||!bus)return;
    const time=ctx.currentTime+delay;
    for(const [ratio,gain] of [[1,1],[2.01,.14],[3.98,.065]]){
      const o=ctx.createOscillator(),e=ctx.createGain();o.type='sine';o.frequency.value=440*2**((midi-69)/12)*ratio;
      e.gain.setValueAtTime(.0001,time);e.gain.exponentialRampToValueAtTime(level*gain,time+.027);
      e.gain.exponentialRampToValueAtTime(.0001,time+length/(ratio>1?3.5:1));
      o.connect(e).connect(bus);o.start(time);o.stop(time+length);
    }
  }
  function bow(midi:number,time:number,level:number){
    if(!ctx||!cover)return;
    const o=ctx.createOscillator(),filter=ctx.createBiquadFilter(),envelope=ctx.createGain();
    o.type='triangle';o.frequency.value=440*2**((midi-69)/12);
    filter.type='lowpass';filter.frequency.value=475;filter.Q.value=.32;
    envelope.gain.setValueAtTime(.0001,time);
    envelope.gain.exponentialRampToValueAtTime(level,time+.56);
    envelope.gain.exponentialRampToValueAtTime(.0001,time+3.22);
    o.connect(filter).connect(envelope).connect(cover);
    o.start(time);o.stop(time+3.22);
  }
  function updateCover(){
    if(!ctx||!cover||muted||ctx.currentTime+.18<nextBar)return;
    const time=Math.max(ctx.currentTime+.025,nextBar),delay=time-ctx.currentTime;
    const [bass,fifth,low,middle,high,last]=coverBars[coverIndex++%coverBars.length];
    bow(bass,time,.048);bow(fifth,time+.10,.018);
    note(low,delay+.08,.125,2.30,cover);
    note(middle,delay+.77,.078,1.60,cover);
    note(high,delay+1.48,.100,2.10,cover);
    note(last,delay+2.13,.065,1.80,cover);
    nextBar=time+2.88;
  }
  return {get muted(){return muted;},get requested(){return requested;},start(){
    if(!ctx){
      ctx=new AudioContext();
      main=ctx.createGain();main.gain.value=muted?0:.42;main.connect(ctx.destination);
      cover=ctx.createGain();cover.connect(main);
    }
    requested=true;
    void ctx.resume().catch(()=>{requested=false;});
  }, enter(){
    if(!ctx||!cover)return;
    cover.gain.setTargetAtTime(0,ctx.currentTime,.33);
    next=ctx.currentTime+.2;
  }, update(scene:'title'|'game'|'quiet'){
    if(!ctx||ctx.state!=='running'||scene==='quiet'||muted)return;
    if(scene==='title'){updateCover();return;}
    if(ctx.currentTime>=next){
      const n=phrase[i%phrase.length];note(n,0,i%4===0?.105:.079,1.95);
      if(i%4===0)note(i%8===0?38:45,.08,.091,3.8);
      next=ctx.currentTime+[.93,.88,1.56,1.1][i++%4];
    }
  }, toggle(){
    muted=!muted;
    try{localStorage.setItem(preference,String(muted));}catch{/* Keep the current session preference. */}
    if(main&&ctx) main.gain.setTargetAtTime(muted?0:.42,ctx.currentTime,.035);return muted;
  }, cue(kind:'overture'|'homecoming'|'lift'|'place'|'enter'|'turn'|'hint'|'win'|'lock'|'timber'|'bridge'|'land'){
    if(kind==='overture'||kind==='homecoming'){
      // The unanswered open fifth at the gate resolves when the last lamp returns.
      const final=kind==='homecoming';
      note(62,0,.11,1.6);note(69,.42,.095,1.6);
      if(final){note(74,.96,.14,2.8);note(54,.96,.07,2.4);note(62,1.02,.08,2.2);}
      if(ctx)next=ctx.currentTime+(final?3.3:1.7);
    }
    if(kind==='lift'){note(66,0,.055,.14);note(74,.035,.028,.11);}
    if(kind==='place'){note(42,0,.090,.15);note(57,.012,.046,.10);}
    if(kind==='turn'){note(72,0,.046,.075);note(69,.04,.029,.09);}
    if(kind==='enter') {note(57,0,.11);note(64,.12,.08);}
    if(kind==='hint'){note(76,0,.085);note(81,.18,.06);}
    if(kind==='win'){
      note(45,0,.23,2.85);note(52,.025,.16,2.30);
      note(57,.055,.18,2.15);note(61,.065,.14,2.10);note(64,.080,.20,2.45);
      note(52,.35,.09,2.30);note(69,.35,.21,2.70);
    }
    if(kind==='lock'){note(47,0,.145,.26);note(59,.13,.086,.21);}
    if(kind==='timber'){note(43,0,.15,.22);note(55,.075,.073,.35);}
    if(kind==='bridge'){note(50,0,.18,2.35);note(57,.034,.12,1.8);note(66,.16,.145,2.15);}
    if(kind==='land'){note(38,0,.16,3.5);note(50,.86,.09,2.9);note(45,0,.13,3.2);note(76,.03,.13,2);note(81,.18,.16,2.7);note(88,.30,.09,3);}
  }};
}
