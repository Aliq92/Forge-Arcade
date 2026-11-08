/* RGBA8 stores escape n in RG, smooth (mu+4)*16 in BA. 65535 means finite nonescape.
   Palette interpolation happens AFTER decoding, so interior/exterior values never mix numerically. */
window.FractalRenderer = class FractalRenderer {
  constructor(canvas, options) {
    this.canvas=canvas;this.options=options;this.generation=0;this.completedGeneration=0;
    this.escapeDraws=0;this.paletteDraws=0;this.cancelledJobs=0;this.maxTilePixels=0;this.key='';
    this.current=null;this.job=null;this.status='idle';this.lastRenderMs=0;
    const gl=this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'default'});
    if(!gl)throw Error('WebGL2 is unavailable');
    const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);
    if(precision && precision.precision<23)throw Error('High precision fragment arithmetic is unavailable');
    this.escapeProgram=this.program(options.vertex,options.fragment);
    this.colourProgram=this.program(options.vertex,`#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_data;
uniform vec2 u_output;
uniform float u_limit;
uniform float u_phase;
uniform vec3 u_a,u_b,u_c,u_d,u_inside;
uniform float u_cycles;
out vec4 fragColor;
vec3 sampleColour(ivec2 position){
  ivec2 size=textureSize(u_data,0);
  vec4 data=floor(texelFetch(u_data,clamp(position,ivec2(0),size-1),0)*255.0+.5);
  float n=data.r*256.0+data.g;
  if(n>65534.0)return u_inside;
  float mu=(data.b*256.0+data.a)/16.0-4.0;
  float t=mu/u_limit*u_cycles+u_phase;
  return clamp(u_a+u_b*cos(6.28318530718*(u_c*t+u_d)),0.0,1.0);
}
void main(){
  vec2 coord=gl_FragCoord.xy/u_output*vec2(textureSize(u_data,0))-.5;
  ivec2 p=ivec2(floor(coord));vec2 f=fract(coord);
  vec3 a=mix(sampleColour(p),sampleColour(p+ivec2(1,0)),f.x);
  vec3 b=mix(sampleColour(p+ivec2(0,1)),sampleColour(p+ivec2(1,1)),f.x);
  fragColor=vec4(mix(a,b,f.y),1.0);
}`);
    gl.bindVertexArray(gl.createVertexArray());
    gl.disable(gl.DITHER); // packed numerical bytes must survive unchanged
  }
  program(vertex,fragment) {
    const gl=this.gl, program=gl.createProgram();
    for(const [type,source]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);gl.deleteShader(shader);
    }
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    return program;
  }
  uniform(program,name){return this.gl.getUniformLocation(program,name);}
  texture(width,height) {
    const gl=this.gl, texture=gl.createTexture(),framebuffer=gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Fractal cache framebuffer is incomplete');
    return {texture,framebuffer,width,height};
  }
  release(target){if(!target)return;this.gl.deleteFramebuffer(target.framebuffer);this.gl.deleteTexture(target.texture);}
  request(camera,options) {
    const W=this.canvas.clientWidth||window.innerWidth,H=this.canvas.clientHeight||window.innerHeight;
    const coarse=!!options.coarse,quality=options.quality||'balanced',dpr=Math.min(window.devicePixelRatio||1,this.options.maxDpr,quality==='economy'?1:2);
    const budget=coarse?(quality==='high'?1000000:600000):(quality==='high'?3000000:2000000);
    const density=Math.min(dpr,Math.sqrt(budget/(W*H)));
    const width=Math.max(1,Math.round(W*density)),height=Math.max(1,Math.round(H*density));
    const key=[W,H,width,height,camera.centerX,camera.centerY,camera.scale,options.iterations,quality,!!options.previewOnly].join('|');
    if(key===this.key)return false;
    this.suspend();this.key=key;this.generation++;this.started=performance.now();
    this.canvas.width=width;this.canvas.height=height;
    const previewDensity=Math.min(.35,Math.sqrt((coarse?40000:80000)/(width*height)));
    const pw=Math.max(1,Math.round(width*previewDensity)),ph=Math.max(1,Math.round(height*previewDensity));
    this.job={generation:this.generation,view:{...camera,aspect:W/H},iterations:options.iterations,
      width,height,quality,coarse,previewOnly:!!options.previewOnly,stage:'preview',target:this.texture(pw,ph),tile:0};
    this.status='preview';return true;
  }
  escape(target,view,iterations,x=0,y=0,width=target.width,height=target.height) {
    const gl=this.gl,p=this.escapeProgram;gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);
    gl.viewport(0,0,target.width,target.height);gl.useProgram(p);gl.enable(gl.SCISSOR_TEST);gl.scissor(x,y,width,height);
    const split=n=>{const hi=Math.fround(n);return [hi,Math.fround(n-hi)];};
    gl.uniform2f(this.uniform(p,'u_centerX'),...split(view.centerX));gl.uniform2f(this.uniform(p,'u_centerY'),...split(view.centerY));
    gl.uniform1f(this.uniform(p,'u_scale'),view.scale);gl.uniform1f(this.uniform(p,'u_aspect'),view.aspect);
    gl.uniform2f(this.uniform(p,'u_resolution'),target.width,target.height);gl.uniform1f(this.uniform(p,'u_maxIter'),iterations);
    gl.drawArrays(gl.TRIANGLES,0,3);gl.disable(gl.SCISSOR_TEST);this.escapeDraws++;
  }
  step() {
    const job=this.job;if(!job)return false;
    if(job.generation!==this.generation)return false;
    if(job.stage==='preview'){
      this.escape(job.target,job.view,Math.min(job.iterations,240));
      this.release(this.current);this.current=job.target;this.current.iterations=Math.min(job.iterations,240);
      if(job.previewOnly){this.job=null;this.status='preview';return false;}
      const deep=job.view.scale<.001;
      const budget=deep?(job.quality==='high'?700000:job.coarse?180000:350000):(job.coarse?1000000:3000000);
      const scale=Math.min(job.quality==='high'?1.4:1,Math.sqrt(budget/(job.width*job.height)));
      job.target=this.texture(Math.max(1,Math.round(job.width*scale)),Math.max(1,Math.round(job.height*scale)));
      job.stage='refine';job.offset=0;this.status='refining';
      if(typeof Worker!=='undefined')try{
        const worker=job.worker=new Worker('./assets/refine-worker.js?v=10');
        worker.onmessage=e=>{if(this.job!==job||e.data.generation!==this.generation)return;this.upload(job,e.data.start,e.data.data);job.offset=e.data.start+e.data.count;if(e.data.done)this.finish(job);this.onProgress?.();};
        worker.onerror=e=>{if(this.job!==job)return;e.preventDefault();worker.terminate();job.worker=null;job.offset=0;this.onProgress?.();};
        worker.postMessage({generation:job.generation,view:job.view,width:job.target.width,height:job.target.height,iterations:job.iterations});
      }catch{job.worker=null;}
      return true;
    }
    if(job.worker)return true;
    const count=Math.min(256,job.target.width*job.target.height-job.offset);
    const data=FractalPrecision.tile(job.view,job.target.width,job.target.height,job.iterations,job.offset,count);
    this.upload(job,job.offset,data);job.offset+=count;
    if(job.offset>=job.target.width*job.target.height)this.finish(job);
    return !!this.job;
  }
  upload(job,start,data){
    const gl=this.gl,width=job.target.width;gl.bindTexture(gl.TEXTURE_2D,job.target.texture);
    for(let offset=0;offset<data.length/4;){const position=start+offset,x=position%width,y=Math.floor(position/width),count=Math.min(width-x,data.length/4-offset);
      gl.texSubImage2D(gl.TEXTURE_2D,0,x,y,count,1,gl.RGBA,gl.UNSIGNED_BYTE,data.subarray(offset*4,(offset+count)*4));offset+=count;}
    this.maxTilePixels=Math.max(this.maxTilePixels,data.length/4);
  }
  finish(job){
    if(this.job!==job||job.generation!==this.generation)return;
    job.worker?.terminate();this.release(this.current);this.current=job.target;this.current.iterations=job.iterations;this.current.view=job.view;
    this.completedGeneration=job.generation;this.job=null;this.status='ready';this.lastRenderMs=performance.now()-this.started;
  }

  present(palette,phase=0) {
    if(!this.current)return;
    const gl=this.gl,p=this.colourProgram;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.useProgram(p);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.current.texture);gl.uniform1i(this.uniform(p,'u_data'),0);
    gl.uniform2f(this.uniform(p,'u_output'),this.canvas.width,this.canvas.height);gl.uniform1f(this.uniform(p,'u_limit'),this.current.iterations);
    gl.uniform1f(this.uniform(p,'u_phase'),phase);gl.uniform1f(this.uniform(p,'u_cycles'),palette.cycles);
    for(const [name,value]of [['a',palette.a],['b',palette.b],['c',palette.c],['d',palette.d],['inside',palette.interior]])gl.uniform3f(this.uniform(p,'u_'+name),...value);
    gl.drawArrays(gl.TRIANGLES,0,3);this.paletteDraws++;
  }
  suspend(){if(this.job){this.job.worker?.terminate();this.release(this.job.target);this.job=null;this.cancelledJobs++;}this.key='';this.status=this.current?'ready':'idle';}
  inspect(){return {generation:this.generation,completedGeneration:this.completedGeneration,pending:!!this.job,waitingWorker:!!this.job?.worker,status:this.status,
    escapeDraws:this.escapeDraws,paletteDraws:this.paletteDraws,cancelledJobs:this.cancelledJobs,maxTilePixels:this.maxTilePixels,
    width:this.canvas.width,height:this.canvas.height,view:this.current?.view,renderMs:this.lastRenderMs,tile:this.job?.offset||0,engine:'double-double worker refinement'};}
  probe(view,width,height,iterations){
    const target=this.texture(width,height),gl=this.gl,data=new Uint8Array(width*height*4);
    this.escape(target,view,iterations);gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,data);
    this.release(target);return [...data];
  }
  readCache(){const gl=this.gl,target=this.current;if(!target||!target.view)return null;const data=new Uint8Array(target.width*target.height*4);gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);gl.readPixels(0,0,target.width,target.height,gl.RGBA,gl.UNSIGNED_BYTE,data);return {data:[...data],width:target.width,height:target.height,view:target.view,iterations:target.iterations};}
  dispose(){this.suspend();this.release(this.current);this.current=null;this.gl.deleteProgram(this.escapeProgram);this.gl.deleteProgram(this.colourProgram);}
};
