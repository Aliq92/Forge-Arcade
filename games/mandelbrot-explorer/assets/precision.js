/* Fixed double-double arithmetic (~100 useful binary digits), not arbitrary precision.
   Each complex parameter is the Float64 value produced by the viewport mapping. */
(function(root){
  function add(a,b,c,d){const s=a+c,v=s-a,e=(a-(s-v))+(c-v)+b+d,t=s+e;return [t,e-(t-s)];}
  function mul(a,b,c,d){const p=a*c,k=134217729,aa=k*a,ah=aa-(aa-a),al=a-ah,cc=k*c,ch=cc-(cc-c),cl=c-ch;
    const e=((ah*ch-p)+ah*cl+al*ch)+al*cl+a*d+b*c+b*d,t=p+e;return [t,e-(t-p)];}
  function escape(cx,cy,limit){let x=0,xl=0,y=0,yl=0;
    for(let n=1;n<=limit;n++){
      const rr=mul(x,xl,x,xl),ii=mul(y,yl,y,yl),ri=mul(x,xl,y,yl);
      const re=add(rr[0],rr[1],-ii[0],-ii[1]),nr=add(re[0],re[1],cx,0),ni=add(2*ri[0],2*ri[1],cy,0);
      x=nr[0];xl=nr[1];y=ni[0];yl=ni[1];const magnitude=x*x+y*y;
      if(magnitude>256)return {escaped:true,iterations:n,smooth:n+1-Math.log2(Math.log2(Math.sqrt(magnitude)))};
    }return {escaped:false,iterations:limit,smooth:limit};
  }
  function tile(view,width,height,limit,start,count){
    const data=new Uint8Array(count*4);
    for(let i=0;i<count;i++){
      const index=start+i,x=index%width,y=Math.floor(index/width);
      const cx=view.centerX+((x+.5)/width-.5)*2*view.scale*view.aspect;
      const cy=view.centerY+((y+.5)/height-.5)*2*view.scale;
      const xx=cx-.25,yy=cy*cy,q=xx*xx+yy;
      const inside=q*(q+xx)<.25*yy-1e-10||(cx+1)*(cx+1)+yy<.0625-1e-10;
      const r=inside?{escaped:false}:escape(cx,cy,limit),offset=i*4;
      if(!r.escaped){data[offset]=data[offset+1]=255;continue;}
      const smooth=Math.max(0,Math.min(65534,Math.round((r.smooth+4)*16)));
      data[offset]=r.iterations>>8;data[offset+1]=r.iterations&255;
      data[offset+2]=smooth>>8;data[offset+3]=smooth&255;
    }return data;
  }
  root.FractalPrecision={escape,tile};
})(typeof self==='undefined'?window:self);
