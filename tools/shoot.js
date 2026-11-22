const { chromium } = require('playwright');
const fs=require('fs');
const pages = {
 'home':'https://full-motion.fr/',
 'drone-work':'https://full-motion.fr/drone.html',
 'drone-equipment':'https://full-motion.fr/drone.html?page=equipment',
 'drone-team':'https://full-motion.fr/drone.html?page=team',
 'drone-contact':'https://full-motion.fr/drone.html?page=contact',
 'drone-film':'https://full-motion.fr/drone.html?film=athena',
 'drone-category':'https://full-motion.fr/drone.html?categoryId=base-3',
 'rental':'https://full-motion.fr/rental.html',
 'rental-delivery':'https://full-motion.fr/rental.html?item=livraison',
 'rental-sales':'https://full-motion.fr/rental.html?item=vente',
 'rental-contact':'https://full-motion.fr/rental.html?item=contact',
 'rental-product':'https://full-motion.fr/rental.html?item=whip-pan&lang=fr',
};
const outline = () => {
  const out=[];
  const walk=(el,d)=>{ if(d>5) return;
    for(const c of el.children){ const cs=getComputedStyle(c); if(['SCRIPT','STYLE','LINK','svg','SVG'].includes(c.tagName))continue;
      const r=c.getBoundingClientRect(); if(r.height<4||cs.display==='none'||cs.visibility==='hidden')continue;
      out.push({d,tag:c.tagName.toLowerCase(),cls:(typeof c.className==='string'?c.className:'').slice(0,80),id:c.id,x:Math.round(r.x),y:Math.round(r.y+scrollY),w:Math.round(r.width),h:Math.round(r.height),disp:cs.display,pos:cs.position,gtc:cs.gridTemplateColumns!=='none'?cs.gridTemplateColumns.slice(0,80):'',ff:cs.fontFamily.slice(0,60),fs:cs.fontSize,fw:cs.fontWeight,col:cs.color,bg:cs.backgroundColor,txt:(c.children.length===0?(c.innerText||'').trim().slice(0,60):'')});
      walk(c,d+1);} };
  walk(document.body,0); return out; };
(async()=>{
  const b=await chromium.launch({channel:'chrome'});
  for (const [vp,w,h,mob] of [['desktop',1440,900,false],['mobile',390,844,true]]) {
    const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob,deviceScaleFactor:1,locale:'fr-FR'});
    for (const [name,url] of Object.entries(pages)) { if(fs.existsSync(`../dom/${name}-${vp}.json`)) continue;
      const p=await ctx.newPage();
      try{ await p.goto(url,{waitUntil:'networkidle',timeout:45000}); }catch(e){console.log('nav',name,e.message.slice(0,80));}
      await p.waitForTimeout(5000);
      // scroll to trigger lazy
      await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,150));}scrollTo(0,0);});
      await p.waitForTimeout(1500);
      await p.screenshot({path:`../reference/${name}-${vp}-viewport.png`});
      await p.screenshot({path:`../reference/${name}-${vp}-full.png`,fullPage:true});
      const o=await p.evaluate(outline);
      const H=await p.evaluate(()=>document.documentElement.scrollHeight);
      fs.writeFileSync(`../dom/${name}-${vp}.json`,JSON.stringify({url,H,o},null,0));
      if(vp==='desktop') fs.writeFileSync(`../dom/${name}.html`,await p.content());
      console.log(vp,name,H,o.length);
      await p.close();
    }
    await ctx.close();
  }
  await b.close();
})();
