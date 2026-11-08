/* A new worker owns each generation; termination cancels all obsolete numerical work. */
importScripts('./precision.js?v=10');
onmessage=event=>{
  const {generation,view,width,height,iterations}=event.data,total=width*height;
  for(let start=0;start<total;start+=1024){
    const data=FractalPrecision.tile(view,width,height,iterations,start,Math.min(1024,total-start));
    postMessage({generation,start,count:data.length/4,data,done:start+1024>=total},[data.buffer]);
  }
};
