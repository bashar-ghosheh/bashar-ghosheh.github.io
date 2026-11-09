// Normalized unit step: displacement tends to one. Differentiate to get velocity.
function state(t,z,w) {
  const a=z*w;
  if(Math.abs(z-1)<1e-10) {
    const decay=Math.exp(-w*t);
    return [1-(1+w*t)*decay,w*w*t*decay];
  }
  if(z<1) {
    const d=w*Math.sqrt(1-z*z), decay=Math.exp(-a*t);
    return [1-decay*(Math.cos(d*t)+a*Math.sin(d*t)/d),w*w*decay*Math.sin(d*t)/d];
  }
  const d=w*Math.sqrt(z*z-1), slow=-a+d, fast=-a-d;
  const s=Math.exp(slow*t), f=Math.exp(fast*t);
  return [1+(fast*s-slow*f)/(slow-fast),w*w*(s-f)/(slow-fast)];
}
function quadraticRoots(center, discriminant) {
  const d=Math.sqrt(Math.abs(discriminant));
  return discriminant<0 ? [[center,d],[center,-d]] : [[center+d,0],[center-d,0]];
}
function poles(z,w) { return quadraticRoots(-z*w,(z*z-1)*w*w); }
// For A = [[0,1],[-k/m,-b/m]], use trace and determinant.
function eigen(m,b,k) {
  const halfTrace=-b/(2*m);
  return quadraticRoots(halfTrace,halfTrace*halfTrace-k/m);
}
function samples(z,w) {
  const slowRate=-poles(z,w)[0][0];
  const end=8/slowRate;
  return Array.from({length:2001},(_,i)=>{
    const t=end*i/2000; return [t,...state(t,z,w)];
  });
}
// Interpolate threshold crossings between adjacent plotted samples.
function crossing(a,b,level) {return a[0]+(b[0]-a[0])*(level-a[1])/(b[1]-a[1]);}
function metrics(curve) {
  function first(level) {
    const i=curve.findIndex(p=>p[1]>=level);
    return crossing(curve[i-1],curve[i],level);
  }
  const peak=curve.reduce((best,p)=>p[1]>best[1]?p:best);
  const i=curve.findLastIndex(p=>Math.abs(p[1]-1)>.02);
  return {rise:first(.9)-first(.1),peak:peak[1]>1?peak[0]:null,
    overshoot:100*Math.max(0,peak[1]-1),settle:crossing(curve[i],curve[i+1],curve[i][1]<1?.98:1.02)};
}
if(typeof module!=='undefined') module.exports={state,poles,eigen,samples,metrics};
