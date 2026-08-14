
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const lerp = (a,b,t)=>a+(b-a)*t;

function makeSparkleTexture(){
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(.25,'rgba(255,255,255,.9)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(c);
}
const sparkleTex = makeSparkleTexture();

// A gema física (transmission) some quando não há nada opaco atrás dela —
// com o canvas transparente e sem scene.background, o alvo de transmissão
// amostra "preto". Na faceta da mesa (topo, quase de frente pra câmera) o
// Fresnel dá pouca reflexão e muita transmissão, then essa faceta vira uma
// "janela" pro fundo escuro atrás do anel — um buraco no meio da pedra,
// cercado pelas facetas da coroa (em ângulo, refletindo forte = brancas).
// Por isso transmission fica em 0: o brilho vem só de clearcoat/specular/
// envMap (que não dependem do que está atrás) mais um emissive constante,
// garantindo que a pedra nunca fique "vazada" nem some em ângulos ruins.
function makeGemMaterial(tint = 0xffffff){
  return new THREE.MeshPhysicalMaterial({
    color: tint,
    metalness: 0,
    roughness: 0.22,
    transmission: 0,
    ior: 2.4,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    specularIntensity: 1,
    specularColor: 0xffffff,
    envMapIntensity: 4,
    emissive: tint,
    emissiveIntensity: 0.45
  });
}

const gltfLoader = new GLTFLoader();

class RingScene{
  constructor(canvas, panel, opts){
    this.canvas = canvas;
    this.panel = panel;
    this.opts = opts;
    this.mouse = {x:0,y:0};
    this.target = {tiltX:0, tiltY:0, scale:1, speed:opts.idleSpeed};
    this.current = {rotY:0, tiltX:.95, tiltY:.32, scale:1};
    this.visible = true;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(0,0,6.2);

    this.renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const key = new THREE.DirectionalLight(0xfff4e0, 1.6);
    key.position.set(3,4,5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xbcd4ff, .4);
    fill.position.set(-4,-2,3);
    this.scene.add(fill);
    this.scene.add(new THREE.AmbientLight(0xffffff, .25));

    this.group = new THREE.Group();
    this.scene.add(this.group);

    if(opts.modelUrl){
      this._loadModel(opts.modelUrl);
    } else {
      this._buildProceduralRing();
    }

    this.sparkles = [];
    const sparkleCount = 5;
    for(let i=0;i<sparkleCount;i++){
      const mat = new THREE.SpriteMaterial({map: sparkleTex, color: opts.sparkleColor, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false});
      const spr = new THREE.Sprite(mat);
      const a = Math.random()*Math.PI*2;
      const r = 1.05 + Math.random()*.25;
      spr.position.set(Math.cos(a)*r, Math.sin(a)*r*0.62, (Math.random()-0.5)*.5);
      const s = 0.05 + Math.random()*.09;
      spr.scale.set(s,s,s);
      spr.userData.phase = Math.random()*Math.PI*2;
      spr.userData.baseScale = s;
      this.group.add(spr);
      this.sparkles.push(spr);
    }

    this.group.rotation.x = this.current.tiltX;
    this.group.rotation.y = this.current.tiltY;

    this._bindEvents();
    this._observe();
    this._resize();
    window.addEventListener('resize', ()=>this._resize());
  }

  _buildProceduralRing(){
    const bandGeo = new THREE.TorusGeometry(1, 0.34, 64, 160);
    const material = new THREE.MeshPhysicalMaterial({
      color: this.opts.color,
      metalness: 1,
      roughness: this.opts.roughness,
      clearcoat: .5,
      clearcoatRoughness: .18,
      envMapIntensity: 1.25
    });
    this.ring = new THREE.Mesh(bandGeo, material);
    this.ring.scale.set(1,1,.62);
    this.group.add(this.ring);
  }

  _loadModel(url){
    gltfLoader.load(url, (gltf)=>{
      const root = gltf.scene;

      const goldMat = new THREE.MeshPhysicalMaterial({
        color: this.opts.color,
        metalness: 1,
        roughness: this.opts.roughness,
        clearcoat: .5,
        clearcoatRoughness: .18,
        envMapIntensity: 1.25
      });
      const gemMat = makeGemMaterial(this.opts.gemColor);

      root.traverse((child)=>{
        if(!child.isMesh) return;
        if(/diamond/i.test(child.name)){
          child.material = gemMat;
          child.geometry.computeVertexNormals();
        } else {
          child.material = goldMat;
          child.geometry.computeVertexNormals();
        }
      });

      // Center on its own bounding-box center, then scale to match the
      // footprint the procedural torus used, so both rings read at the
      // same visual size inside the shared rotating group.
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 2.5 / maxDim;

      const wrapper = new THREE.Group();
      root.position.set(-center.x, -center.y, -center.z);
      wrapper.add(root);
      wrapper.scale.setScalar(scale);
      this.group.add(wrapper);
    }, undefined, (err)=>{
      console.error('Falha ao carregar o modelo do anel, usando fallback procedural:', err);
      this._buildProceduralRing();
    });
  }

  _bindEvents(){
    const setHover = (on)=>{
      this.panel.classList.toggle('hovered', on);
      this.target.speed = on ? this.opts.hoverSpeed : this.opts.idleSpeed;
      this.target.scale = on ? 1.08 : 1;
      this.target.tiltX = on ? -0.18 : 0;
    };
    this.panel.addEventListener('mouseenter', ()=>setHover(true));
    this.panel.addEventListener('mouseleave', ()=>{
      setHover(false);
      this.mouse.x = 0; this.mouse.y = 0;
    });
    this.panel.addEventListener('mousemove', (e)=>{
      const r = this.panel.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    });
    const toggleOpen = ()=>{
      const willOpen = !this.panel.classList.contains('open');
      this.panel.classList.toggle('open', willOpen);
      this.panel.setAttribute('aria-expanded', String(willOpen));
      this.target.speed = willOpen ? this.opts.hoverSpeed : this.opts.idleSpeed;
      this.target.scale = willOpen ? 1.08 : 1;
      this.target.tiltX = willOpen ? -0.18 : 0;
    };
    this.panel.addEventListener('click', (e)=>{
      if(e.target.closest('.cta')) return;
      toggleOpen();
    });
    this.panel.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        toggleOpen();
      }
    });
    this.panel.querySelector('.rings3d-cta').addEventListener('click', (e)=>{
      e.stopPropagation();
    });
  }

  _observe(){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        this.visible = entry.isIntersecting;
        if(entry.isIntersecting) this.panel.classList.add('in-view');
      });
    }, {threshold:.15});
    io.observe(this.panel);
  }

  _resize(){
    const r = this.panel.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w/h;
    this.camera.updateProjectionMatrix();
  }

  tick(t){
    if(!this.visible) return;
    this.current.rotY += 0.0022 + this.target.speed;
    this.group.rotation.y = this.current.tiltY + this.current.rotY + this.mouse.x*0.28;
    const targetTiltX = 0.95 + this.target.tiltX + this.mouse.y*0.12;
    this.current.tiltX = lerp(this.current.tiltX, targetTiltX, 0.06);
    this.group.rotation.x = this.current.tiltX;
    this.current.scale = lerp(this.current.scale, this.target.scale, 0.08);
    this.group.scale.setScalar(this.current.scale);

    this.sparkles.forEach((spr,i)=>{
      const s = spr.userData.baseScale * (0.6 + 0.4*Math.sin(t*0.002 + spr.userData.phase));
      spr.scale.set(s,s,s);
      spr.material.opacity = 0.35 + 0.65*Math.max(0, Math.sin(t*0.0015 + spr.userData.phase*1.7));
    });

    this.renderer.render(this.scene, this.camera);
  }
}

const silverScene = new RingScene(
  document.getElementById('canvasSilver'),
  document.getElementById('panelSilver'),
  { color:0xd7d9dc, roughness:0.28, idleSpeed:0.0016, hoverSpeed:0.006, modelUrl: 'assets/the_crowned_ring.glb', gemColor:0xe8f2ff, sparkleColor:0xffffff }
);
const goldScene = new RingScene(
  document.getElementById('canvasGold'),
  document.getElementById('panelGold'),
  { color:0xd9ac4f, roughness:0.22, idleSpeed:0.0016, hoverSpeed:0.006, modelUrl: 'assets/the_crowned_ring.glb', gemColor:0xffffff, sparkleColor:0xffe9b0 }
);

function animate(t){
  silverScene.tick(t);
  goldScene.tick(t);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

document.addEventListener('visibilitychange', ()=>{
  silverScene.visible = goldScene.visible = !document.hidden;
});
