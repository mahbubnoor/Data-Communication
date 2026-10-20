// ARQ discrete-event simulator: Stop-and-Wait, Go-Back-N, Selective Repeat (Forouzan-style, ACK = next expected)
function simulate(p){
  const {proto,N,Tp,TO} = p; const Tt = 1; const W = proto==='sw' ? 1 : p.W;
  const lostF = new Set(p.lostF||[]), lostA = new Set(p.lostA||[]), lostN = new Set(p.lostN||[]);
  const sent = new Array(N).fill(0), acked = new Array(N).fill(false), buf = new Array(N).fill(false);
  const tmr = new Array(N).fill(null);
  let Sf=0, Sn=0, Rn=0, busy=0, timer=null, nakSent=false, t=0;
  const rq=[], ev=[], lines=[], log=[], snaps=[];
  const usedA=new Set(), usedN=new Set();
  let delivered=[];
  const snap=()=>snaps.push({t, Sf, Sn, Rn, buf:buf.slice(), acked:acked.slice(), delivered:delivered.slice()});
  function sendFrame(i){
    const lost = lostF.has(i) && sent[i]===0; sent[i]++;
    lines.push({k:'F', i, t0:t, t1:t+Tt+Tp, lost, re:sent[i]>1});
    if(!lost) ev.push({time:t+Tt+Tp, type:'F', i});
    log.push([t, `send frame ${i}${sent[i]>1?' (again)':''}${lost?': lost on the way':''}`]);
    busy = t+Tt;
    if(proto==='sr') tmr[i]=t+TO; else if(timer===null) timer=t+TO;
  }
  function sendCtl(kind,n){
    let lost=false;
    if(kind==='A' && lostA.has(n) && !usedA.has(n)){lost=true; usedA.add(n);}
    if(kind==='N' && lostN.has(n) && !usedN.has(n)){lost=true; usedN.add(n);}
    lines.push({k:kind, n, t0:t, t1:t+Tp, lost});
    if(!lost) ev.push({time:t+Tp, type:kind, n});
    log.push([t, `${kind==='A'?'ACK':'NAK'} ${n} sent${lost?': lost on the way':''}`]);
  }
  function rxFrame(i){
    if(proto!=='sr'){
      if(i===Rn){ delivered.push(i); Rn++; log.push([t,`frame ${i} arrives: in order, delivered`]); sendCtl('A',Rn); }
      else if(i<Rn){ log.push([t,`frame ${i} arrives: duplicate, discarded`]); sendCtl('A',Rn); }
      else { log.push([t,`frame ${i} arrives: expected ${Rn}, discarded`]); }
      return;
    }
    if(i<Rn){ log.push([t,`frame ${i} arrives: duplicate, discarded`]); sendCtl('A',Rn); return; }
    if(i>=Rn+W){ log.push([t,`frame ${i} arrives: outside the window, discarded`]); return; }
    if(buf[i]){ log.push([t,`frame ${i} arrives: already stored`]); return; }
    buf[i]=true;
    if(i===Rn) log.push([t,`frame ${i} arrives in order`]);
    if(i!==Rn && !nakSent){ log.push([t,`frame ${i} arrives out of order: stored`]); sendCtl('N',Rn); nakSent=true; }
    else if(i!==Rn) log.push([t,`frame ${i} arrives out of order: stored`]);
    let moved=false; while(Rn<N && buf[Rn]){ delivered.push(Rn); Rn++; moved=true; }
    if(moved){ log.push([t,`deliver up to frame ${Rn-1}`]); sendCtl('A',Rn); nakSent=false; }
  }
  function ackTo(n){
    if(n<=Sf) return false;
    for(let k=Sf;k<n;k++){acked[k]=true; tmr[k]=null;}
    Sf=n; for(let j=rq.length-1;j>=0;j--) if(rq[j]<Sf) rq.splice(j,1);
    if(proto!=='sr') timer = (Sf===Sn) ? null : t+TO;
    return true;
  }
  let guard=0; snap();
  while(Sf<N && guard++<2000){
    // candidate times
    const cand=[];
    if(ev.length) cand.push(Math.min(...ev.map(e=>e.time)));
    if(proto!=='sr' && timer!==null) cand.push(timer);
    if(proto==='sr') tmr.forEach(x=>{ if(x!==null) cand.push(x); });
    const canSend = rq.length>0 || (Sn<N && Sn<Sf+W);
    if(canSend) cand.push(Math.max(t,busy));
    if(!cand.length) break;
    t = Math.max(t, Math.min(...cand));
    // 1. arrivals
    ev.sort((a,b)=>a.time-b.time||(a.type==='F'?-1:1));
    while(ev.length && ev[0].time<=t+1e-9){
      const e=ev.shift();
      if(e.type==='F') rxFrame(e.i);
      else if(e.type==='A'){ const ok=ackTo(e.n); log.push([t,`ACK ${e.n} arrives${ok?`: frames before ${e.n} confirmed`:': nothing new'}`]); }
      else { ackTo(e.n); log.push([t,`NAK ${e.n} arrives: resend frame ${e.n}`]); if(e.n<Sn && !acked[e.n] && !rq.includes(e.n)) { rq.unshift(e.n); tmr[e.n]=null; } }
      snap();
    }
    // 2. timers
    if(proto!=='sr' && timer!==null && timer<=t+1e-9){
      timer=null; rq.length=0; for(let k=Sf;k<Sn;k++) rq.push(k);
      log.push([t, proto==='sw' ? `time-out: resend frame ${Sf}` : `time-out: go back to frame ${Sf}, resend ${Sf}–${Sn-1}`]); snap();
    }
    if(proto==='sr') for(let k=0;k<N;k++) if(tmr[k]!==null && tmr[k]<=t+1e-9 && !acked[k]){ tmr[k]=null; if(!rq.includes(k)) rq.push(k); log.push([t,`time-out for frame ${k}: resend it`]); snap(); }
    // 3. send
    if(t>=busy-1e-9){
      if(rq.length){ sendFrame(rq.shift()); snap(); }
      else if(Sn<N && Sn<Sf+W){ sendFrame(Sn); Sn++; snap(); }
    }
  }
  const tx = sent.reduce((a,b)=>a+b,0);
  const tEnd = Math.max(t, ...lines.map(l=>l.t1));
  return {lines, log, snaps, tx, tEnd, finish:t, W, N, Tt, Tp};
}
if(typeof module!=='undefined') module.exports={simulate};

window.ARQ_SIMULATE = simulate;
