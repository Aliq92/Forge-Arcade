export class History{
 constructor(limit=600){this.limit=limit;this.data=[];}
 add(values){const sample={};for(const [k,v]of Object.entries(values))if(v===null||typeof v==='number'&&Number.isFinite(v))sample[k]=v;this.data.push(sample);if(this.data.length>this.limit)this.data.splice(0,this.data.length-this.limit);}
 clear(){this.data=[];}
}
