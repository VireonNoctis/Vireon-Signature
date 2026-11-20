import { useEffect, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uTime;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += noise(p) * amplitude;
      p = p * 2.03 + vec2(17.7, 9.2);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(1.0, uResolution.y);
    vec2 p = vec2(uv.x * aspect, uv.y);
    p += uPointer * vec2(0.026, 0.018);

    float t = uTime;
    float cloudA = fbm(p * vec2(1.7, 1.35) + vec2(t * 0.018, -t * 0.026));
    float cloudB = fbm(p * vec2(3.2, 2.4) + vec2(-t * 0.03, t * 0.012));
    float cloudC = fbm(p * vec2(6.8, 4.1) + vec2(t * 0.01, t * 0.018));
    float field = cloudA * 0.55 + cloudB * 0.33 + cloudC * 0.12;

    vec3 color = mix(vec3(0.035, 0.049, 0.063), vec3(0.006, 0.011, 0.019), smoothstep(0.22, 0.96, uv.y));
    float horizon = exp(-pow((uv.y - (0.44 + (cloudA - 0.5) * 0.12)) / 0.19, 2.0));
    float upperMist = exp(-pow((uv.y - (0.67 + (cloudB - 0.5) * 0.11)) / 0.24, 2.0));
    float fog = smoothstep(0.42, 0.76, field);
    color = mix(color, vec3(0.31, 0.38, 0.42), horizon * fog * 0.72);
    color = mix(color, vec3(0.16, 0.23, 0.28), upperMist * smoothstep(0.45, 0.78, cloudA) * 0.38);

    float glowLeft = exp(-length((uv - vec2(0.08, 0.76)) * vec2(1.0, 1.35)) * 4.2);
    float glowRight = exp(-length((uv - vec2(0.93, 0.53)) * vec2(1.05, 1.5)) * 4.1);
    color += vec3(0.39, 0.49, 0.54) * glowLeft * 0.44;
    color += vec3(0.18, 0.28, 0.34) * glowRight * 0.38;

    float farNoise = fbm(vec2(p.x * 2.4 + 4.0, 3.5));
    float nearNoise = fbm(vec2(p.x * 4.1 + 11.0, 7.2));
    float farRidge = 0.20 + sin(p.x * 1.48 + 1.1) * 0.055 + sin(p.x * 3.9) * 0.025 + (farNoise - 0.5) * 0.06;
    float nearRidge = 0.105 + sin(p.x * 2.3 + 2.2) * 0.045 + sin(p.x * 6.0 + 0.7) * 0.025 + (nearNoise - 0.5) * 0.05;
    float farShape = 1.0 - smoothstep(farRidge - 0.012, farRidge + 0.014, uv.y);
    float nearShape = 1.0 - smoothstep(nearRidge - 0.008, nearRidge + 0.012, uv.y);
    color = mix(color, vec3(0.031, 0.043, 0.052), farShape * 0.88);
    color = mix(color, vec3(0.008, 0.012, 0.018), nearShape);

    float waterLine = exp(-pow((uv.y - 0.31) / 0.12, 2.0));
    float ripple = sin((uv.x * 78.0) + (uv.y * 29.0) + t * 0.45) * 0.5 + 0.5;
    color += vec3(0.07, 0.10, 0.12) * waterLine * ripple * (1.0 - nearShape) * 0.1;

    float vignette = 1.0 - smoothstep(0.55, 1.3, length(vec2((uv.x - 0.5) * aspect, (uv.y - 0.51) * 1.08)));
    color *= 0.78 + vignette * 0.22;
    color += (hash(gl_FragCoord.xy) - 0.5) * 0.012;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

export default function ThreeAtmosphere({ paused = false }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer;
    let geometry;
    let material;
    let animationFrame = 0;
    let running = false;
    let elapsed = 0;
    let lastTime = performance.now();
    let pointerX = 0;
    let pointerY = 0;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: false,
        powerPreference: "low-power"
      });
    } catch {
      host.dataset.renderer = "fallback";
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uTime: { value: 0 }
      },
      depthWrite: false,
      depthTest: false
    });
    geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));

    const draw = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      renderer.setSize(width, height, false);
      material.uniforms.uResolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
      material.uniforms.uPointer.value.set(pointerX, pointerY);
      material.uniforms.uTime.value = elapsed;
      renderer.render(scene, camera);
    };

    const animate = (now) => {
      if (!running) return;
      if (now - lastTime >= 32) {
        elapsed += Math.min((now - lastTime) / 1000, 0.06);
        lastTime = now;
        draw();
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    const start = () => {
      if (running || paused || reducedMotion || document.hidden) return;
      running = true;
      lastTime = performance.now();
      animationFrame = window.requestAnimationFrame(animate);
    };
    const stop = () => {
      running = false;
      window.cancelAnimationFrame(animationFrame);
      draw();
    };
    const resize = () => draw();
    const pointerMove = (event) => {
      const rect = host.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      pointerY = (0.5 - (event.clientY - rect.top) / Math.max(1, rect.height)) * 2;
      if (paused || reducedMotion) draw();
    };
    const visibility = () => {
      if (document.hidden) stop();
      else if (paused || reducedMotion) draw();
      else start();
    };
    const contextLost = (event) => {
      event.preventDefault();
      stop();
      host.dataset.renderer = "fallback";
    };

    const observer = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
    observer?.observe(host);
    window.addEventListener("resize", resize, { passive: true });
    host.addEventListener("pointermove", pointerMove, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    canvas.addEventListener("webglcontextlost", contextLost);
    host.dataset.renderer = "ready";
    draw();
    if (!paused && !reducedMotion) start();

    return () => {
      stop();
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      host.removeEventListener("pointermove", pointerMove);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", contextLost);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      delete host.dataset.renderer;
    };
  }, [paused]);

  return <div className="three-atmosphere" ref={hostRef} aria-hidden="true"><canvas ref={canvasRef} /></div>;
}
