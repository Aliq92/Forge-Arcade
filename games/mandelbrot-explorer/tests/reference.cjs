const fs=require('fs'),vm=require('vm'),path=require('path');const context={window:null};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/fractal-core.js'),'utf8'),context);
// Independent 96-bit fixed-point orbit. No GPU helpers, doubles or analytic interior shortcuts in its recurrence.
const BITS=96n,ONE=1n<<BITS;
function fixed(n){const data=new DataView(new ArrayBuffer(8));data.setFloat64(0,n);const bits=data.getBigUint64(0),sign=bits>>63n?-1n:1n,exp=Number((bits>>52n)&2047n),mantissa=(bits&((1n<<52n)-1n))|(exp?1n<<52n:0n),shift=(exp?exp-1023-52:-1074)+Number(BITS);return sign*(shift>=0?mantissa<<BigInt(shift):mantissa>>BigInt(-shift));}
function reference(cx,cy,limit){const cr=fixed(cx),ci=fixed(cy);let x=0n,y=0n;for(let n=1;n<=limit;n++){const next=(x*x-y*y)/ONE+cr;y=2n*x*y/ONE+ci;x=next;const mag=x*x+y*y;if(mag>256n*ONE*ONE)return {escaped:true,iterations:n,smooth:context.FractalCore.smooth(n,Number(mag)/Number(ONE*ONE))};}return {escaped:false,iterations:limit,smooth:limit};}
module.exports={reference,core:context.FractalCore};
