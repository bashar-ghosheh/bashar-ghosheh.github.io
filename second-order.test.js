const test = require('node:test');
const assert = require('node:assert/strict');
const {state, poles, eigen, metrics, samples} = require('./second-order');
const near = (a,b,tol) => assert.ok(Math.abs(a-b)<=tol, a+' versus '+b);
test('16.3% overshoot and critical damping without overshoot',()=>{
  for(const [z,expected] of [[.5,16.3],[1,0],[2,0]]) {
    const curve=samples(z,2);
    const result=metrics(curve);
    near(result.overshoot,expected,.06);
    assert.ok(result.settle>result.rise);
    if(z===.5) near(result.peak,Math.PI/Math.sqrt(3),.015);
  }
});
test('state eigenvalues agree with transfer poles for m=1,b=2,k=4',()=>{
  const roots=eigen(1,2,4);assert.deepEqual(roots,poles(.5,2));
  near(roots[0][0],-1,1e-9);near(roots[0][1],1.732,.001);
});
test('all regimes start at rest and velocity equals derivative',()=>{
  for(const z of [.3,1,1.8]){
    const [x,v]=state(.7,z,2);
    near(state(0,z,2)[0],0,1e-12);near(state(0,z,2)[1],0,1e-12);
    near((state(.700001,z,2)[0]-x)/.000001,v,.00001);
  }
});
