/* Local preset interchange. No files leave the browser. */
window.ResearchPresets = (() => {
  const download=(name,value,type='application/json')=>{
    const blob=value instanceof Blob?value:new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type});
    const previous=document.getElementById('readyDownload');if(previous){URL.revokeObjectURL(previous.href);previous.remove()}
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.id='readyDownload';a.href=url;a.download=name;a.textContent='Download '+name;a.style.cssText='display:block;padding:10px;overflow-wrap:anywhere;color:inherit';(document.getElementById('side')||document.body).append(a);a.click();
  };
  const controls=ids=>Object.fromEntries(ids.map(id=>{const el=document.getElementById(id);return [id,el.type==='checkbox'?el.checked:el.value]}));
  function validateControls(values,ids){
    if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Missing settings');
    const clean={};
    for(const id of ids){if(!(id in values))continue;const el=document.getElementById(id),v=values[id];
      if(el.type==='checkbox'){if(typeof v!=='boolean')throw Error('Invalid '+id);clean[id]=v;continue}
      if(typeof v!=='string'||v.length>20000)throw Error('Invalid '+id);
      if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===v))throw Error('Unknown setting: '+id);
      if(el.type==='color'&&!/^#[0-9a-f]{6}$/i.test(v))throw Error('Invalid colour');
      if(el.type==='range'&&(!Number.isFinite(+v)||+v<+el.min||+v>+el.max))throw Error('Out-of-range '+id);
      clean[id]=v;
    }return clean;
  }
  function applyControls(values){for(const [id,v] of Object.entries(values)){const el=document.getElementById(id);if(el.type==='checkbox')el.checked=v;else el.value=v}}
  async function readPreset(file,kind){if(!file||file.size>2e6)throw Error('Choose a preset JSON file under 2 MB');const p=JSON.parse(await file.text());if(p.format!=='research-style'||p.version!==1||p.kind!==kind)throw Error('This is not a compatible '+kind+' preset');return p}
  async function readImage(file){
    if(!file.type.startsWith('image/')&&!/\.svg$/i.test(file.name))throw Error('Choose PNG, JPEG, WebP or SVG');
    const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(Error('File could not be read'));r.readAsDataURL(file)});
    const im=new Image();await new Promise((res,rej)=>{im.onload=res;im.onerror=()=>rej(Error('Image could not be decoded'));im.src=data});
    const width=im.naturalWidth,height=im.naturalHeight;if(!width||!height)throw Error('Image has no dimensions');
    if(width*height>64000000)throw Error('Image exceeds 64 megapixels. Export a smaller copy first.');
    return {id:(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)),name:file.name,data,original:data,width,height};
  }
  return {download,controls,validateControls,applyControls,readPreset,readImage};
})();
