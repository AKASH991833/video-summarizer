module.exports=async(page)=>{
  await page.click('#sample1');
  await page.click('#run');
  await page.waitForSelector('#results:not(.hidden)',{timeout:15000});
  const stats=await page.$eval('#stats-row',e=>e.textContent);
  if(!/timestamps detected/.test(stats))throw new Error('timestamps not detected: '+stats);
  const tldr=await page.$eval('#tldr-body',e=>e.querySelectorAll('p').length);
  const chapters=await page.$$eval('#chapter-list .chapter',e=>e.length);
  const moments=await page.$$eval('#moment-list .moment',e=>e.length);
  const kws=await page.$$eval('.kw',e=>e.length);
  if(chapters<2)throw new Error('too few chapters: '+chapters);
  if(moments<3)throw new Error('too few moments: '+moments);
  const m0=await page.$eval('#moment-list .moment .ts',e=>e.textContent);
  if(!/\d+:\d{2}/.test(m0))throw new Error('bad moment ts: '+m0);
  return `TLDR ${tldr} paras, ${chapters} chapters, ${moments} moments (${m0}…), ${kws} keywords`;
};
