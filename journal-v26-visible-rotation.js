/* Journal v26 — remove the final visual angle clamp at the WebGL uniform boundary. */
(() => {
  const proto=globalThis.WebGLRenderingContext?.prototype;
  if(!proto||proto.__hjVisibleRotationV26)return;
  Object.defineProperty(proto,'__hjVisibleRotationV26',{value:true,configurable:false});

  const originalGetUniformLocation=proto.getUniformLocation;
  const originalUniform1f=proto.uniform1f;
  const jellyAngleLocations=new WeakSet();

  proto.getUniformLocation=function(program,name){
    const loc=originalGetUniformLocation.call(this,program,name);
    if(loc&&name==='u_hjJellyAngle')jellyAngleLocations.add(loc);
    return loc;
  };

  proto.uniform1f=function(location,value){
    if(location&&jellyAngleLocations.has(location)){
      const state=globalThis.__HJRealJellyState;
      if(state?.enabled&&Number.isFinite(Number(state.angle))){
        value=Number(state.angle);
      }
    }
    return originalUniform1f.call(this,location,value);
  };
})();
