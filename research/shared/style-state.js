/* Latest operation values survive visits to presets that omit that operation. */
(function(root){
  function createParameterMemory(){
    const bank=new Map(),copy=value=>JSON.parse(JSON.stringify(value));
    function remember(recipe){const counts={};for(const layer of recipe){const key=layer.op+':'+(counts[layer.op]||0);counts[layer.op]=(counts[layer.op]||0)+1;bank.set(key,copy(layer))}}
    function apply(recipe){const counts={};return recipe.map(layer=>{const key=layer.op+':'+(counts[layer.op]||0);counts[layer.op]=(counts[layer.op]||0)+1;const last=bank.get(key);return last?{...copy(layer),on:last.on,p:{...copy(layer.p),...copy(last.p)}}:copy(layer)})}
    return {remember,apply};
  }
  root.ResearchStyleState={createParameterMemory};
  if(typeof module!=='undefined')module.exports=root.ResearchStyleState;
})(typeof window!=='undefined'?window:globalThis);
