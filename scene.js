// Rolithax instance map — quiet holographic diagram.
// Additive shader materials composite over the photo backdrop
// (canvas uses mix-blend-mode: screen in styles.css).
// Intent: a calm supporting graphic, not the main event.

const PALETTE = {
  lime: 0xb7d96c,
  warm: 0xe0a463,
  pale: 0xdfe6cc
};

const GLSL_FRESNEL_VERT = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vTop;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    vTop = step(0.5, normal.y);
    gl_Position = projectionMatrix * mv;
  }
`;

const GLSL_FRESNEL_FRAG = /* glsl */`
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uBase;
  uniform float uTopLight;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vTop;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.6);
    float a = (uBase + f * 0.7 + vTop * uTopLight) * uIntensity;
    gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;

const GLSL_UV_VERT = /* glsl */`
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// Floor: one anti-aliased grid with a radial falloff. No pulses.
const GLSL_FLOOR_FRAG = /* glsl */`
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vWorld;
  void main() {
    vec2 q = vWorld.xz * 0.72;
    vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
    float line = 1.0 - min(min(g.x, g.y), 1.0);
    float fade = smoothstep(5.6, 0.8, length(vWorld.xz));
    gl_FragColor = vec4(uColor, clamp(line * fade * uIntensity, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;

// Data arc: faint line with a single slow travelling highlight.
const GLSL_FLOW_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uSpeed;
  uniform float uOffset;
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float head = fract(uTime * uSpeed + uOffset);
    float t = vUv.x - head;
    float comet = t < 0.0 ? exp(t * 11.0) : exp(-t * 60.0);
    float ends = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
    float a = (0.14 + comet * 0.5) * ends * uIntensity;
    gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;

const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

export function createScene(Three, canvas, { isStory = false, reducedMotion = false } = {}) {
  const parent = canvas.parentElement;
  let renderer;
  try {
    renderer = new Three.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = Three.SRGBColorSpace;

  const scene = new Three.Scene();
  const camera = new Three.PerspectiveCamera(isStory ? 33 : 30, 1, .1, 100);
  const world = new Three.Group();
  scene.add(world);
  const C = (hex) => new Three.Color(hex);
  const V = (x, y, z) => new Three.Vector3(x, y, z);
  const FLOOR_Y = -1.05;
  const HUB = V(0, .62, 0);

  const glowTexture = (() => {
    const size = 128;
    const element = document.createElement('canvas');
    element.width = element.height = size;
    const ctx = element.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(.22, 'rgba(255,255,255,.4)');
    gradient.addColorStop(.5, 'rgba(255,255,255,.1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new Three.CanvasTexture(element);
    texture.colorSpace = Three.SRGBColorSpace;
    return texture;
  })();

  // ---------- materials ----------
  const additive = { transparent: true, depthWrite: false, blending: Three.AdditiveBlending };
  const timed = [];
  const fresnel = (color, o = {}) => new Three.ShaderMaterial({
    ...additive,
    side: Three.DoubleSide,
    vertexShader: GLSL_FRESNEL_VERT,
    fragmentShader: GLSL_FRESNEL_FRAG,
    uniforms: {
      uColor: { value: C(color) },
      uIntensity: { value: o.intensity ?? .7 },
      uBase: { value: o.base ?? .03 },
      uTopLight: { value: o.top ?? 0 }
    }
  });
  const lineMat = (color, opacity) => new Three.LineBasicMaterial({ ...additive, color, opacity });
  const basicMat = (color, opacity, map = null) => new Three.MeshBasicMaterial({ ...additive, color, opacity, map, side: Three.DoubleSide });
  const spriteMat = (color, opacity) => new Three.SpriteMaterial({ ...additive, map: glowTexture, color, opacity });
  const flowMat = (color, speed, offset, intensity) => {
    const mat = new Three.ShaderMaterial({
      ...additive,
      side: Three.DoubleSide,
      vertexShader: GLSL_UV_VERT,
      fragmentShader: GLSL_FLOW_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: C(color) },
        uSpeed: { value: speed },
        uOffset: { value: offset },
        uIntensity: { value: intensity }
      }
    });
    timed.push(mat);
    return mat;
  };

  // Layers carry reveal (story scroll) and emphasis (hero focus) multipliers.
  const layers = {};
  const makeLayer = (name) => {
    const group = new Three.Group();
    world.add(group);
    layers[name] = { group, mats: [], reveal: 1, emphasis: 1, factor: 1 };
    return layers[name];
  };
  const reg = (layer, mat) => {
    layer.mats.push({ mat, base: mat.uniforms?.uIntensity ? mat.uniforms.uIntensity.value : mat.opacity });
    return mat;
  };
  const glassBox = (layer, w, h, d, color, o = {}) => {
    const geometry = new Three.BoxGeometry(w, h, d);
    const mesh = new Three.Mesh(geometry, reg(layer, fresnel(color, o)));
    mesh.add(new Three.LineSegments(new Three.EdgesGeometry(geometry), reg(layer, lineMat(color, o.edge ?? .42))));
    return mesh;
  };
  const footprint = (layer, color, size, opacity, x = 0, z = 0) => {
    const mesh = new Three.Mesh(new Three.PlaneGeometry(size, size), reg(layer, basicMat(color, opacity, glowTexture)));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, FLOOR_Y + .012, z);
    return mesh;
  };
  const circlePoints = (radius, segments = 128) => new Three.EllipseCurve(0, 0, radius, radius)
    .getPoints(segments).map((point) => V(point.x, 0, point.y));

  const base = makeLayer('base');
  const remote = makeLayer('remote');
  const local = makeLayer('local');
  const resources = makeLayer('resources');
  const consoleLayer = makeLayer('console');

  // ---------- floor ----------
  const floor = new Three.Mesh(new Three.PlaneGeometry(14, 14), reg(base, new Three.ShaderMaterial({
    ...additive,
    vertexShader: GLSL_UV_VERT,
    fragmentShader: GLSL_FLOOR_FRAG,
    uniforms: { uColor: { value: C(PALETTE.lime) }, uIntensity: { value: .2 } }
  })));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  const baseRing = new Three.LineLoop(new Three.BufferGeometry().setFromPoints(circlePoints(2.45)), reg(base, lineMat(PALETTE.lime, .26)));
  baseRing.position.y = FLOOR_Y + .015;
  base.group.add(floor, baseRing, footprint(base, PALETTE.lime, 4, .16));

  // ---------- core hub ----------
  const core = new Three.Group();
  core.position.copy(HUB);
  base.group.add(core);
  const shellGeometry = new Three.IcosahedronGeometry(.46, 1);
  const shell = new Three.Mesh(shellGeometry, reg(base, fresnel(PALETTE.lime, { base: .02, intensity: .6 })));
  shell.add(new Three.LineSegments(new Three.EdgesGeometry(shellGeometry), reg(base, lineMat(PALETTE.lime, .3))));
  const halo = new Three.Sprite(reg(base, spriteMat(PALETTE.lime, .3)));
  halo.scale.setScalar(2.1);
  const orbitPivot = new Three.Group();
  orbitPivot.rotation.set(1.32, .2, 0);
  const orbitSpin = new Three.Group();
  orbitSpin.add(new Three.LineLoop(new Three.BufferGeometry().setFromPoints(circlePoints(1.02)), reg(base, lineMat(PALETTE.pale, .3))));
  orbitPivot.add(orbitSpin);
  core.add(shell, halo, orbitPivot);

  // ---------- remote daemons ----------
  const endpoints = [];
  const leds = [];
  [[-2.05, -1.45, 1.35], [-.2, -2.3, 1.7], [1.75, -1.5, 1.2]].forEach(([x, z, h]) => {
    const rack = glassBox(remote, .74, h, .6, PALETTE.lime, { base: .025, top: .1, intensity: .58, edge: .4 });
    rack.position.set(x, FLOOR_Y + h / 2, z);
    const led = new Three.Sprite(reg(remote, spriteMat(PALETTE.lime, .55)));
    led.scale.setScalar(.2);
    led.position.set(x + .26, FLOOR_Y + h - .18, z + .32);
    remote.group.add(rack, led, footprint(remote, PALETTE.lime, 1.7, .22, x, z));
    leds.push({ sprite: led, seed: x * 3.1 + z });
    endpoints.push({ layer: remote, point: V(x, FLOOR_Y + h + .06, z), color: PALETTE.lime });
  });

  // ---------- android local host ----------
  const phone = new Three.Group();
  phone.position.set(2.3, FLOOR_Y + 1.08, .95);
  phone.rotation.set(-.07, -.5, 0);
  local.group.add(phone);
  const phoneBody = glassBox(local, .8, 1.5, .09, PALETTE.warm, { base: .035, intensity: .6, edge: .5 });
  const phoneScreen = new Three.Mesh(new Three.PlaneGeometry(.66, 1.32), reg(local, basicMat(PALETTE.lime, .12)));
  phoneScreen.position.z = .055;
  const phoneGlow = new Three.Sprite(reg(local, spriteMat(PALETTE.warm, .2)));
  phoneGlow.scale.setScalar(2.2);
  phone.add(phoneBody, phoneScreen, phoneGlow);
  const dock = glassBox(local, 1.05, .09, .58, PALETTE.warm, { base: .05, top: .18, intensity: .5 });
  dock.position.set(2.3, FLOOR_Y + .045, .95);
  local.group.add(dock, footprint(local, PALETTE.warm, 2.2, .24, 2.3, .95));
  endpoints.push({ layer: local, point: V(2.26, FLOOR_Y + 1.88, .95), color: PALETTE.warm });

  // ---------- resource blocks ----------
  const cubes = [];
  const cubeCenter = V(-2.4, FLOOR_Y, 1.5);
  [[0, 0, 0, .44], [.5, 0, .1, .36], [.16, .44, 0, .3]].forEach(([dx, dy, dz, size], index) => {
    const cube = glassBox(resources, size, size, size, index === 1 ? PALETTE.warm : PALETTE.lime, { base: .04, top: .18, intensity: .6 });
    const position = V(cubeCenter.x + dx, FLOOR_Y + size / 2 + dy + .04, cubeCenter.z + dz);
    cube.position.copy(position);
    cube.rotation.y = index * .4;
    resources.group.add(cube);
    cubes.push({ mesh: cube, base: position, phase: index * 1.2, floating: dy > 0 });
  });
  resources.group.add(footprint(resources, PALETTE.lime, 2, .2, cubeCenter.x, cubeCenter.z));
  endpoints.push({ layer: resources, point: V(cubeCenter.x + .1, FLOOR_Y + 1.1, cubeCenter.z), color: PALETTE.lime });

  // ---------- console panel ----------
  const panel = new Three.Group();
  panel.position.set(-.5, FLOOR_Y + 1.1, 2.45);
  panel.rotation.y = .48;
  consoleLayer.group.add(panel);
  const panelGeometry = new Three.PlaneGeometry(1.5, .88);
  const panelScreen = new Three.Mesh(panelGeometry, reg(consoleLayer, basicMat(PALETTE.lime, .09)));
  const panelFrame = new Three.LineSegments(new Three.EdgesGeometry(panelGeometry), reg(consoleLayer, lineMat(PALETTE.pale, .34)));
  const panelStem = new Three.Mesh(new Three.PlaneGeometry(.015, .58), reg(consoleLayer, basicMat(PALETTE.lime, .3)));
  panelStem.position.y = -.73;
  panel.add(panelScreen, panelFrame, panelStem);
  consoleLayer.group.add(footprint(consoleLayer, PALETTE.lime, 1.4, .18, -.5, 2.45));
  endpoints.push({ layer: consoleLayer, point: V(-.5, FLOOR_Y + 1.6, 2.45), color: PALETTE.pale });

  // ---------- data arcs ----------
  endpoints.forEach((endpoint, index) => {
    const mid = HUB.clone().lerp(endpoint.point, .5);
    mid.y += .7;
    const curve = new Three.QuadraticBezierCurve3(HUB.clone(), mid, endpoint.point.clone());
    const mat = reg(endpoint.layer, flowMat(endpoint.color, .17 + (index % 2) * .03, index * .25, .8));
    endpoint.layer.group.add(new Three.Mesh(new Three.TubeGeometry(curve, 48, .01, 5, false), mat));
  });

  // ---------- runtime ----------
  const STORY_TARGETS = [V(-.2, 0, -1.2), V(1.3, .1, .6), V(-1.3, 0, 1), V(-.35, .15, 1.5)];
  const state = {
    parent, canvas, renderer, scene, camera,
    progress: isStory ? 0 : .2,
    focus: 'remote',
    pointerX: 0,
    pointerY: 0
  };
  const cam = { radius: isStory ? 12.6 : 12, az: isStory ? .45 : .6, el: .42, target: V(0, .1, 0), px: 0, py: 0 };
  const desired = V();
  let lastTime = performance.now();
  let first = true;
  const damp = (current, goal, lambda, dt) => (reducedMotion || first ? goal : current + (goal - current) * (1 - Math.exp(-lambda * dt)));

  const layerGoals = () => {
    if (isStory) {
      const progress = state.progress;
      const chapter = Math.min(3, Math.floor(progress * 4));
      const reveal = {
        remote: 1,
        local: smoothstep(.16, .3, progress),
        resources: smoothstep(.4, .54, progress),
        console: smoothstep(.64, .78, progress)
      };
      return ['remote', 'local', 'resources', 'console'].reduce((acc, key, index) => {
        acc[key] = { reveal: reveal[key], emphasis: index === chapter ? 1 : .5 };
        return acc;
      }, { base: { reveal: 1, emphasis: 1 } });
    }
    const isLocal = state.focus === 'local';
    return {
      base: { reveal: 1, emphasis: 1 },
      remote: { reveal: 1, emphasis: isLocal ? .5 : 1 },
      local: { reveal: 1, emphasis: isLocal ? 1 : .6 },
      resources: { reveal: 1, emphasis: .65 },
      console: { reveal: 1, emphasis: .65 }
    };
  };

  function render() {
    const now = performance.now();
    const dt = Math.min(.1, (now - lastTime) / 1000);
    lastTime = now;
    const t = reducedMotion ? 2.4 : now * .001;
    timed.forEach((mat) => { mat.uniforms.uTime.value = t; });

    const goals = layerGoals();
    Object.entries(layers).forEach(([name, layer]) => {
      const goal = goals[name];
      layer.reveal = damp(layer.reveal, goal.reveal, 5, dt);
      layer.emphasis = damp(layer.emphasis, goal.emphasis, 4, dt);
      layer.factor = layer.reveal * layer.emphasis;
      layer.group.visible = layer.factor > .01;
      layer.group.position.y = (1 - layer.reveal) * -.55;
      layer.mats.forEach(({ mat, base: value }) => {
        if (mat.uniforms?.uIntensity) mat.uniforms.uIntensity.value = value * layer.factor;
        else mat.opacity = value * layer.factor;
      });
    });

    // Slow ambient motion only.
    shell.rotation.set(t * .08, t * .14, 0);
    orbitSpin.rotation.z = t * .16;
    core.position.y = HUB.y + Math.sin(t * .5) * .035;
    halo.material.opacity *= .8 + .2 * Math.sin(t * .9);
    leds.forEach(({ sprite, seed }) => {
      sprite.material.opacity *= .55 + .45 * (Math.sin(t * 1.1 + seed) > .4 ? 1 : .5);
    });
    cubes.forEach(({ mesh, base: position, phase, floating }) => {
      if (floating) mesh.position.y = position.y + Math.sin(t * .7 + phase) * .035;
      mesh.rotation.y = phase * .4 + t * .05;
    });
    phone.position.y = FLOOR_Y + 1.08 + Math.sin(t * .5) * .025;

    state.pointerX = Math.max(-1, Math.min(1, state.pointerX || 0));
    state.pointerY = Math.max(-1, Math.min(1, state.pointerY || 0));
    cam.px = damp(cam.px, state.pointerX, 2.6, dt);
    cam.py = damp(cam.py, state.pointerY, 2.6, dt);
    let goalRadius;
    let goalAz;
    let goalEl;
    if (isStory) {
      const progress = state.progress;
      const chapter = Math.min(3, Math.floor(progress * 4));
      desired.copy(STORY_TARGETS[chapter]).multiplyScalar(.45);
      goalRadius = 12.8 - progress * .9;
      goalAz = .38 + progress * .5;
      goalEl = .45 - progress * .06;
    } else {
      const isLocal = state.focus === 'local';
      desired.set(isLocal ? .9 : -.1, isLocal ? .2 : .1, isLocal ? .4 : -.15);
      goalRadius = isLocal ? 11.4 : 12;
      goalAz = isLocal ? .74 : .6;
      goalEl = .42;
    }
    cam.target.x = damp(cam.target.x, desired.x, 2, dt);
    cam.target.y = damp(cam.target.y, desired.y, 2, dt);
    cam.target.z = damp(cam.target.z, desired.z, 2, dt);
    cam.radius = damp(cam.radius, goalRadius, 2, dt);
    cam.az = damp(cam.az, goalAz, 2, dt);
    cam.el = damp(cam.el, goalEl, 2, dt);
    const az = cam.az + cam.px * .07;
    const el = Math.max(.2, Math.min(.7, cam.el - cam.py * .035));
    camera.position.set(
      cam.target.x + Math.sin(az) * Math.cos(el) * cam.radius,
      cam.target.y + Math.sin(el) * cam.radius,
      cam.target.z + Math.cos(az) * Math.cos(el) * cam.radius
    );
    camera.lookAt(cam.target);
    first = false;
    renderer.render(scene, camera);
  }

  const resize = () => {
    const width = Math.max(parent.clientWidth, 1);
    const height = Math.max(parent.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = (isStory ? 33 : 30) * (camera.aspect < 1.1 ? 1.22 : 1);
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(parent);

  state.render = render;
  state.dispose = () => {
    observer.disconnect();
    scene.traverse((item) => {
      item.geometry?.dispose();
      const mats = Array.isArray(item.material) ? item.material : item.material ? [item.material] : [];
      mats.forEach((mat) => mat.dispose());
    });
    glowTexture.dispose();
    renderer.dispose();
  };
  resize();
  return state;
}
