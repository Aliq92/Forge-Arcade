// Scenery shares the existing engine and uses three merged meshes, no textures.
export function riverCenter(field, z) {
  const phase = (field.seed % 997) / 997 * Math.PI * 2;
  return 130 * Math.sin(z * .0035 + phase) + 65 * Math.sin(z * .008 - phase);
}
export function installRiver(Field) {
  const original = Field.prototype.height;
  Field.prototype.height = function(x, z) {
    const height = original.call(this, x, z);
    const distance = Math.abs(x - riverCenter(this, z));
    const width = 38 + 9 * Math.sin(z * .006 + this.seed % 31);
    const bank = Math.max(0, Math.min(1, (distance - width) / 65));
    const blend = bank * bank * (3 - 2 * bank);
    return Math.min(height, -12 + (height + 12) * blend);
  };
}
export function createScenery(field, T) {
  const {Group, Geometry, Attribute, Material, Mesh, Color, random} = T;
  const root = new Group();
  root.name = 'Rivers, forests and clouds';
  const resources = [];
  const rng = random(field.seed ^ 0x4a92bc);
  function batch(name, vertices, colors, options = {}) {
    const geometry = new Geometry();
    geometry.setAttribute('position', new Attribute(new Float32Array(vertices), 3));
    geometry.setAttribute('color', new Attribute(new Float32Array(colors), 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const material = new Material({vertexColors:true, flatShading:true, roughness:1, ...options});
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    root.add(mesh);
    resources.push(geometry, material);
    return mesh;
  }
  function triangle(v, c, a, b, d, color) {
    v.push(...a,...b,...d);
    for(let i=0;i<3;i++) c.push(color.r,color.g,color.b);
  }
  // Match the terrain's actual triangle surface so trunks sit on the ground.
  function ground(x,z) {
    const step=2000/150;
    const gx=Math.floor((x+1000)/step)*step-1000;
    const gz=Math.floor((z+1000)/step)*step-1000;
    const u=(x-gx)/step, v=(z-gz)/step;
    const a=field.height(gx,gz), b=field.height(gx+step,gz);
    const c=field.height(gx,gz+step), d=field.height(gx+step,gz+step);
    return u+v<=1 ? a+(b-a)*u+(c-a)*v : d+(c-d)*(1-u)+(b-d)*(1-v);
  }
  const waterV=[],waterC=[];
  // A level water table fills the carved river and natural lowland lakes.
  const blue=new Color('#3b9da7');
  for(let z=-1000;z<1000;z+=80) for(let x=-1000;x<1000;x+=80){
    const a=[x,-7,z],b=[x+80,-7,z],c=[x,-7,z+80],d=[x+80,-7,z+80];
    const tint=blue.clone().multiplyScalar(.90+rng()*.18);
    triangle(waterV,waterC,a,c,b,tint);triangle(waterV,waterC,b,c,d,tint);
  }
  const water=batch('River and lakes',waterV,waterC,{roughness:.35,metalness:.12});
  const treesV=[],treesC=[];
  const bark=new Color('#63503b');
  function cone(x,y,z,radius,height,color,sides=5) {
    for(let i=0;i<sides;i++) {
      const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;
      triangle(treesV,treesC,[x+Math.cos(a)*radius,y,z+Math.sin(a)*radius],
        [x,y+height,z],[x+Math.cos(b)*radius,y,z+Math.sin(b)*radius],color);
    }
  }
  for(let i=0;i<4200;i++) {
    const x=(rng()-.5)*1940,z=(rng()-.5)*1940,y=ground(x,z);
    const patch=field.rollingNoise.noise2D(x*.006,z*.006);
    if(y<-4||y>68||patch<-.08||field.normalAt(x,z).y<.86) continue;
    const height=8+rng()*14,radius=3+rng()*4;
    cone(x,y-.6,z,1,height*.55,bark);
    const green=new Color().setHSL(.29+rng()*.06,.30+rng()*.20,.19+rng()*.12);
    cone(x,y+height*.18,z,radius,height*.82,green);
    cone(x,y+height*.44,z,radius*.73,height*.7,green);
  }
  batch('Forest groves',treesV,treesC);
  const cloudV=[],cloudC=[];
  for(let i=0;i<30;i++) {
    const x=(rng()-.5)*2200,z=(rng()-.5)*2200,y=210+rng()*180;
    for(let puff=0;puff<4;puff++) {
      const px=x+(puff-1.5)*27,py=y+rng()*13,pz=z+(rng()-.5)*22;
      const rx=30+rng()*22,ry=12+rng()*12,rz=22+rng()*25;
      const points=[[px+rx,py,pz],[px,py,pz+rz],[px-rx,py,pz],[px,py,pz-rz]];
      for(let j=0;j<4;j++) {
        triangle(cloudV,cloudC,points[j],[px,py+ry,pz],points[(j+1)%4],new Color('#edf3f2'));
        triangle(cloudV,cloudC,points[(j+1)%4],[px,py-ry*.6,pz],points[j],new Color('#becdd1'));
      }
    }
  }
  const clouds=batch('Drifting cloud banks',cloudV,cloudC);
  return {
    group:root,
    update(time){clouds.position.x=Math.sin(time*.012)*90;clouds.position.z=Math.sin(time*.008)*50;water.material.roughness=.35+Math.sin(time*.6)*.04;},
    setWireframe(enabled){root.visible=!enabled;},
    dispose(){for(const resource of resources) resource.dispose();}
  };
}
