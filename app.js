/* video-summarizer UI */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let result=null;
const SAMPLE=`[0:00] Today I want to talk about how sleep affects every aspect of our health.
[0:45] Sleep is not an optional lifestyle luxury. Sleep is a non-negotiable biological necessity.
[1:30] When we look at the brain, sleep deprivation impairs memory formation by up to forty percent.
[2:15] The hippocampus acts like an inbox for new memories, and without sleep that inbox shuts down.
[3:00] Deep sleep is when memories are transferred to permanent storage in the cortex.
[4:10] We also discovered that sleep cleans the brain through the glymphatic system.
[5:00] Beta amyloid, a toxic protein linked to Alzheimer's, is washed away during deep sleep.
[6:20] Turning to the body, short sleep predicts heart disease, diabetes, and weight gain.
[7:15] After just one week of short sleep, blood sugar levels reach pre-diabetic ranges.
[8:30] Immune cells called natural killer cells drop by seventy percent after one night of four hours.
[9:45] This is why short sleep is linked to cancer risk across multiple large studies.
[10:30] The World Health Organization classifies night shift work as a probable carcinogen.
[11:20] So what can we do? The first tip is regularity: go to bed and wake at the same time.
[12:10] The second tip is temperature: keep your bedroom around eighteen degrees Celsius.
[13:00] Avoid caffeine after two in the afternoon because its half life is six hours.
[13:50] Alcohol fragments sleep and blocks REM sleep, the stage critical for emotional health.
[14:40] Finally, if you cannot sleep, get up and do something else until you feel sleepy.
[15:30] Sleep is the single most effective thing we can do to reset brain and body health.`;
const SAMPLE2=`[0:00] Welcome back. In this tutorial we build a REST API with Node and Express from scratch.
[1:20] First, initialize the project with npm init and install express as our only dependency.
[2:40] Create an index file and import express, then create the app instance.
[3:30] The app.listen call starts the server on port three thousand by default.
[4:45] Routes map URLs to handler functions. app.get handles GET requests.
[5:50] The request object carries params, query strings and headers from the client.
[7:00] The response object sends data back with res.json for JSON APIs.
[8:15] Middleware functions run before your handlers. express.json parses request bodies.
[9:30] POST requests create resources. Read the body, validate it, then store it.
[11:00] Always validate input before touching the database. Never trust the client.
[12:20] For persistence we use a simple in-memory array first, then swap in a database.
[13:40] Environment variables hold secrets like database URLs. Never commit them to git.
[14:55] Error handling middleware catches thrown errors and returns proper status codes.
[16:10] Status codes matter: two hundred for OK, four hundred for bad requests, five hundred for server errors.
[17:30] Test your API with curl or Postman before wiring up the frontend.
[18:45] Finally, deploy to any Node host. Set the port from the environment variable.
[19:30] And that is a complete production-shaped REST API in under twenty minutes.`;
function esc(s){return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function run(){
  const text=$('transcript').value.trim();
  if(text.length<120){pkToast('Paste a transcript first (a few sentences at least)');return}
  const r=SummarizeEngine.summarize(text,{maxSent:5,maxMoments:8,maxChapters:5});
  if(r.error){pkToast(r.error);return}
  result=r;render();
  $('results').classList.remove('hidden');
  $('results').scrollIntoView({behavior:'smooth'});
}
function render(){
  const r=result;
  $('stats-row').innerHTML=`<span class="pill ok">${r.stats.words.toLocaleString()} words</span> <span class="pill warn">${r.stats.sentences} sentences</span>${r.stats.duration?' <span class="pill ok">'+SummarizeEngine.fmtTs(r.stats.duration)+' long</span>':''} <span class="hint">${r.stats.hasTimestamps?'timestamps detected':'no timestamps — add [mm:ss] for key moments'}</span>`;
  $('tldr-body').innerHTML=r.tldr.map(s=>`<p>${esc(s.text)}</p>`).join('');
  $('kw-cloud').innerHTML=r.keywords.map(w=>`<span class="kw">${esc(w)}</span>`).join('');
  $('chapter-list').innerHTML=r.chapters.map(c=>`<div class="chapter"><div class="ch-head">${c.ts!=null?`<span class="ts">${SummarizeEngine.fmtTs(c.ts)}</span>`:''}<strong>${esc(c.title)}</strong></div><p>${esc(c.summary)}</p></div>`).join('');
  $('moment-list').innerHTML=r.moments.length?r.moments.map(m=>`<div class="moment"><span class="ts">${SummarizeEngine.fmtTs(m.ts)}</span><p>${esc(m.text)}</p></div>`).join(''):'<p class="hint">No timestamps found in this transcript — add [mm:ss] markers to get key moments.</p>';
}
function exportMd(){
  if(!result)return;
  const r=result;
  let md='# Video Summary\n\n## TL;DR\n\n';
  r.tldr.forEach(s=>md+=s.text+' ');
  md+='\n\n## Chapters\n\n';
  r.chapters.forEach(c=>md+=`### ${c.ts!=null?SummarizeEngine.fmtTs(c.ts)+' — ':''}${c.title}\n${c.summary}\n\n`);
  if(r.moments.length){md+='## Key moments\n\n';r.moments.forEach(m=>md+=`- **${SummarizeEngine.fmtTs(m.ts)}** ${m.text}\n`)}
  md+='\n## Keywords\n\n'+r.keywords.join(', ')+'\n';
  pkDownload('video-summary.md',md,'text/markdown');pkToast('Summary downloaded');
}
document.addEventListener('DOMContentLoaded',()=>{
  $('sample1').onclick=()=>{$('transcript').value=SAMPLE};
  $('sample2').onclick=()=>{$('transcript').value=SAMPLE2};
  $('run').onclick=run;
  $('export').onclick=exportMd;
});
})();
