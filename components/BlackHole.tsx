import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UIState } from '../types';

interface BlackHoleProps {
  state: UIState;
}

// --- SHADERS ---

const LENSING_SHADER = {
    uniforms: {
        "tDiffuse": { value: null },
        "blackHoleScreenPos": { value: new THREE.Vector2(0.5, 0.5) },
        "lensingStrength": { value: 0.12 }, 
        "lensingRadius": { value: 0.3 },
        "aspectRatio": { value: 1.0 },
        "chromaticAberration": { value: 0.015 }, 
        "scanlineIntensity": { value: 0.15 },
        "vignetteDarkness": { value: 0.8 }
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
        uniform sampler2D tDiffuse; uniform vec2 blackHoleScreenPos; uniform float lensingStrength;
        uniform float lensingRadius; uniform float aspectRatio; uniform float chromaticAberration;
        uniform float scanlineIntensity; uniform float vignetteDarkness; varying vec2 vUv;
        void main() {
            vec2 screenPos = vUv; vec2 toCenter = screenPos - blackHoleScreenPos;
            toCenter.x *= aspectRatio; float dist = length(toCenter);
            float distortionAmount = lensingStrength / (dist * dist + 0.003);
            distortionAmount = clamp(distortionAmount, 0.0, 0.7);
            float falloff = smoothstep(lensingRadius, lensingRadius * 0.3, dist);
            distortionAmount *= falloff; vec2 offset = normalize(toCenter) * distortionAmount;
            offset.x /= aspectRatio; 
            
            // Subtle Chromatic Aberration
            vec2 distortedUvR = screenPos - offset * (1.0 + chromaticAberration);
            vec2 distortedUvG = screenPos - offset; 
            vec2 distortedUvB = screenPos - offset * (1.0 - chromaticAberration);
            
            float r = texture2D(tDiffuse, distortedUvR).r; 
            float g = texture2D(tDiffuse, distortedUvG).g;
            float b = texture2D(tDiffuse, distortedUvB).b; 
            vec3 finalColor = vec3(r, g, b);
            
            // Subtle Scanlines (Reduced intensity)
            float scanline = sin(vUv.y * 1200.0) * 0.5 + 0.5;
            finalColor.rgb -= scanline * (scanlineIntensity * 0.5) * finalColor.rgb;
            
            // Vignette
            float vignette = length(vUv - vec2(0.5)); 
            finalColor *= (1.0 - vignette * vignetteDarkness);
            
            gl_FragColor = vec4(finalColor, 1.0);
        }`
};

const GLITCH_SHADER = {
    uniforms: {
        'tDiffuse': { value: null },
        'uIntensity': { value: 0.0 },
        'uTime': { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uIntensity;
        uniform float uTime;
        varying vec2 vUv;

        float random(vec2 p) {
            return fract(sin(dot(p.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
            vec2 uv = vUv;
            vec3 finalColor;

            // RGB Split Glitch (Subtle)
            float r_offset = (random(uv + uTime * 0.4) - 0.5) * 0.02 * uIntensity;
            float g_offset = (random(uv + uTime * 0.6) - 0.5) * 0.02 * uIntensity;

            vec2 uvR = uv + vec2(r_offset, 0.0);
            vec2 uvG = uv + vec2(g_offset, 0.0);
            vec2 uvB = uv;

            float r = texture2D(tDiffuse, uvR).r;
            float g = texture2D(tDiffuse, uvG).g;
            float b = texture2D(tDiffuse, uvB).b;
            
            finalColor = vec3(r, g, b);

            // Horizontal Line Glitch
            float line_y = floor(uv.y * 50.0 + uTime * 20.0);
            float line_shift = (random(vec2(line_y, uTime)) - 0.5) * 0.05 * uIntensity;

            if (random(vec2(line_y, uTime * 2.0)) > 0.98 - (uIntensity * 0.1)) {
                finalColor = texture2D(tDiffuse, vec2(uv.x + line_shift, uv.y)).rgb;
            }

            vec3 originalColor = texture2D(tDiffuse, vUv).rgb;
            gl_FragColor = vec4(mix(originalColor, finalColor, uIntensity), 1.0);
        }`
};

const DISK_VERTEX = `
varying vec2 vUv; varying float vRadius; varying float vAngle;
void main() {
    vUv = uv; vRadius = length(position.xy); vAngle = atan(position.y, position.x);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const DISK_FRAGMENT = `
uniform float uTime; uniform vec3 uColorHot; uniform vec3 uColorMid1; uniform vec3 uColorMid2; uniform vec3 uColorOuter;
uniform float uNoiseScale; uniform float uFlowSpeed; uniform float uDensity;
varying vec2 vUv; varying float vRadius; varying float vAngle;

// Simplex Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy;
    i = mod289(i); vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx; vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_); vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y); vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0; vec4 s1 = floor(b1) * 2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m; return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
    float normalizedRadius = smoothstep(1.50, 7.00, vRadius);
    float timeOffset = uTime * uFlowSpeed * (2.0 / (vRadius * 0.3 + 1.0));
    vec2 noiseUv = vec2(vAngle * 2.0 + timeOffset, vRadius * 0.4);
    
    // Smoother noise settings
    float noiseVal1 = snoise(vec3(noiseUv * uNoiseScale, uTime * 0.1));
    float noiseVal2 = snoise(vec3(noiseUv * uNoiseScale * 1.5 + 0.8, uTime * 0.15));
    float noiseVal = (noiseVal1 * 0.6 + noiseVal2 * 0.4); 
    noiseVal = (noiseVal + 1.0) * 0.5;

    // Color mixing based on radius and noise
    vec3 color = mix(uColorOuter, uColorMid2, smoothstep(0.0, 0.4, normalizedRadius));
    color = mix(color, uColorMid1, smoothstep(0.3, 0.7, normalizedRadius));
    color = mix(color, uColorHot, smoothstep(0.65, 0.95, normalizedRadius));

    // Brightness concentration near center
    float brightness = pow(1.0 - normalizedRadius, 1.5) * 3.0 + 0.2;
    brightness *= (0.5 + noiseVal * 1.5);

    // Grid effect - reduced intensity for cleaner look
    float radialGrid = 1.0 - (sin(vRadius * 3.0 - uTime * 0.2) * 0.5 + 0.5);
    radialGrid = pow(radialGrid, 4.0); 
    float angleGrid = 1.0 - (sin(vAngle * 20.0) * 0.5 + 0.5);
    angleGrid = pow(angleGrid, 4.0); 
    float grid = 1.0 - clamp(radialGrid + angleGrid, 0.0, 1.0);
    
    brightness *= (0.8 + grid * 0.4); 
    
    // Alpha falloff
    float alpha = uDensity * (0.2 + noiseVal * 0.9);
    alpha *= smoothstep(0.0, 0.15, normalizedRadius); 
    alpha *= (1.0 - smoothstep(0.85, 1.0, normalizedRadius));
    alpha = clamp(alpha, 0.0, 1.0); 
    
    gl_FragColor = vec4(color * brightness, alpha);
}`;

const BlackHole: React.FC<BlackHoleProps> = ({ state }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Refs to access objects inside the animation loop without re-triggering effects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const diskMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const glitchPassRef = useRef<ShaderPass | null>(null);
  const pulseRef = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    // Darker fog for deep space feel
    scene.fog = new THREE.FogExp2(0x000000, 0.02);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 4000);
    camera.position.set(-6.5, 3.0, 6.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mountRef.current.appendChild(renderer.domElement);

    // 2. Post Processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, 0.4, 0.85 // Strength, Radius, Threshold - Higher threshold = cleaner look
    );
    composer.addPass(bloomPass);

    const lensingPass = new ShaderPass(LENSING_SHADER);
    composer.addPass(lensingPass);

    const glitchPass = new ShaderPass(GLITCH_SHADER);
    glitchPass.enabled = false;
    composer.addPass(glitchPass);
    glitchPassRef.current = glitchPass;

    // 3. Objects
    
    // Stars - Reduced count for cleaner UI
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 4000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    const starTwinkle = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        const radius = Math.cbrt(Math.random()) * 2000 + 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[i3+1] = radius * Math.sin(phi) * Math.sin(theta);
        starPositions[i3+2] = radius * Math.cos(phi);

        // Cooler star colors
        const color = new THREE.Color().setHSL(0.6 + Math.random() * 0.2, 0.5, 0.7);
        starColors[i3] = color.r; starColors[i3+1] = color.g; starColors[i3+2] = color.b;
        
        starSizes[i] = Math.random() * 1.5;
        starTwinkle[i] = Math.random() * Math.PI * 2;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    starGeometry.setAttribute('twinkle', new THREE.BufferAttribute(starTwinkle, 1));

    const starMaterial = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: renderer.getPixelRatio() } },
        vertexShader: `
            uniform float uTime; uniform float uPixelRatio; attribute float size; attribute float twinkle; varying vec3 vColor; varying float vTwinkle;
            void main() {
                vColor = color; vTwinkle = sin(uTime * 1.5 + twinkle) * 0.5 + 0.5;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }`,
        fragmentShader: `
            varying vec3 vColor; varying float vTwinkle;
            void main() {
                float dist = distance(gl_PointCoord, vec2(0.5));
                if (dist > 0.5) discard;
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= (0.2 + vTwinkle * 0.8);
                gl_FragColor = vec4(vColor, alpha);
            }`,
        transparent: true, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Black Hole & Event Horizon
    const BLACK_HOLE_RADIUS = 1.3;
    const blackHoleMesh = new THREE.Mesh(
        new THREE.SphereGeometry(BLACK_HOLE_RADIUS, 64, 64),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    scene.add(blackHoleMesh);

    const eventHorizonMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uCameraPosition: { value: camera.position }, uColor: { value: new THREE.Color(0x00ffcc) } },
        vertexShader: `
            varying vec3 vNormal; varying vec3 vPosition;
            void main() { vNormal = normalize(normalMatrix * normal); vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
            uniform float uTime; uniform vec3 uCameraPosition; uniform vec3 uColor;
            varying vec3 vNormal; varying vec3 vPosition;
            void main() {
                vec3 viewDirection = normalize(uCameraPosition - vPosition);
                float fresnel = 1.0 - abs(dot(vNormal, viewDirection));
                fresnel = pow(fresnel, 3.0);
                gl_FragColor = vec4(uColor * fresnel * 2.0, fresnel);
            }`,
        transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide
    });
    const eventHorizon = new THREE.Mesh(new THREE.SphereGeometry(BLACK_HOLE_RADIUS * 1.02, 64, 64), eventHorizonMat);
    scene.add(eventHorizon);

    // Accretion Disk
    const diskGeometry = new THREE.RingGeometry(BLACK_HOLE_RADIUS + 0.2, 8.0, 256, 64);
    const diskMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uColorHot: { value: new THREE.Color(0xffffff) },
            uColorMid1: { value: new THREE.Color(0xff00ff) },
            uColorMid2: { value: new THREE.Color(0x00ffff) },
            uColorOuter: { value: new THREE.Color(0x3939f5) },
            uNoiseScale: { value: 2.0 }, // Smoother noise
            uFlowSpeed: { value: 0.25 },
            uDensity: { value: 1.5 }
        },
        vertexShader: DISK_VERTEX,
        fragmentShader: DISK_FRAGMENT,
        transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
    accretionDisk.rotation.x = Math.PI / 3.0;
    scene.add(accretionDisk);
    diskMatRef.current = diskMaterial;

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // 5. Animation Loop
    const clock = new THREE.Clock();
    const blackHoleScreenPosVec3 = new THREE.Vector3();
    let animationId: number;

    // State Interpolation Variables
    const targetColors = {
        hot: new THREE.Color(), mid1: new THREE.Color(), mid2: new THREE.Color(), outer: new THREE.Color()
    };
    let targetSpeed = 0.25;
    let targetGlitch = 0.0;
    let currentGlitch = 0.0;

    const animate = () => {
        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();

        // --- UPDATE UNIFORMS ---
        diskMaterial.uniforms.uTime.value = elapsed;
        starMaterial.uniforms.uTime.value = elapsed;
        eventHorizonMat.uniforms.uTime.value = elapsed;
        eventHorizonMat.uniforms.uCameraPosition.value.copy(camera.position);

        if (glitchPassRef.current && glitchPassRef.current.enabled) {
            glitchPassRef.current.uniforms.uTime.value = elapsed;
        }

        // --- LENSING UPDATE ---
        blackHoleScreenPosVec3.copy(blackHoleMesh.position).project(camera);
        lensingPass.uniforms.blackHoleScreenPos.value.set(
            (blackHoleScreenPosVec3.x + 1) / 2,
            (blackHoleScreenPosVec3.y + 1) / 2
        );
        lensingPass.uniforms.aspectRatio.value = window.innerWidth / window.innerHeight;

        // --- STATE REACTIVITY LOGIC ---
        
        // 1. Lerp Glitch Intensity
        currentGlitch += (targetGlitch - currentGlitch) * delta * 5.0;
        if (glitchPassRef.current) {
            glitchPassRef.current.uniforms.uIntensity.value = currentGlitch;
        }

        // 2. Lerp Flow Speed
        diskMaterial.uniforms.uFlowSpeed.value += (targetSpeed - diskMaterial.uniforms.uFlowSpeed.value) * delta * 2.0;

        // 3. Lerp Colors
        diskMaterial.uniforms.uColorHot.value.lerp(targetColors.hot, delta * 2.0);
        diskMaterial.uniforms.uColorMid1.value.lerp(targetColors.mid1, delta * 2.0);
        diskMaterial.uniforms.uColorMid2.value.lerp(targetColors.mid2, delta * 2.0);
        diskMaterial.uniforms.uColorOuter.value.lerp(targetColors.outer, delta * 2.0);

        // 4. Pulse Effect (Speaking) - Organic sine wave
        if (pulseRef.current > 0) {
            const pulse = Math.sin(elapsed * 6.0) * 0.1 + 1.0;
            const intensity = pulseRef.current; // Amplitude
            blackHoleMesh.scale.setScalar(1.0 + (pulse - 1.0) * intensity);
            eventHorizon.scale.setScalar(1.02 + (pulse - 1.0) * intensity);
        } else {
            // Return to base size smoothly
            blackHoleMesh.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 5);
            eventHorizon.scale.lerp(new THREE.Vector3(1.02, 1.02, 1.02), delta * 5);
        }

        // Rotate Geometry
        accretionDisk.rotation.z += delta * 0.1 * diskMaterial.uniforms.uFlowSpeed.value * 4.0;
        stars.rotation.y += delta * 0.02;

        controls.update();
        composer.render();
        animationId = requestAnimationFrame(animate);
    };

    // Helper to update targets based on props
    const updateStateTargets = (s: UIState) => {
        switch (s) {
            case UIState.LISTENING:
                // CYAN - Bright, Alert, Fast Spin
                targetColors.hot.set(0xccffff); 
                targetColors.mid1.set(0x00d2ff); 
                targetColors.mid2.set(0x0044ff); 
                targetColors.outer.set(0x000033); 
                targetSpeed = 0.8;
                targetGlitch = 0.0;
                pulseRef.current = 0.2; // Slight breath
                controls.autoRotateSpeed = 2.0;
                if (glitchPassRef.current) glitchPassRef.current.enabled = false;
                break;

            case UIState.SPEAKING:
                // ORANGE - ElevenLabs Brand, Organic Pulse
                targetColors.hot.set(0xffeedd); 
                targetColors.mid1.set(0xff7832); 
                targetColors.mid2.set(0xff3300); 
                targetColors.outer.set(0x331100); 
                targetSpeed = 0.3;
                targetGlitch = 0.0;
                pulseRef.current = 0.8; // Strong pulse
                controls.autoRotateSpeed = 0.5;
                if (glitchPassRef.current) glitchPassRef.current.enabled = false;
                break;

            case UIState.ANALYZING:
            case UIState.THINKING:
                // PURPLE - Computing, Subtle Glitch
                targetColors.hot.set(0xffddff);
                targetColors.mid1.set(0xd400ff); 
                targetColors.mid2.set(0x6600cc);
                targetColors.outer.set(0x110022);
                targetSpeed = 0.1;
                targetGlitch = 0.3; // Subtle glitch
                pulseRef.current = 0;
                controls.autoRotateSpeed = 0.2;
                if (glitchPassRef.current) glitchPassRef.current.enabled = true;
                break;

            case UIState.IDLE:
            default:
                // DIM BLUE - Dormant, "Waiting"
                targetColors.hot.set(0x333333); 
                targetColors.mid1.set(0x4444ff); 
                targetColors.mid2.set(0x000033); 
                targetColors.outer.set(0x000000); 
                targetSpeed = 0.1;
                targetGlitch = 0.0;
                pulseRef.current = 0;
                controls.autoRotateSpeed = 0.5;
                if (glitchPassRef.current) glitchPassRef.current.enabled = false;
                break;
        }
    };

    // Initialize Targets
    updateStateTargets(state);

    // Start Loop
    animate();

    // Resize Handler
    const handleResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        composer.setSize(width, height);
        bloomPass.resolution.set(width, height);
        if (lensingPass) lensingPass.uniforms.aspectRatio.value = width / height;
    };
    window.addEventListener('resize', handleResize);

    // Save update function to ref for useEffect usage
    (mountRef.current as any).updateState = updateStateTargets;

    // Cleanup
    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationId);
        if (mountRef.current) {
            mountRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
    };
  }, []); // Run once on mount

  // React to state changes by updating target values (avoiding full re-render of scene)
  useEffect(() => {
    if (mountRef.current && (mountRef.current as any).updateState) {
        (mountRef.current as any).updateState(state);
    }
  }, [state]);

  return <div ref={mountRef} className="absolute inset-0 z-0 bg-black" />;
};

export default BlackHole;