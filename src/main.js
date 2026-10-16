import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'controllerRacingSaveV2';
const colors = { cyan:0x20d9f4, red:0xf4484e, gold:0xffb83f, violet:0x9b7aff };
const trackDefs = {
 coast:{name:'Coastal Circuit',sky:0x9ad8ed,grass:0x397b5c,ground:0x548b67,road:0x343d49,edge:0xf2f2ec,points:[[0,0],[0,170],[-100,270],[-250,270],[-340,170],[-330,40],[-220,-65],[-220,-190],[-100,-260],[40,-220],[150,-250],[270,-170],[300,-20],[200,90],[110,60]]},
 forest:{name:'Pine Valley',sky:0xb2c9b8,grass:0x2c6546,ground:0x315d42,road:0x3d4648,edge:0xe6e4d4,points:[[0,0],[20,150],[-65,240],[-210,245],[-300,130],[-255,10],[-330,-110],[-200,-230],[-60,-200],[30,-265],[190,-220],[280,-100],[220,40],[100,80]]},
 neon:{name:'Neon Speedway',sky:0x151d3e,grass:0x192f3b,ground:0x202b43,road:0x303447,edge:0xff5ea8,points:[[0,0],[0,180],[-180,180],[-250,100],[-250,-80],[-170,-190],[0,-190],[190,-190],[270,-90],[270,100],[190,180],[80,180]]}
};
let save={races:0,wins:0,best:{}};try{save={...save,...JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')}}catch{}
const persist=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch{};updateStats()};
let mode='solo',running=false,paused=false,finished=false,soundOn=true,scene,camera,camera2,renderer,clock,trackCurve,roadLength=1,roadMesh,playerCars=[],aiCars=[],allCars=[],decor=[],pads=[],elapsed=0,raceLaps=3,difficulty='normal',activeTrack='coast',animationId=0,toastTimer,keys={},touch={};
let audioCtx;
const carMaterials=new Map();
function updateStats(){ $('stat-races').textContent=save.races||0;$('stat-wins').textContent=save.wins||0;const times=Object.values(save.best||{});$('stat-best').textContent=times.length?fmt(Math.min(...times)/1000):'--:--'; }
function fmt(s){const m=Math.floor(s/60),sec=(s%60).toFixed(2).padStart(5,'0');return String(m).padStart(2,'0')+':'+sec}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1900)}
function makeRenderer(){const canvas=$('world');renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;clock=new THREE.Clock();scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,1600);camera.position.set(0,18,-22);scene.add(new THREE.HemisphereLight(0xcce8ff,0x3b493b,2.0));const sun=new THREE.DirectionalLight(0xfff0d6,3.2);sun.position.set(-100,160,70);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-300;sun.shadow.camera.right=300;sun.shadow.camera.top=300;sun.shadow.camera.bottom=-300;scene.add(sun);window.addEventListener('resize',resizeWorld);}
function resizeWorld(){if(!renderer||!camera)return;renderer.setSize(innerWidth,innerHeight);camera.aspect=mode==='duo'?Math.max(.1,innerWidth/2)/innerHeight:innerWidth/innerHeight;camera.updateProjectionMatrix();if(camera2){camera2.aspect=Math.max(.1,innerWidth/2)/innerHeight;camera2.updateProjectionMatrix()}}
function mat(color,roughness=.8,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness})}
function box(parent,w,h,d,material,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function buildRoad(def){const points=def.points.map(([x,z])=>new THREE.Vector3(x,0,z));trackCurve=new THREE.CatmullRomCurve3(points,true,'catmullrom',.35);const samples=900,segments=trackCurve.getPoints(samples),verts=[],uv=[],indices=[];roadLength=trackCurve.getLength();const half=12;for(let i=0;i<=samples;i++){const p=segments[i],t=trackCurve.getTangentAt(i/samples),side=new THREE.Vector3(-t.z,0,t.x);for(let j=0;j<2;j++){const q=p.clone().addScaledVector(side,j?half:-half);verts.push(q.x,.06,q.z);uv.push(j,i/samples*roadLength/8)}}for(let i=0;i<samples;i++){let a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,b,c,b,d,c)}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();roadMesh=new THREE.Mesh(geo,mat(def.road,.94));roadMesh.receiveShadow=true;scene.add(roadMesh);
for(const sideSign of [-1,1]){const railPts=[];for(let i=0;i<=samples;i++){const p=segments[i],t=trackCurve.getTangentAt(i/samples),side=new THREE.Vector3(-t.z,0,t.x);railPts.push(p.clone().addScaledVector(side,sideSign*14))}const rail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts),samples,.28,6,true),mat(def.edge,.4,.2));rail.position.y=.35;scene.add(rail);const linePts=[];for(let i=0;i<=samples;i+=3){const p=segments[i],t=trackCurve.getTangentAt(i/samples),side=new THREE.Vector3(-t.z,0,t.x);linePts.push(p.clone().addScaledVector(side,sideSign*11.5).add(new THREE.Vector3(0,.12,0)))}const line=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(linePts),linePts.length, .08,5,false),mat(def.edge));scene.add(line)}

 // Dashed racing line and alternating red/white kerbs for stronger track definition.
 const dashMat=mat(0xf1f4e9,.72),redKerb=mat(0xe84b46,.62),whiteKerb=mat(0xf3f2e8,.62);
 for(let i=0;i<100;i++){
   const t=(i+.5)/100,p=trackCurve.getPointAt(t),tan=trackCurve.getTangentAt(t);
   const dash=new THREE.Mesh(new THREE.BoxGeometry(.18,.035,2.6),dashMat);
   dash.position.set(p.x,.105,p.z);dash.rotation.y=Math.atan2(tan.x,tan.z);scene.add(dash);
 }
 for(let i=0;i<Math.floor(samples/5);i++){
   const t=(i*5)/samples,p=trackCurve.getPointAt(t),tan=trackCurve.getTangentAt(t),side=new THREE.Vector3(-tan.z,0,tan.x);
   for(const sign of [-1,1]){
     const q=p.clone().addScaledVector(side,sign*12.55);
     const curb=new THREE.Mesh(new THREE.BoxGeometry(.9,.16,2.1),i%2?redKerb:whiteKerb);
     curb.position.set(q.x,.12,q.z);curb.rotation.y=Math.atan2(tan.x,tan.z);curb.receiveShadow=true;scene.add(curb);
   }
 }

// start/finish stripe
const start=trackCurve.getPointAt(.015),tan=trackCurve.getTangentAt(.015);const stripe=new THREE.Mesh(new THREE.PlaneGeometry(24,3),mat(0xf4f7fa,.5));stripe.rotation.x=-Math.PI/2;stripe.rotation.y=Math.atan2(tan.x,tan.z);stripe.position.set(start.x,.13,start.z);scene.add(stripe);for(let i=0;i<12;i++){const tile=box(scene,2,.06,1.5,mat(i%2?0x17202d:0xffffff),start.x+(i-5.5)*2,.16,start.z);tile.rotation.y=Math.atan2(tan.x,tan.z)}
}
function createTrack(){const def=trackDefs[activeTrack];scene.background=new THREE.Color(def.sky);scene.fog=new THREE.Fog(def.sky,220,680);const ground=new THREE.Mesh(new THREE.PlaneGeometry(1500,1500),mat(def.ground,1));ground.rotation.x=-Math.PI/2;ground.position.y=-.15;ground.receiveShadow=true;scene.add(ground);buildRoad(def);
// broad surrounding terrain detail, clustered trees and trackside boards
for(let i=0;i<190;i++){const t=(i/190+Math.random()*.002)%1,p=trackCurve.getPointAt(t),tan=trackCurve.getTangentAt(t),side=new THREE.Vector3(-tan.z,0,tan.x),sign=i%2?1:-1,dist=18+Math.random()*65,pos=p.clone().addScaledVector(side,sign*dist);if(activeTrack==='neon'){if(i%5===0){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,8,7),mat(0x4c5479));pole.position.set(pos.x,4,pos.z);scene.add(pole);const lamp=new THREE.PointLight(i%2?0x43e8ff:0xff4aaf,10,25);lamp.position.set(pos.x,7,pos.z);scene.add(lamp)}}else{const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.25,.5,3,6),mat(0x4a3728));trunk.position.set(pos.x,1.5,pos.z);trunk.castShadow=true;scene.add(trunk);const crown=new THREE.Mesh(new THREE.ConeGeometry(2.2+Math.random()*1.5,5+Math.random()*4,7),mat(activeTrack==='forest'?(i%3?0x286743:0x3a8050):(i%2?0x39804b:0x4c9560)));crown.position.set(pos.x,5,pos.z);crown.castShadow=true;scene.add(crown)}}
// low-detail grandstands at a few locations
for(let j=0;j<4;j++){const p=trackCurve.getPointAt(.12+j*.23),t=trackCurve.getTangentAt(.12+j*.23),side=new THREE.Vector3(-t.z,0,t.x),pos=p.clone().addScaledVector(side,j%2?35:-35);const stand=new THREE.Group();stand.position.set(pos.x,0,pos.z);stand.rotation.y=Math.atan2(t.x,t.z);for(let row=0;row<4;row++){const seat=box(stand,22,.7,2.5,mat([0x304f77,0xc1d5e8,0xe6a54e][row%3]),0,1+row*.8,row*1.7);seat.rotation.x=-.08}scene.add(stand)}
}
function makeCar(color,playerIndex=-1){
  const root=new THREE.Group();
  const paint=new THREE.MeshPhysicalMaterial({color,roughness:.24,metalness:.42,clearcoat:1,clearcoatRoughness:.14});
  const carbon=mat(0x111820,.38,.35),glass=new THREE.MeshPhysicalMaterial({color:0x79bfd5,metalness:.2,roughness:.12,transparent:true,opacity:.9,clearcoat:1}),rubber=mat(0x090c11,.96),rim=mat(0xb7c7d2,.24,.82),rimDark=mat(0x354451,.4,.72);
  const head=new THREE.MeshStandardMaterial({color:0xf4ffff,emissive:0xc4f3ff,emissiveIntensity:1.7,roughness:.18});
  const tail=new THREE.MeshStandardMaterial({color:0xff281c,emissive:0xf01b0d,emissiveIntensity:1.2,roughness:.24});
  // Sculpted-looking layered GT body, low nose, cockpit and rear aero.
  box(root,2.08,.42,4.12,paint,0,.68,-.02);
  box(root,1.92,.26,1.42,paint,0,.84,.95);
  const nose=box(root,1.78,.22,1.0,paint,0,.73,1.77);nose.rotation.x=-.07;
  box(root,1.72,.13,.5,carbon,0,.51,2.04);
  box(root,1.88,.12,.55,carbon,0,.48,-1.86);
  box(root,1.64,.12,.38,paint,0,.88,-1.68);
  // Cabin and panoramic windscreen.
  const cabin=box(root,1.36,.57,1.72,paint,0,1.13,-.24);cabin.rotation.x=-.05;
  const windshield=box(root,1.18,.42,.08,glass,0,1.39,.53);windshield.rotation.x=-.35;
  const rearGlass=box(root,1.15,.38,.08,glass,0,1.38,-1.03);rearGlass.rotation.x=.34;
  box(root,1.2,.07,.88,carbon,0,1.42,-.22);
  // Wheel assemblies with metallic multi-spoke rims and visible brake discs.
  const wheelPivots=[];
  for(const x of [-1,1]) for(const z of [-1.28,1.28]){
    const pivot=new THREE.Group();pivot.position.set(x*1.01,.48,z);root.add(pivot);wheelPivots.push(pivot);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.28,24),rubber);tire.rotation.z=Math.PI/2;tire.castShadow=true;pivot.add(tire);
    const disk=new THREE.Mesh(new THREE.CylinderGeometry(.285,.285,.295,20),rimDark);disk.rotation.z=Math.PI/2;disk.position.x=x*.012;pivot.add(disk);
    const face=new THREE.Mesh(new THREE.CylinderGeometry(.235,.235,.305,10),rim);face.rotation.z=Math.PI/2;face.position.x=x*.018;pivot.add(face);
    for(let k=0;k<5;k++){const spoke=box(pivot,.035,.36,.055,rim,0,0,0);spoke.position.set(x*.17,Math.sin(k*Math.PI*2/5)*.15,Math.cos(k*Math.PI*2/5)*.15);spoke.rotation.x=k*Math.PI*2/5}
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.32,12),carbon);hub.rotation.z=Math.PI/2;pivot.add(hub);
    box(root,.14,.2,.18,paint,x*1.02,.76,z>0?1.22:-1.22);
  }
  // Mirrors, side skirts, vents, splitter, wing and tail lights.
  for(const x of [-1,1]){
    box(root,.12,.18,.52,carbon,x*1.02,.61,0);
    const mirror=box(root,.28,.12,.22,paint,x*1.1,1.12,.38);mirror.rotation.z=x*.12;
    box(root,.08,.12,1.35,carbon,x*1.01,.43,-.05);
    box(root,.18,.1,.28,head,x*.62,.73,2.12);
    box(root,.22,.12,.16,tail,x*.65,.78,-2.02);
    for(let v=0;v<3;v++)box(root,.035,.09,.34,carbon,x*.72,.72,-.8+v*.15);
  }
  const wingSupport1=box(root,.08,.32,.08,carbon,-.62,1.05,-1.72),wingSupport2=box(root,.08,.32,.08,carbon,.62,1.05,-1.72);
  const wing=box(root,2.05,.1,.38,paint,0,1.25,-1.75);wing.rotation.x=-.04;
  box(root,2.25,.09,.3,carbon,0,.43,2.14);
  // A faint underbody glow makes each selectable car readable at night.
  const glow=new THREE.PointLight(color,.65,5);glow.position.set(0,.25,0);root.add(glow);
  root.userData={playerIndex,bodyMat:paint,wheelPivots};
  scene.add(root);return root
}
function getPose(progress,lateral=0){const t=((progress%roadLength)+roadLength)%roadLength/roadLength,p=trackCurve.getPointAt(t),tan=trackCurve.getTangentAt(t),side=new THREE.Vector3(-tan.z,0,tan.x);p.addScaledVector(side,lateral);return{p,tan,angle:Math.atan2(tan.x,tan.z)}}
function createRacer({playerIndex=-1,color,progress,lateral=0,skill=1}){const mesh=makeCar(color,playerIndex);const car={mesh,playerIndex,color,progress,lateral,speed:0,skill,laps:0,lastLap:0,previousProgress:progress,steer:0,finished:false,boost:0};allCars.push(car);if(playerIndex>=0)playerCars.push(car);else aiCars.push(car);const pose=getPose(progress,lateral);mesh.position.copy(pose.p);mesh.position.y=.2;mesh.rotation.y=pose.angle;return car}
function clearScene(){if(renderer){renderer.dispose();}scene=null;camera=null;camera2=null;playerCars=[];aiCars=[];allCars=[];decor=[]}
function startRaceImpl(){activeTrack=$('track').value;mode=document.querySelector('[data-mode].active').dataset.mode;raceLaps=Number($('laps').value);difficulty=$('difficulty').value;elapsed=0;paused=false;finished=false;running=true;playerCars=[];aiCars=[];allCars=[];if(!renderer)makeRenderer();scene=new THREE.Scene();const def=trackDefs[activeTrack];scene.background=new THREE.Color(def.sky);scene.fog=new THREE.Fog(def.sky,220,680);scene.add(new THREE.HemisphereLight(0xd5eaff,0x465140,2));const sun=new THREE.DirectionalLight(0xfff2dc,3.4);sun.position.set(-80,130,50);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);createTrack();camera=new THREE.PerspectiveCamera(62,mode==='duo'?Math.max(.1,innerWidth/2)/innerHeight:innerWidth/innerHeight,.1,1400);camera2=mode==='duo'?new THREE.PerspectiveCamera(62,Math.max(.1,innerWidth/2)/innerHeight,.1,1400):null;const start=roadLength*.018;const p1=createRacer({playerIndex:0,color:colors[$('car').value],progress:start,lateral:-3});if(mode==='duo')createRacer({playerIndex:1,color:0xffb444,progress:start-4,lateral:3});const count=mode==='time'?0:mode==='duo'?3:4;for(let i=0;i<count;i++)createRacer({color:[0xf4484e,0xffb83f,0x5bde9a,0x9b7aff][i],progress:start-(i+1)*5,lateral:i%2?5:-5,skill:(difficulty==='easy'?.7:difficulty==='hard'?.98:.84)+Math.random()*.1});$('menu').classList.add('hidden');$('game').classList.remove('hidden');$('pause-overlay').classList.add('hidden');$('finish-overlay').classList.add('hidden');$('lap').textContent='1 / '+raceLaps;clock.start();lastTick=performance.now();cancelAnimationFrame(animationId);animationId=requestAnimationFrame(tick);toast('3 · 2 · 1 · GO!')}

function startRace(){try{startRaceImpl()}catch(err){console.error('Controller Racing start failed:',err);running=false;paused=false;$('game').classList.add('hidden');$('menu').classList.remove('hidden');const status=$('pad-status');if(status)status.textContent='Spielstart fehlgeschlagen: '+(err?.message||String(err))+' — bitte Seite neu laden und erneut versuchen.';}}
let lastTick=0;
function inputFor(car){let steer=0,gas=0,brake=0,boost=false;const p=car.playerIndex;if(p===0){steer=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0);gas=keys.ArrowUp||keys.w?1:0;brake=keys.ArrowDown||keys.s?1:0;boost=!!keys.Shift;if(touch.left)steer=-1;if(touch.right)steer=1;if(touch.gas)gas=1;if(touch.brake)brake=1}else if(p===1){steer=(keys.l?1:0)-(keys.j?1:0);gas=keys.i?1:0;brake=keys.k?1:0}
if(p>=0){const selected=Number($(p===0?'p1':'p2').value);const gp=pads.find(x=>x&&x.index===selected);if(gp){const ax=gp.axes?.[0]||0;steer=Math.abs(ax)>.16?ax:((gp.buttons[15]?.pressed?1:0)-(gp.buttons[14]?.pressed?1:0));gas=Math.max(gp.buttons[7]?.value||0,gp.buttons[0]?.pressed?1:0);brake=Math.max(gp.buttons[6]?.value||0,gp.buttons[1]?.pressed?1:0);boost=!!gp.buttons[4]?.pressed}}
return{steer:THREE.MathUtils.clamp(steer,-1,1),gas,brake,boost}}
function updateCar(car,dt){if(car.finished)return;if(car.playerIndex<0){const target=(difficulty==='easy'?48:difficulty==='hard'?67:57)*car.skill;car.speed=THREE.MathUtils.damp(car.speed,target,1.0,dt);car.progress+=car.speed*dt;car.lateral=THREE.MathUtils.damp(car.lateral,Math.sin(car.progress*.012+car.playerIndex)*2.2,1,dt)}else{const inp=inputFor(car),max=inp.boost?78:64,acc=inp.gas?32:0,braking=inp.brake?55:0;car.steer=THREE.MathUtils.damp(car.steer,inp.steer,7,dt);car.speed+=acc*dt;car.speed-=braking*dt;car.speed-=car.speed*(inp.gas?.18:.42)*dt;car.speed=THREE.MathUtils.clamp(car.speed,0,max);const turnGrip=THREE.MathUtils.clamp(car.speed/35,.25,1.6);car.lateral+=car.steer*dt*(2.5+car.speed*.22);car.lateral*=Math.max(.1,1-dt*(car.speed<2?2:.18));if(Math.abs(car.lateral)>9){car.speed*=Math.max(.2,1-dt*1.2);car.lateral=THREE.MathUtils.clamp(car.lateral,-13,13)}car.progress+=car.speed*dt;car.boost=inp.boost?1:0}
const wraps=Math.floor(car.progress/roadLength)-Math.floor(car.previousProgress/roadLength);if(wraps>0)car.laps+=wraps;car.previousProgress=car.progress;const pose=getPose(car.progress,car.lateral);car.mesh.position.copy(pose.p);car.mesh.position.y=.22;car.mesh.rotation.y=pose.angle+car.steer*.13;car.mesh.rotation.z=-car.steer*.04*Math.min(1,car.speed/25)}
function updateCamera(car,cam=camera){const pose=getPose(car.progress,car.lateral);const forward=pose.tan;const target=pose.p.clone().add(new THREE.Vector3(0,2,0));const desired=pose.p.clone().addScaledVector(forward,-14-Math.min(car.speed*.08,7)).add(new THREE.Vector3(0,7.2,0));cam.position.lerp(desired,.11);cam.lookAt(target)}
function updateHud(){const car=playerCars[0];if(!car)return;$('speed').textContent=String(Math.round(car.speed*3.6)).padStart(3,'0');$('lap').textContent=Math.min(raceLaps,car.laps+1)+' / '+raceLaps;$('timer').textContent=fmt(elapsed);const order=[...allCars].sort((a,b)=>b.progress-a.progress);$('position').textContent=(order.indexOf(car)+1)+' / '+allCars.length}
function tick(now){if(!running)return;animationId=requestAnimationFrame(tick);if(paused)return;const dt=Math.min(.035,Math.max(.001,(now-lastTick)/1000));lastTick=now;elapsed+=dt;allCars.forEach(c=>updateCar(c,dt));if(playerCars[0])updateCamera(playerCars[0],camera);if(mode==='duo'&&playerCars[1]&&camera2){updateCamera(playerCars[1],camera2);const half=Math.floor(innerWidth/2);renderer.setScissorTest(true);renderer.setViewport(0,0,half,innerHeight);renderer.setScissor(0,0,half,innerHeight);renderer.render(scene,camera);renderer.setViewport(half,0,innerWidth-half,innerHeight);renderer.setScissor(half,0,innerWidth-half,innerHeight);renderer.render(scene,camera2);renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight)}else renderer.render(scene,camera);updateHud();const winner=playerCars.find(c=>c.laps>=raceLaps);if(winner)finishRace(winner)}
function finishRace(winner){if(finished)return;finished=true;running=false;const rank=[...allCars].sort((a,b)=>b.progress-a.progress).indexOf(winner)+1;save.races++;if(rank===1)save.wins++;const key=activeTrack+'-'+mode,ms=Math.round(elapsed*1000);if(!save.best[key]||ms<save.best[key])save.best[key]=ms;persist();$('finish-title').textContent=mode==='duo'?(winner.playerIndex===0?'SPIELER 1 GEWINNT!':'SPIELER 2 GEWINNT!'):rank===1?'RACE WINNER':'RACE COMPLETE';$('finish-copy').textContent=(mode==='duo'?'Gewinner: Spieler '+(winner.playerIndex+1):'Position: '+rank+'. Platz')+' · Zeit '+fmt(elapsed)+'. '+(rank===1?'Stark gefahren! Weiter so.':'Noch eine Runde? Du schaffst das!');$('finish-overlay').classList.remove('hidden');playTone(620,.22)}
function pauseToggle(){if(!running||finished)return;paused=!paused;$('pause-overlay').classList.toggle('hidden',!paused);if(!paused)lastTick=performance.now()}
function leaveGame(){running=false;paused=false;cancelAnimationFrame(animationId);$('game').classList.add('hidden');$('menu').classList.remove('hidden');scene=null;camera=null;camera2=null;updateStats()}
function playTone(freq,duration=.08){if(!soundOn)return;try{audioCtx=audioCtx||new AudioContext();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=freq;o.type='triangle';g.gain.value=.035;o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.stop(audioCtx.currentTime+duration)}catch{}}
function refreshPads(){pads=Array.from(navigator.getGamepads?.()||[]).filter(Boolean);const connected=pads.filter(p=>p.connected);for(const id of ['p1','p2']){const el=$(id),old=el.value;el.innerHTML='';const base=document.createElement('option');base.value='-1';base.textContent=id==='p1'?'Tastatur / Touch':'Tastatur I J K L';el.append(base);connected.forEach(g=>{const o=document.createElement('option');o.value=g.index;o.textContent='Pad '+(g.index+1)+' · '+(g.id||'Gamepad').slice(0,34);el.append(o)});if([...el.options].some(o=>o.value===old))el.value=old;else if(id==='p1'&&connected.length)el.value=connected[0].index;else if(id==='p2'&&connected.length>1)el.value=connected[1].index}$('pad-status').textContent=connected.length?connected.length+' Controller erkannt. '+connected.map(g=>g.id||'Gamepad').join(' · '):'Kein Controller erkannt. Verbinde ihn, drücke eine Taste und aktualisiere die Liste.'}
window.addEventListener('gamepadconnected',refreshPads);window.addEventListener('gamepaddisconnected',refreshPads);setInterval(refreshPads,1500);
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));if(b.dataset.mode==='duo')toast('Für Spieler 2: zweites Gamepad oder I J K L verwenden')}));
$('start').onclick=startRace;$('pause').onclick=pauseToggle;$('resume').onclick=pauseToggle;$('quit').onclick=$('finish-menu').onclick=leaveGame;$('again').onclick=startRace;$('scan').onclick=()=>{refreshPads();toast('Controller-Liste aktualisiert')};$('fullscreen').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();if(screen.orientation?.lock)await screen.orientation.lock('landscape').catch(()=>{})}catch{toast('Vollbild über das Browser-Menü aktivieren')}};$('sound').onclick=()=>{soundOn=!soundOn;$('sound').textContent='♫ Ton: '+(soundOn?'An':'Aus');if(soundOn)playTone(500)};$('reset').onclick=()=>{if(confirm('Alle lokalen Rennen, Siege und Bestzeiten löschen?')){save={races:0,wins:0,best:{}};persist();toast('Spielstand zurückgesetzt')}};
$('track').onchange=()=>{$('track-preview').dataset.track=$('track').value};window.addEventListener('keydown',e=>{keys[e.key]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(e.key==='Escape'&&running)pauseToggle();if(e.key==='Enter'&&paused)pauseToggle()});window.addEventListener('keyup',e=>keys[e.key]=false);window.addEventListener('blur',()=>{keys={};touch={}});document.querySelectorAll('[data-touch]').forEach(b=>{const c=b.dataset.touch;const down=e=>{e.preventDefault();touch[c]=true};const up=e=>{e.preventDefault();touch[c]=false};b.addEventListener('pointerdown',down);['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,up))});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.deferredInstall=e});if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});updateStats();refreshPads();
