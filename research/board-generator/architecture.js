/* Architecture boards: original assets, image-led packing and coordinated sheets. */
(() => {
  const RP=ResearchPresets;
  const panel=document.createElement('section');panel.id='architectureControls';
  panel.innerHTML=`<h2>Architecture workspace</h2>
  <label for="boardCount">Boards</label><select id="boardCount"><option value="1">1 × 700 × 1000 mm</option><option value="2">2 × 700 × 1000 mm · stacked</option></select>
  <label for="layoutMode">Compose</label><select id="layoutMode"><option value="classic">Preset / placeholder layout</option><option value="images">Images first · automatic layout</option></select>
  <label for="rowCount">Images per row (maximum)</label><select id="rowCount"><option value="2">2 · generous drawings</option><option value="3" selected>3 · balanced</option><option value="4">4 · compact</option></select>
  <button id="fromImages" type="button">Upload & build layout…</button>
  <p><small>Images keep their proportions. Upload order becomes reading order. Both boards share margins, spacing and typography.</small></p>
  <label><input type="checkbox" id="protectImages" checked> Protect drawings & embedded labels</label>
  <label for="imageFit">Image fitting</label><select id="imageFit"><option value="meet">Fit entire image · no cropping</option><option value="slice">Fill block · crop edges</option></select>
  <label for="imageTreatment">Board image treatment</label><select id="imageTreatment"><option value="none">Original colours</option><option value="grayscale(1)">Continuous grayscale</option><option value="saturate(0.55)">Muted colour</option><option value="sepia(0.2)">Warm archive · subtle</option></select>
  <label for="sharedVersion">Images from Image Designer</label><select id="sharedVersion"><option value="original">Original source · full quality</option><option value="styled">Styled output · full resolution</option></select>
  <p><small>Protection removes image rotation and rounded clipping; captions sit outside the drawing. Imported originals are embedded without JPEG recompression. Image fitting is a separate choice.</small></p>
  <details><summary>Source images <span id="sourceCount">0</span></summary><div id="sourceList"></div></details>
  <h2>Portable style</h2><button class="s" id="saveStyle">Download style</button><button class="s" id="loadStyle">Import style…</button><input type="file" id="styleFile" accept=".json,application/json" hidden>
  <small>Style + custom settings only; images and edited blocks stay in this session.</small>
  <p id="archStatus" role="status" aria-live="polite"></p>`;
  $('side').insertBefore(panel,$('side').children[2]);
  $('xs').textContent='Export board SVG';
  const exportSelect=document.createElement('select');exportSelect.id='exportBoard';exportSelect.setAttribute('aria-label','Board to export');exportSelect.innerHTML='<option value="0">Board 01</option>';$('xs').before(exportSelect);
  const selected=document.createElement('div');selected.innerHTML='<label><input id="originalImage" type="checkbox"> Original image · bypass board treatment</label><label for="slotFit">This image fitting</label><select id="slotFit"><option value="">Use global setting</option><option value="meet">Fit entire image</option><option value="slice">Fill / crop</option></select><label for="imageCaption">Caption</label><input id="imageCaption" type="text" placeholder="Optional caption">';$('sel').append(selected);
  const css=document.createElement('style');css.textContent=`
    h2{font-size:12px;margin:17px 0 6px}#architectureControls{border-block:1px solid var(--ln);margin-top:12px;padding-bottom:12px}#archStatus{font-size:12px;color:var(--ac)}
    #main{display:block;height:100vh}#sheets{display:flex;flex-direction:column;gap:28px;align-items:center;width:100%}.sheet{width:min(100%,650px);margin:0}.sheet figcaption{font-size:11px;color:var(--mu);margin:0 0 7px}.sheet svg,#board{display:block;width:100%;height:auto;max-width:none;aspect-ratio:7/10;box-shadow:0 2px 18px #0003;background:white}
    .source-row{display:grid;grid-template-columns:40px 1fr;gap:7px;border-top:1px solid var(--ln);padding:8px 0}.source-row img{width:40px;height:50px;object-fit:contain;background:white}.source-row small{display:block;overflow-wrap:anywhere}.source-row button{font-size:11px;padding:3px 6px}.source-row select{font-size:11px;margin-top:4px}
    @media(max-width:760px){#main{height:auto}.sheet{width:100%}}
    @media print{@page{size:700mm 1000mm;margin:0}html,body,#main,#sheets{height:auto!important;width:700mm!important;display:block!important;margin:0!important;padding:0!important;overflow:visible!important}.sheet{width:700mm!important;height:1000mm!important;margin:0!important;break-after:page;page-break-after:always;overflow:hidden}.sheet:last-child{break-after:auto;page-break-after:auto}.sheet figcaption{display:none}.sheet svg,#board{width:700mm!important;height:1000mm!important;max-width:none!important;box-shadow:none!important}#side{display:none!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  `;document.head.append(css);
  const legacyRender=render,legacyLayout=layout,legacyPlace=place,legacyPick=pick;
  let activePage=0,renderPage=0,classicPages=[slots,[]],imagePages=[[],[]],assetSlots=new Map(),localSources=[],allSources=[],imageRects=[[],[]],printing=false;
  const count=()=>+$('boardCount').value,imagesMode=()=>$('layoutMode').value==='images';
  const pages=()=>imagesMode()?imagePages:classicPages;
  const status=t=>$('archStatus').textContent=t;
  const controls=['sty','can','algo','pal','cb','ci2','tex','font','cap','footOn','txtBlocks','txtDiaRatio','sub','meta','den','rq1','rq2','title','boardCount','layoutMode','rowCount','protectImages','imageFit','imageTreatment','sharedVersion'];
  // Exact-aspect justified rows. Dynamic programming selects row breaks; uniform
  // scaling then fits the resulting stack inside the printable content area.
  function pack(list){
    if(!list.length)return [];
    const margin=S.margin,gap=S.gap,aw=W-2*margin,ah=H-2*margin-($('footOn').checked?46:34),cap=$('cap').value==='none'?0:10;
    const max=+$('rowCount').value,n=list.length,ratios=list.map(a=>a.width/a.height),target=Math.min(320,Math.sqrt(aw*ah/ratios.reduce((a,b)=>a+b,0)));
    const dp=Array(n+1).fill(Infinity),next=Array(n);dp[n]=0;
    for(let i=n-1;i>=0;i--){let sum=0;for(let k=1;k<=max&&i+k<=n;k++){sum+=ratios[i+k-1];const rh=(aw-gap*(k-1))/sum;if(rh<=0)continue;const cost=(rh-target)**2*k+dp[i+k];if(cost<dp[i]){dp[i]=cost;next[i]=k}}}
    const rows=[];for(let i=0;i<n;){const k=next[i]||1,rs=ratios.slice(i,i+k),h=(aw-gap*(k-1))/rs.reduce((a,b)=>a+b,0);rows.push({i,k,h,rs});i+=k}
    const fixed=rows.length*cap+gap*(rows.length-1),height=rows.reduce((v,r)=>v+r.h,0),scale=Math.min(1,Math.max(1,ah-fixed)/height);
    let y=margin;const out=[];for(const row of rows){const rh=row.h*scale,rowW=row.rs.reduce((v,r)=>v+r*rh,0)+gap*(row.k-1);let x=margin+(aw-rowW)/2;row.rs.forEach(r=>{out.push({x,y,w:r*rh,h:rh+cap});x+=r*rh+gap});y+=rh+cap+gap}return out;
  }
  function collectSources(){
    allSources=[...sharedLibrary.map(a=>({...a,id:'shared-'+a.id,data:$('sharedVersion').value==='original'?(a.original||a.data):a.data})),...localSources];
    // Board assignments remain attached to an image while its rendering changes.
    allSources.forEach(a=>{if(!assetSlots.has(a.id))assetSlots.set(a.id,{t:'img',txt:'',v:0,img:a.data,manualImg:true,assetId:a.id});const s=assetSlots.get(a.id);s.img=s.original&&a.original?a.original:a.data});
  }
  function rebuildImagePages(){
    collectSources();const lists=[[],[]],auto=allSources.filter(a=>!assetSlots.get(a.id).board||count()===1);
    const split=Math.ceil(auto.length/count());let cursor=0;
    allSources.forEach(a=>{const assigned=assetSlots.get(a.id).board;const page=count()===1?0:assigned?assigned-1:Math.min(1,Math.floor(cursor++/Math.max(1,split)));lists[page].push(a)});
    imagePages=lists.map(list=>list.map(a=>assetSlots.get(a.id)));imageRects=lists.map(pack);
  }
  function sourceUI(){
    collectSources();$('sourceCount').textContent=allSources.length;$('sourceList').replaceChildren();
    allSources.forEach(a=>{const row=document.createElement('div');row.className='source-row';const im=document.createElement('img');im.src=a.data;im.alt='';const info=document.createElement('div'),label=document.createElement('small');label.textContent=`${a.name} · ${a.width} × ${a.height} · ${a.width>a.height?'landscape':a.width<a.height?'portrait':'square'}`;info.append(label);
      if(!a.id.startsWith('shared-')){const i=localSources.findIndex(b=>b.id===a.id);[['↑',-1],['↓',1],['×',0]].forEach(([text,step])=>{const b=document.createElement('button');b.className='s';b.textContent=text;b.setAttribute('aria-label',`${step===0?'Remove':step<0?'Move up':'Move down'} ${a.name}`);b.disabled=step!==0&&(i+step<0||i+step>=localSources.length);b.onclick=()=>{if(!step)localSources.splice(i,1);else [localSources[i],localSources[i+step]]=[localSources[i+step],localSources[i]];sourceUI();draw()};info.append(b)})}else{const note=document.createElement('small');note.textContent='Reorder / remove in Image Designer';info.append(note)}
      if(count()===2){const b=document.createElement('select');b.setAttribute('aria-label',`Board for ${a.name}`);b.innerHTML='<option value="0">Automatic board</option><option value="1">Board 01</option><option value="2">Board 02</option>';b.value=assetSlots.get(a.id).board||0;b.onchange=()=>{assetSlots.get(a.id).board=+b.value;draw()};info.append(b)}row.append(im,info);$('sourceList').append(row);
    });
  }
  window.refreshSharedSources=()=>{sourceUI();draw()};
  layout=function(n){return imagesMode()?imageRects[renderPage]:legacyLayout(n)};
  place=function(){if(imagesMode())return;const offset=renderPage===0?0:classicPages[0].filter(s=>s.t==='img'&&!s.manualImg).length;let i=offset;slots.filter(s=>s.t==='img'&&!s.manualImg).forEach(s=>{const a=allSources.length?allSources[i++%allSources.length]:null;s.img=a?(s.original?a.original||a.data:a.data):null})};
  function sheetMarkup(page,edit){
    const oldSlots=slots,oldSel=sel,oldSeed=S.seed,oldLive=liveTypes;renderPage=page;slots=pages()[page];if(page!==activePage)sel=-1;S.seed+=page*101;
    let markup;try{markup=legacyRender(edit)}finally{slots=oldSlots;sel=oldSel;S.seed=oldSeed;liveTypes=oldLive}
    return markup.replace(/id="([^"]+)"/g,`id="p${page}-$1"`).replace(/url\(#([^)]+)\)/g,`url(#p${page}-$1)`);
  }
  draw=function(){
    rebuildImagePages();activePage=Math.min(activePage,count()-1);slots=pages()[activePage];if(sel>=slots.length)sel=-1;
    $('main').innerHTML='<div id="sheets"></div>';
    for(let p=0;p<count();p++){const figure=document.createElement('figure');figure.className='sheet';const label=document.createElement('figcaption');label.textContent=`BOARD ${String(p+1).padStart(2,'0')} / ${String(count()).padStart(2,'0')} · 700 × 1000 mm`;const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id=p?'board2':'board';svg.setAttribute('viewBox','0 0 700 1000');svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.innerHTML=sheetMarkup(p,!printing);svg.onclick=e=>{activePage=p;slots=pages()[p];const v=e.target.closest('[data-i]')?.dataset.i;sel=v==null?-1:+v;liveTypes=getDisplayTypes(slots.length);pick();draw()};svg.ondragover=e=>e.preventDefault();svg.ondrop=async e=>{e.preventDefault();e.stopPropagation();activePage=p;slots=pages()[p];const v=e.target.closest('[data-i]')?.dataset.i;await imp([...e.dataTransfer.files],v==null?null:+v)};figure.append(label,svg);$('sheets').append(figure)}
    $('exportBoard').innerHTML=Array.from({length:count()},(_,i)=>`<option value="${i}">Board ${String(i+1).padStart(2,'0')}</option>`).join('');$('exportBoard').value=Math.min(exportPage,count()-1);
    if(imagesMode()&&!allSources.length)status('Upload images to build your first board.');
  };
  let exportPage=0;$('exportBoard').onchange=e=>exportPage=+e.target.value;
  pick=function(){legacyPick();const s=slots[sel];if(s){$('originalImage').checked=!!s.original;$('slotFit').value=s.fit||'';$('imageCaption').value=s.caption||''}};
  $('originalImage').onchange=e=>{if(slots[sel]){slots[sel].original=e.target.checked;draw()}};
  $('slotFit').onchange=e=>{if(slots[sel]){slots[sel].fit=e.target.value;draw()}};
  $('imageCaption').oninput=e=>{if(slots[sel]){slots[sel].caption=e.target.value;draw()}};
  imp=async function(files,target){
    const errors=[];for(const file of files){try{const a=await RP.readImage(file);if(target!=null&&slots[target]){const s=slots[target];if(s.assetId){const idx=localSources.findIndex(x=>x.id===s.assetId);if(idx>=0){a.id=s.assetId;localSources[idx]=a}else{status('Replace shared images in Image Designer.');return}}else{s.img=a.data;s.t='img';s.manualImg=true}break}else{localSources.push(a);imgs.push(a.data)}}catch(e){errors.push(file.name+': '+e.message)}}
    $('fi').value='';$('f1').value='';sourceUI();draw();status(errors.length?errors.join(' · '):`${allSources.length} source images · original files retained.`);
  };
  $('fromImages').onclick=()=>{$('layoutMode').value='images';$('rq1').checked=false;$('rq2').checked=false;sel=-1;$('fi').click();draw()};
  $('layoutMode').onchange=()=>{sel=-1;slots=pages()[activePage];pick();draw()};
  ['boardCount','rowCount','protectImages','imageFit','imageTreatment','sharedVersion'].forEach(id=>$(id).onchange=()=>{sourceUI();draw()});
  $('sh').onclick=()=>{if(imagesMode()){for(let i=localSources.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[localSources[i],localSources[j]]=[localSources[j],localSources[i]]}sourceUI()}else{classicPages=classicPages.map(page=>{const copy=[...page];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy})}sel=-1;draw();pick()};
  $('re').onclick=()=>{S.seed++;draw();if(imagesMode())status('Layout fitted to image proportions. Change row count, spacing or source order for another composition.')};
  $('xs').onclick=()=>{const page=+$('exportBoard').value;RP.download(`board-${page+1}-700x1000mm.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="700mm" height="1000mm" viewBox="0 0 700 1000">${sheetMarkup(page,false)}</svg>`,'image/svg+xml')};
  window.addEventListener('beforeprint',()=>{printing=true;draw()});window.addEventListener('afterprint',()=>{printing=false;draw()});
  $('xp').onclick=()=>{printing=true;draw();window.print();printing=false;draw()};
  const archStyles=[
    ['Architecture · white atlas','grid','thirds','Monochrome','none',0,'none',9,12,35,0,0,0,0],
    ['Architecture · editorial hierarchy','editorial','root2','Monochrome','none',0,'label',7,12,35,0,0,0,0],
    ['Architecture · measured bands','bands','thirds','Monochrome','finegrid',2,'none',8,16,40,0,0,0,0],
    ['Architecture · warm archive','masonry','fib','Concrete','fibres',1,'label',8,12,40,0,0,0,0],
    ['Architecture · competition hero','hero','golden','Monochrome','none',0,'none',6,15,35,0,0,0,0]
  ];
  const group=document.createElement('optgroup');group.label='Architecture · preserve drawings';archStyles.forEach(t=>{const i=STY.push(t)-1;group.append(new Option(t[0],i))});$('sty').prepend(group);
  const baseStyle=applyStyle;applyStyle=function(i){baseStyle(i);if(STY[i]?.[0].startsWith('Architecture')){$('protectImages').checked=true;$('imageFit').value='meet';$('imageTreatment').value='none';$('rq1').checked=false;$('rq2').checked=false;draw()}};
  $('sty').onchange=e=>applyStyle(e.target.value);
  $('saveStyle').onclick=()=>RP.download('board-style.json',{format:'research-style',version:1,kind:'board',name:$('sty').selectedOptions[0]?.textContent||'Custom board',settings:{...S},controls:RP.controls(controls),palette:CUR});
  $('loadStyle').onclick=()=>$('styleFile').click();
  $('styleFile').onchange=async e=>{try{const p=await RP.readPreset(e.target.files[0],'board'),v=RP.validateControls(p.controls,controls),s=p.settings;if(!s||!Object.hasOwn(L,s.algo))throw Error('Invalid layout algorithm');const clean={algo:s.algo};for(const [k,,min,max] of SL){if(!Number.isFinite(s[k])||s[k]<min||s[k]>max)throw Error('Invalid '+k);clean[k]=s[k]}if(!Number.isSafeInteger(s.seed)||s.seed<0)throw Error('Invalid seed');clean.seed=s.seed;const c=p.palette;if(!c||!/^#[0-9a-f]{6}$/i.test(c.bg)||!/^#[0-9a-f]{6}$/i.test(c.ink)||!Array.isArray(c.a)||!c.a.length||c.a.length>30||c.a.some(x=>!/^#[0-9a-f]{6}$/i.test(x)))throw Error('Invalid palette');Object.assign(S,clean);CUR={n:String(c.n||'Imported'),bg:c.bg,ink:c.ink,a:[...c.a]};RP.applyControls(v);setCtl();syncTextToggles();sourceUI();draw();status('Imported style and custom settings.')}catch(error){status('Import failed: '+error.message)}e.target.value=''};
  // Print-scale decorations are opt-in: fitting images does not establish CAD scale.
  $('rq1').checked=false;$('rq2').checked=false;
  $('msg').textContent='SVG keeps original embedded assets. Print / PDF exports one 700 × 1000 mm page per board; choose no margins, no headers, 100% scale. Fit-to-board images are not automatically to architectural scale.';
  sourceUI();draw();
})();
