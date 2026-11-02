/* Source-preserving output and portable, validated recipes. */
let renderItem;
(() => {
  const RP=ResearchPresets;
  const section=document.createElement('section');section.innerHTML=`<h2>Architecture · image fidelity</h2>
    <label for="effectAmount">Style strength <span id="effectValue">35%</span></label><input type="range" id="effectAmount" min="0" max="100" step="1" value="35">
    <label><input type="checkbox" id="protectInk" checked> Preserve dark linework & labels</label>
    <label for="inkThreshold">Dark-detail threshold</label><input type="range" id="inkThreshold" min="30" max="210" step="1" value="130">
    <label><input type="checkbox" id="keepAlpha" checked> Keep source transparency</label>
    <label><input type="checkbox" id="originalOnly"> Current image: original / no effects</label>
    <small>Dark-detail protection blends original dark pixels back into the result. It does not identify all text; use Original for drawings that must remain unchanged. Originals remain available to the Layout Generator.</small>
    <h2>Portable style</h2><button id="downloadStyle" class="s">Download style</button><button id="importStyle" class="s">Import style…</button><input id="recipeFile" type="file" accept=".json,application/json" hidden>
    <p id="qualityStatus" role="status" aria-live="polite"></p>`;
  $('side').insertBefore(section,$('ly').previousElementSibling);
  $('e1').textContent='Export current image';
  $('exs').prepend(new Option('Original source dimensions','source'));$('exs').value='source';
  const settingsIds=['effectAmount','protectInk','inkThreshold','keepAlpha','exs'];
  const safePresets={
    'Architecture · original / no treatment':()=>[],
    'Architecture · continuous graphite':()=>B('gray'),
    'Architecture · warm paper wash':()=>B(['colorize',{c0:'#252422',c2:'#f4f1e9'}]),
    'Architecture · cool technical wash':()=>B(['colorize',{c0:'#24313d',c2:'#f3f6f8'}]),
    'Architecture · muted material study':()=>B(['color',{sat:60,hue:0}]),
    'Architecture · gentle contrast':()=>B(['levels',{contrast:5,gamma:1,bp:0,wp:255}])
  };
  const group=document.createElement('optgroup');group.label='Architecture · continuous detail';Object.entries(safePresets).forEach(([name,fn])=>{PR[name]=fn;group.append(new Option(name,name))});$('pr').prepend(group);
  let qualityMemory={};
  function rememberQuality(){qualityMemory[currentStyleKey]=RP.controls(settingsIds)}
  const oldRemember=rememberStyle;rememberStyle=function(){oldRemember();rememberQuality()};
  $('pr').onchange=e=>{rememberStyle();currentStyleKey=e.target.value;ST=styleMemory[currentStyleKey]?cloneRecipe(styleMemory[currentStyleKey]):PR[currentStyleKey]();if(qualityMemory[currentStyleKey])RP.applyControls(qualityMemory[currentStyleKey]);$('effectValue').textContent=$('effectAmount').value+'%';ui();go()};
  $('prReset').onclick=()=>{ST=PR[currentStyleKey]();$('effectAmount').value=currentStyleKey.startsWith('Architecture')?'35':'100';$('protectInk').checked=currentStyleKey.startsWith('Architecture');$('keepAlpha').checked=true;$('inkThreshold').value='130';$('effectValue').textContent=$('effectAmount').value+'%';ui();go()};
  function originalCanvas(it,max){const c=document.createElement('canvas'),k=Math.min(1,max/Math.max(it.cv.width,it.cv.height));c.width=Math.max(1,Math.round(it.cv.width*k));c.height=Math.max(1,Math.round(it.cv.height*k));c.getContext('2d').drawImage(it.cv,0,0,c.width,c.height);return c}
  renderItem=function(it,max){
    const amount=+$('effectAmount').value/100;
    if(it.originalOnly||amount===0||!ST.some(l=>l.on))return originalCanvas(it,max);
    const styled=run(it.cv,max,ST),ctx=styled.getContext('2d'),base=document.createElement('canvas');base.width=styled.width;base.height=styled.height;base.getContext('2d').drawImage(it.cv,0,0,base.width,base.height);
    const src=base.getContext('2d').getImageData(0,0,base.width,base.height).data,out=ctx.getImageData(0,0,base.width,base.height),d=out.data,threshold=+$('inkThreshold').value,protect=$('protectInk').checked,alpha=$('keepAlpha').checked;
    for(let i=0;i<d.length;i+=4){const lum=.299*src[i]+.587*src[i+1]+.114*src[i+2],mask=protect?Math.min(1,Math.max(0,(threshold+35-lum)/35)):0,a=amount*(1-mask);for(let c=0;c<3;c++)d[i+c]=src[i+c]*(1-a)+d[i+c]*a;d[i+3]=alpha?src[i+3]:src[i+3]*(1-amount)+d[i+3]*amount}
    ctx.putImageData(out,0,0);return styled;
  };
  window.syncQualityUI=()=>{$('originalOnly').checked=!!items[cur]?.originalOnly;$('originalOnly').disabled=!items.length};
  $('originalOnly').onchange=e=>{if(items[cur]){items[cur].originalOnly=e.target.checked;go()}};
  settingsIds.forEach(id=>$(id).addEventListener('input',()=>{$('effectValue').textContent=$('effectAmount').value+'%';go()}));
  function validatedRecipe(recipe){
    if(!Array.isArray(recipe)||recipe.length>50)throw Error('Recipe must contain at most 50 layers');
    return recipe.map(l=>{if(!l||!Object.hasOwn(OPS,l.op)||typeof l.on!=='boolean')throw Error('Unknown or invalid layer');const layer=mk(l.op);layer.on=l.on;
      for(const q of OPS[l.op].p){const [key,,type]=q,v=l.p?.[key];if(v===undefined)continue;
        if(type==='s'&&(!Number.isFinite(v)||v<q[3]||v>q[4]))throw Error('Out-of-range '+key);
        if(type==='o'&&(!Number.isInteger(v)||v<0||v>=q[3].length))throw Error('Invalid '+key);
        if(type==='c'&&(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v)))throw Error('Invalid colour');
        if(type==='b'&&typeof v!=='boolean')throw Error('Invalid checkbox');layer.p[key]=v;
      }return layer;
    });
  }
  $('downloadStyle').onclick=()=>RP.download('image-style.json',{format:'research-style',version:1,kind:'image',name:currentStyleKey,recipe:cloneRecipe(ST),controls:RP.controls(settingsIds)});
  $('importStyle').onclick=()=>$('recipeFile').click();
  function applyRecipe(p){const recipe=validatedRecipe(p.recipe),controls=RP.validateControls(p.controls,settingsIds);if(typeof p.name!=='string'||p.name.length>160)throw Error('Invalid style name');rememberStyle();const name='Imported · '+p.name.replace(/^Imported · /,'');PR[name]=()=>cloneRecipe(recipe);if(![...$('pr').options].some(o=>o.value===name))$('pr').append(new Option(name,name));currentStyleKey=name;ST=recipe;$('pr').value=name;RP.applyControls(controls);$('effectValue').textContent=$('effectAmount').value+'%';ui();go();$('qualityStatus').textContent='Imported style and all custom settings.'}
  $('recipeFile').onchange=async e=>{try{applyRecipe(await RP.readPreset(e.target.files[0],'image'))}catch(error){$('qualityStatus').textContent='Import failed: '+error.message}e.target.value=''};
  $('ja').onclick=()=>{try{const a=JSON.parse($('js').value);ST=validatedRecipe(a);ui();go();$('qualityStatus').textContent='Recipe applied.'}catch(e){$('qualityStatus').textContent='Invalid recipe: '+e.message}};
  // Export Original directly when possible; no needless resampling or conversion.
  $('e1').onclick=async()=>{const it=items[cur];if(!it)return;if((it.originalOnly||+$('effectAmount').value===0||!ST.some(l=>l.on))&&$('exs').value==='source'&&it.originalData){const blob=await (await fetch(it.originalData)).blob();RP.download(it.name,blob)}else await exp(it)};
  currentStyleKey='Architecture · original / no treatment';ST=PR[currentStyleKey]();$('pr').value=currentStyleKey;ui();sample();syncQualityUI();
})();
