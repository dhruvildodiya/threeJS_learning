// import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


// const canvas = document.querySelector('#webgl-canvas');

// const scene = new THREE.Scene()
// scene.background = new THREE.Color(0x0a0c14)

// const geometry = new THREE.SphereGeometry(2);

// const material = new THREE.MeshBasicMaterial({color: 0x6366f1 , wireframe:true})

// const sphere = new THREE.Mesh(geometry , material)
// scene.add(sphere)
// // Fix: define sizes first
// const sizes = {
//   width: window.innerWidth,
//   height: window.innerHeight
// };

// const camera = new THREE.PerspectiveCamera(
//     60, // FOV
//   sizes.width / sizes.height, // Aspect Ratio
//   0.1, // Near
//   100 // Far
// )
// scene.add(camera)
// camera.position.z = 6;

// const renderer = new THREE.WebGLRenderer({canvas})
// renderer.setSize(sizes.width, sizes.height)

// const controls = new OrbitControls(camera,canvas)

// const animate = ()=>{
//     controls.update()
//     renderer.render(scene,camera)
//     window.requestAnimationFrame(animate)
// }
// animate();





import * as THREE from 'three';

// 1. Canvas & Sizes
const canvas = document.querySelector('#webgl-canvas');
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

// 2. Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c14);

// 3. Object (Sphere)
const geometry = new THREE.SphereGeometry(2, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0x6366f1 , wireframe: true});
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// 4. Camera
const camera = new THREE.PerspectiveCamera(
  60,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.z = 6; // Move camera back so the sphere is visible
scene.add(camera);

// 5. Renderer
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
// renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 6. Render
renderer.render(scene, camera);
