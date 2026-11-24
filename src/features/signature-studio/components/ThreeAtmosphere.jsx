import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeAtmosphere({ paused = false }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer;
    let animationFrame = 0;
    let running = false;
    let previousTime = performance.now();
    let elapsed = 0;
    let pointerX = 0;
    let pointerY = 0;
    const geometries = [];
    const materials = [];

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "low-power"
      });
    } catch {
      host.dataset.renderer = "fallback";
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.78;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x060606, 10, 30);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    camera.position.set(0, 0, 12);

    scene.add(new THREE.HemisphereLight(0xe4e4e4, 0x101010, 1.65));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
    keyLight.position.set(-4, 6, 8);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xbdbdbd, 18, 18, 2);
    rimLight.position.set(5, -1, 5);
    scene.add(rimLight);

    const root = new THREE.Group();
    scene.add(root);

    const metal = new THREE.MeshPhysicalMaterial({
      color: 0x777777,
      metalness: 0.78,
      roughness: 0.25,
      clearcoat: 0.95,
      clearcoatRoughness: 0.18
    });
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x292929,
      metalness: 0.84,
      roughness: 0.3
    });
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xb7b7b7,
      metalness: 0.8,
      roughness: 0.22
    });
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x8f8f8f,
      wireframe: true,
      transparent: true,
      opacity: 0.13
    });
    materials.push(metal, darkMetal, ringMaterial, wireMaterial);

    const mainGeometry = new THREE.TorusKnotGeometry(1.58, 0.34, 220, 28, 2, 3);
    geometries.push(mainGeometry);
    const mainShape = new THREE.Mesh(mainGeometry, metal);
    mainShape.rotation.set(0.28, 0.2, -0.18);
    root.add(mainShape);

    const orbitGeometry = new THREE.TorusGeometry(2.7, 0.018, 12, 180);
    geometries.push(orbitGeometry);
    const orbit = new THREE.Mesh(orbitGeometry, ringMaterial);
    orbit.rotation.set(1.05, 0.26, 0.35);
    root.add(orbit);

    const secondOrbitGeometry = new THREE.TorusGeometry(2.18, 0.012, 10, 160);
    geometries.push(secondOrbitGeometry);
    const secondOrbit = new THREE.Mesh(secondOrbitGeometry, darkMetal);
    secondOrbit.rotation.set(0.28, 1.1, -0.5);
    root.add(secondOrbit);

    const shellGeometry = new THREE.IcosahedronGeometry(2.27, 2);
    geometries.push(shellGeometry);
    const shell = new THREE.Mesh(shellGeometry, wireMaterial);
    shell.rotation.set(0.2, 0.4, 0);
    root.add(shell);

    const satelliteGeometry = new THREE.IcosahedronGeometry(0.32, 1);
    geometries.push(satelliteGeometry);
    const satellite = new THREE.Mesh(satelliteGeometry, darkMetal);
    root.add(satellite);

    const satelliteTwoGeometry = new THREE.SphereGeometry(0.14, 20, 14);
    geometries.push(satelliteTwoGeometry);
    const satelliteTwo = new THREE.Mesh(satelliteTwoGeometry, ringMaterial);
    root.add(satelliteTwo);

    const dustCount = window.innerWidth < 720 ? 100 : 210;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i += 1) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 26;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      dustPositions[i * 3 + 2] = -14 + Math.random() * 12;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.022,
      transparent: true,
      opacity: 0.28,
      sizeAttenuation: true,
      depthWrite: false
    });
    geometries.push(dustGeometry);
    materials.push(dustMaterial);
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width < 720 ? 14 : 12;
      camera.updateProjectionMatrix();
      root.position.set(width < 720 ? 0.2 : width < 1060 ? 2.25 : 3.2, width < 720 ? -0.45 : 0.3, -1.6);
      root.scale.setScalar(width < 720 ? 0.78 : 1);
      renderer.render(scene, camera);
    };

    const draw = (delta = 0) => {
      elapsed += delta;
      root.rotation.y = elapsed * 0.105 + pointerX * 0.12;
      root.rotation.x = Math.sin(elapsed * 0.22) * 0.13 + pointerY * 0.055;
      root.rotation.z = Math.sin(elapsed * 0.12) * 0.045;
      satellite.position.set(Math.cos(elapsed * 0.38) * 3.05, Math.sin(elapsed * 0.38) * 1.28, Math.sin(elapsed * 0.28));
      satelliteTwo.position.set(Math.cos(elapsed * -0.29 + 1.3) * 2.55, Math.sin(elapsed * -0.29 + 1.3) * 2.05, -0.6);
      satellite.rotation.x = elapsed * 0.24;
      satellite.rotation.y = elapsed * 0.31;
      dust.rotation.y = elapsed * 0.006;
      renderer.render(scene, camera);
    };

    const animate = (now) => {
      if (!running) return;
      const delta = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      draw(delta);
      animationFrame = window.requestAnimationFrame(animate);
    };

    const start = () => {
      if (running || paused || reducedMotion || document.hidden) return;
      running = true;
      previousTime = performance.now();
      animationFrame = window.requestAnimationFrame(animate);
    };
    const stop = () => {
      running = false;
      window.cancelAnimationFrame(animationFrame);
      if (renderer) draw(0);
    };
    const pointerMove = (event) => {
      pointerX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      pointerY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };
    const visibilityChange = () => {
      if (document.hidden) stop();
      else if (paused || reducedMotion) draw(0);
      else start();
    };
    const contextLost = (event) => {
      event.preventDefault();
      stop();
      host.dataset.renderer = "fallback";
    };
    const contextRestored = () => {
      host.dataset.renderer = "ready";
      resize();
      if (!paused && !reducedMotion) start();
    };

    const observer = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
    observer?.observe(host);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", pointerMove, { passive: true });
    document.addEventListener("visibilitychange", visibilityChange);
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", contextRestored);
    host.dataset.renderer = "ready";
    resize();
    draw(0);
    if (!paused && !reducedMotion) start();

    return () => {
      stop();
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", pointerMove);
      document.removeEventListener("visibilitychange", visibilityChange);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      delete host.dataset.renderer;
    };
  }, [paused]);

  return <div className="three-atmosphere" ref={hostRef} aria-hidden="true"><canvas ref={canvasRef} /></div>;
}
