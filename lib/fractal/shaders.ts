export const vertexShader = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
export const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution,uPan;
uniform float uTime,uDistance,uYaw,uPitch,uRoll,uDetail,uMorph,uPalette,uJourney,uTravel;
uniform int uKind;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
vec3 transform(vec3 p){p.xy=rot(uRoll)*p.xy;p.xz=rot(uYaw)*p.xz;p.yz=rot(uPitch)*p.yz;return p;}
vec2 bulb(vec3 p){vec3 z=p;float dr=1.,r=0.,trap=10.;float power=8.+uMorph*sin(uTime*.19)*1.5;for(int i=0;i<10;i++){r=length(z);trap=min(trap,r);if(r>2.5)break;float rr=max(r,.00001);float theta=acos(clamp(z.z/rr,-1.,1.)),phi=atan(z.y,z.x);dr=pow(rr,power-1.)*power*dr+1.;float zr=pow(rr,power);theta*=power;phi*=power;z=zr*vec3(sin(theta)*cos(phi),sin(phi)*sin(theta),cos(theta))+p;}return vec2(.5*log(max(r,.00001))*r/max(dr,.00001),trap);}
vec2 boxDE(vec3 p){vec3 z=p;float dr=1.,trap=10.;float scale=-1.75-uMorph*.12*sin(uTime*.13);for(int i=0;i<12;i++){z=clamp(z,-1.,1.)*2.-z;float r2=dot(z,z);trap=min(trap,r2);float f=clamp(1./max(r2,.00001),1.,4.);z*=f;dr*=f;z=z*scale+p;dr=dr*abs(scale)+1.;}return vec2(length(z)/abs(dr)*.65,sqrt(trap));}
vec2 map(vec3 p){if(uJourney>.5){p.z=mod(p.z+uTravel+2.5,5.)-2.5;p.x=abs(p.x)-2.1;}p=transform(p);if(uKind==0)return bulb(p);return boxDE(p*2.)*.5;}
vec3 normalAt(vec3 p,float e){vec2 k=vec2(1.,-1.);return normalize(k.xyy*map(p+k.xyy*e).x+k.yyx*map(p+k.yyx*e).x+k.yxy*map(p+k.yxy*e).x+k.xxx*map(p+k.xxx*e).x);}
vec3 palette(float t){vec3 a=vec3(.48,.5,.53),b=vec3(.48,.44,.4),d=vec3(0.,.16,.27);if(uPalette>.5&&uPalette<1.5)d=vec3(.02,.08,.19);if(uPalette>1.5&&uPalette<2.5)d=vec3(.3,.13,.02);if(uPalette>2.5)d=vec3(.65,.48,.32);return a+b*cos(6.28318*(t+d));}
float shadow(vec3 p,vec3 l){float res=1.,t=.015;for(int i=0;i<20;i++){float h=map(p+l*t).x;res=min(res,12.*h/t);t+=clamp(h,.015,.16);if(t>2.5||res<.03)break;}return clamp(res,.08,1.);}
void main(){vec2 uv=(gl_FragCoord.xy*2.-uResolution)/uResolution.y;vec3 ro=vec3(uPan,uDistance),rd=normalize(vec3(uv,-2.15));float t=0.,trap=0.,h=1.;int steps=0;float eps=.0006+(1.-uDetail)*.0015;
for(int i=0;i<180;i++){if(float(i)>65.+uDetail*110.)break;vec2 d=map(ro+rd*t);h=d.x;trap=d.y;steps=i;if(h<eps*max(1.,t)||t>12.)break;t+=max(h*.8,eps*.4);}
vec3 bg=vec3(.016,.022,.034),color=bg+vec3(.025,.045,.055)*exp(-dot(uv,uv)*.55);if(h<eps*max(1.,t)&&t<12.){vec3 p=ro+rd*t,n=normalAt(p,eps*2.),light=normalize(vec3(-3.,4.,5.));float dif=max(dot(n,light),0.),ao=1.;for(int j=1;j<=3;j++){float d=float(j)*.055;ao-=max(0.,d-map(p+n*d).x)*1.5;}ao=clamp(ao,.2,1.);float sh=shadow(p+n*eps*5.,light),rim=pow(1.-max(dot(n,-rd),0.),3.);vec3 base=palette(trap*.55+length(p)*.12);color=base*(.19+dif*sh*.95)*ao+vec3(.3,.8,.8)*rim*.38;color+=pow(max(dot(n,normalize(light-rd)),0.),32.)*sh*.4;color=mix(color,bg,1.-exp(-.035*t*t));}
color+=palette(.2)*pow(float(steps)/180.,3.)*.15;color=pow(max(color,0.),vec3(.85));color*=1.-.22*smoothstep(.4,1.8,length(vUv-.5));gl_FragColor=vec4(color,1.);}`;
