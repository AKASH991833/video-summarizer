/* video-summarizer — extractive transcript summarizer. Frequency/TextRank-lite sentence
   scoring, timestamped key moments, auto-titled chapters. 100% on-device.
   HONEST: extractive — sentences are selected, never rewritten. */
(function(){
'use strict';
const STOP=new Set('a an the and or but if then else when while of at by for with about into through during before after above below to from up down in out on off over under again further once here there all any both each few more most other some such no nor not only own same so than too very can will just should now is are was were be been being have has had having do does did doing would could ought i you he she it we they them his her its our their this that these those am as us uh um like yeah okay really actually going go get got know think say said see look right well thing things way lot kind sort want make take come let let\'s'.split(' '));
function tokenize(s){return (s.toLowerCase().match(/[a-z][a-z'-]{2,}/g)||[]).filter(w=>!STOP.has(w))}
function parseTranscript(text){
  // lines like "[12:34] text", "12:34 text", "1:02:33 text", or plain paragraphs
  const lines=text.split(/\n+/).map(l=>l.trim()).filter(Boolean);
  const segs=[];let cur={ts:null,text:''};
  const tsRe=/^\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*(.*)$/;
  lines.forEach(l=>{
    const m=l.match(tsRe);
    if(m&&m[4]){
      if(cur.text)segs.push(cur);
      const s=(m[3]? +m[1]*3600+ +m[2]*60+ +m[3] : +m[1]*60+ +m[2]);
      cur={ts:s,text:m[4]};
    }else cur.text+=(cur.text?' ':'')+l;
  });
  if(cur.text)segs.push(cur);
  // split segments into sentences, keep segment ts
  const sents=[];
  segs.forEach(seg=>{
    const parts=seg.text.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g)||[];
    parts.forEach(p=>{const t=p.trim();if(t.split(' ').length>=4)sents.push({text:t,ts:seg.ts})});
  });
  return sents;
}
function keywords(sents,topN){
  const tf={};
  sents.forEach(s=>tokenize(s.text).forEach(w=>tf[w]=(tf[w]||0)+1));
  return Object.entries(tf).filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]).slice(0,topN||60).map(([w])=>w);
}
function score(sent,kw){
  const toks=tokenize(sent.text);if(toks.length<3)return 0;
  const set=new Set(kw);let hit=0;toks.forEach(w=>{if(set.has(w))hit++});
  // brevity bonus: punchy sentences summarize better
  const lenPenalty=1/(1+Math.max(0,toks.length-18)/25);
  return hit/Math.sqrt(toks.length)*lenPenalty;
}
function fmtTs(s){if(s==null)return null;const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':':'')+String(m).padStart(h?2:1,'0')+':'+String(x).padStart(2,'0')}
function summarize(text,opts){
  const {maxSent=5,maxMoments=8,maxChapters=5}=opts||{};
  const sents=parseTranscript(text);
  if(sents.length<4)return{error:'Need at least 4 sentences of transcript to summarize.'};
  const kw=keywords(sents);
  const scored=sents.map((s,i)=>({...s,i,score:score(s,kw)}));
  // TL;DR: top N sentences in original order
  const top=[...scored].sort((a,b)=>b.score-a.score);
  const chosen=top.slice(0,maxSent).sort((a,b)=>a.i-b.i);
  // key moments: highest-scored timestamped sentences, spread apart
  const withTs=[...scored].filter(s=>s.ts!=null).sort((a,b)=>b.score-a.score);
  const moments=[];const minGap=Math.max(30,(withTs.length? (Math.max(...withTs.map(s=>s.ts))||0)/maxMoments/2 : 60));
  for(const s of withTs){if(moments.length>=maxMoments)break;if(moments.every(m=>Math.abs(m.ts-s.ts)>=minGap))moments.push(s)}
  moments.sort((a,b)=>a.ts-b.ts);
  // chapters: split into equal blocks, title by top keyword in block
  const hasTs=sents.some(s=>s.ts!=null);
  const nCh=Math.min(maxChapters,Math.max(2,Math.round(sents.length/6)));
  const chapters=[];
  const per=Math.ceil(sents.length/nCh);
  for(let c=0;c<nCh;c++){
    const block=scored.slice(c*per,(c+1)*per);
    if(!block.length)continue;
    const kws=keywords(block,3);
    const bestS=[...block].sort((a,b)=>b.score-a.score)[0];
    chapters.push({title:kws.slice(0,3).map(w=>w[0].toUpperCase()+w.slice(1)).join(' · ')||'Part '+(c+1),ts:block[0].ts,summary:bestS.text,score:bestS.score});
  }
  const dur=withTs.length?Math.max(...withTs.map(s=>s.ts)):null;
  return {tldr:chosen,moments,chapters,keywords:kw.slice(0,15),stats:{sentences:sents.length,words:text.split(/\s+/).length,duration:dur,hasTimestamps:hasTs}};
}
window.SummarizeEngine={summarize,parseTranscript,keywords,fmtTs};
})();
