import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// 1. RENDERER, SCENE & CAMERA (OPTIMIZED FOR 60 FPS)
// ---------------------------------------------------------------------------
const canvas = document.querySelector('#webgl-canvas');

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Balanced for crisp visuals & high FPS
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // Fast PCF shadows

// Atmospheric Night/Dusk Scene & Fog
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080c16);
scene.fog = new THREE.FogExp2(0x080c16, 0.025);

// Perspective Camera
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    150
);
camera.position.set(13, 8.5, 14);

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.02;
controls.minDistance = 4;
controls.maxDistance = 50;
controls.target.set(0, 2.5, 0);

// ---------------------------------------------------------------------------
// 2. TEXTURE LOADER & PBR MATERIALS
// ---------------------------------------------------------------------------
const textureLoader = new THREE.TextureLoader();

function setupTexture(tex, repeatX = 1, repeatY = 1, isSRGB = false) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// A. Building Facade PBR Material
const buildingColor = setupTexture(textureLoader.load('./textures/building/others_0027_color_2k.jpg'), 1, 1, true);
const buildingNormal = setupTexture(textureLoader.load('./textures/building/others_0027_normal_opengl_2k.png'), 1, 1);
const buildingRoughness = setupTexture(textureLoader.load('./textures/building/others_0027_roughness_2k.jpg'), 1, 1);
const buildingAO = setupTexture(textureLoader.load('./textures/building/others_0027_ao_2k.jpg'), 1, 1);
const buildingEmissive = setupTexture(textureLoader.load('./textures/building/others_0027_emissive_2k.jpg'), 1, 1, true);

const buildingSideMaterial = new THREE.MeshStandardMaterial({
    map: buildingColor,
    normalMap: buildingNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughnessMap: buildingRoughness,
    roughness: 0.75,
    metalness: 0.15,
    aoMap: buildingAO,
    aoMapIntensity: 1.1,
    emissiveMap: buildingEmissive,
    emissive: new THREE.Color(0xffeedd),
    emissiveIntensity: 1.2
});

const roofCapMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.1
});

const buildingBoxMaterials = [
    buildingSideMaterial,
    buildingSideMaterial,
    roofCapMaterial,
    roofCapMaterial,
    buildingSideMaterial,
    buildingSideMaterial
];

// B. Central Road PBR Material
const roadRepeatY = 8;
const roadColor = setupTexture(textureLoader.load('./textures/road/road_color.jpg'), 1, roadRepeatY, true);
const roadNormal = setupTexture(textureLoader.load('./textures/road/road_normal_opengl.png'), 1, roadRepeatY);
const roadRoughness = setupTexture(textureLoader.load('./textures/road/road_roughness.jpg'), 1, roadRepeatY);
const roadAO = setupTexture(textureLoader.load('./textures/road/road_ao.jpg'), 1, roadRepeatY);

const roadMaterial = new THREE.MeshStandardMaterial({
    map: roadColor,
    normalMap: roadNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughnessMap: roadRoughness,
    roughness: 0.85,
    aoMap: roadAO,
    aoMapIntensity: 1.0,
    metalness: 0.05
});

// C. Sidewalk Pavement PBR Material
const sidewalkRepeatX = 3;
const sidewalkRepeatY = 16;
const sidewalkColor = setupTexture(textureLoader.load('./textures/ground_terrain/ground_0040_color_2k.jpg'), sidewalkRepeatX, sidewalkRepeatY, true);
const sidewalkNormal = setupTexture(textureLoader.load('./textures/ground_terrain/ground_0040_normal_opengl_2k.png'), sidewalkRepeatX, sidewalkRepeatY);
const sidewalkRoughness = setupTexture(textureLoader.load('./textures/ground_terrain/ground_0040_roughness_2k.jpg'), sidewalkRepeatX, sidewalkRepeatY);
const sidewalkAO = setupTexture(textureLoader.load('./textures/ground_terrain/ground_0040_ao_2k.jpg'), sidewalkRepeatX, sidewalkRepeatY);

const sidewalkMaterial = new THREE.MeshStandardMaterial({
    map: sidewalkColor,
    normalMap: sidewalkNormal,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: sidewalkRoughness,
    roughness: 0.85,
    aoMap: sidewalkAO,
    aoMapIntensity: 1.1,
    metalness: 0.05
});

// D. Concrete Walkway PBR Material
const concreteColor = setupTexture(textureLoader.load('./textures/concrete/concrete_0031_color_2k.jpg'), 1.5, 3, true);
const concreteNormal = setupTexture(textureLoader.load('./textures/concrete/concrete_0031_normal_opengl_2k.png'), 1.5, 3);
const concreteRoughness = setupTexture(textureLoader.load('./textures/concrete/concrete_0031_roughness_2k.jpg'), 1.5, 3);
const concreteAO = setupTexture(textureLoader.load('./textures/concrete/concrete_0031_ao_2k.jpg'), 1.5, 3);

const concreteWalkwayMat = new THREE.MeshStandardMaterial({
    map: concreteColor,
    normalMap: concreteNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughnessMap: concreteRoughness,
    roughness: 0.85,
    aoMap: concreteAO,
    aoMapIntensity: 1.0,
    metalness: 0.05
});

// E. Entrance Door Full PBR Material
const doorColor = setupTexture(textureLoader.load('./textures/door/door_color.jpg'), 1, 1, true);
const doorNormal = setupTexture(textureLoader.load('./textures/door/door_normal_opengl.png'), 1, 1);
const doorRoughness = setupTexture(textureLoader.load('./textures/door/door_roughness.jpg'), 1, 1);
const doorAO = setupTexture(textureLoader.load('./textures/door/door_ao.jpg'), 1, 1);

const doorMaterial = new THREE.MeshStandardMaterial({
    map: doorColor,
    normalMap: doorNormal,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: doorRoughness,
    roughness: 0.65,
    metalness: 0.15,
    aoMap: doorAO,
    aoMapIntensity: 1.1,
    emissiveMap: doorColor,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.25
});

// Reusable static materials
const curbMaterial = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8, metalness: 0.1 });
const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35, metalness: 0.7 });
const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
const strutMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
const antennaMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 });
const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
const canopyBulbMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });

// ---------------------------------------------------------------------------
// 3. LIGHTING RIG (HIGH PERFORMANCE: SINGLE SHADOW PASS + RADIANT FILLS)
// ---------------------------------------------------------------------------
// Ambient Fill Light
const ambientLight = new THREE.AmbientLight(0x2d3748, 0.6);
scene.add(ambientLight);

// Directional Moonlight (Sole shadow caster - fast 1024x1024 map)
const moonLight = new THREE.DirectionalLight(0xdbeafe, 1.5);
moonLight.position.set(16, 22, 14);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 1024;
moonLight.shadow.mapSize.height = 1024;
moonLight.shadow.camera.near = 1;
moonLight.shadow.camera.far = 60;
moonLight.shadow.camera.left = -22;
moonLight.shadow.camera.right = 22;
moonLight.shadow.camera.top = 22;
moonLight.shadow.camera.bottom = -22;
moonLight.shadow.bias = -0.0002;
scene.add(moonLight);

// ---------------------------------------------------------------------------
// 4. ENVIRONMENT: ROADWAY, SIDEWALKS & SURROUNDINGS
// ---------------------------------------------------------------------------
const roadWidth = 5.6;
const roadLength = 48.0;
const sidewalkWidth = 4.2;
const curbDepth = 0.15;
const curbHeight = 0.08;

// Central Road
const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
const roadMesh = new THREE.Mesh(roadGeo, roadMaterial);
roadMesh.rotation.x = -Math.PI / 2;
roadMesh.position.set(0, 0.01, 0);
roadMesh.receiveShadow = true;
scene.add(roadMesh);

// Curbs
const curbGeo = new THREE.BoxGeometry(curbDepth, curbHeight, roadLength);
const leftCurb = new THREE.Mesh(curbGeo, curbMaterial);
leftCurb.position.set(-roadWidth / 2 - curbDepth / 2, curbHeight / 2, 0);
leftCurb.receiveShadow = true;
scene.add(leftCurb);

const rightCurb = new THREE.Mesh(curbGeo, curbMaterial);
rightCurb.position.set(roadWidth / 2 + curbDepth / 2, curbHeight / 2, 0);
rightCurb.receiveShadow = true;
scene.add(rightCurb);

// Sidewalks
const sidewalkGeo = new THREE.BoxGeometry(sidewalkWidth, curbHeight, roadLength);
const leftSidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMaterial);
leftSidewalk.position.set(-roadWidth / 2 - curbDepth - sidewalkWidth / 2, curbHeight / 2, 0);
leftSidewalk.receiveShadow = true;
scene.add(leftSidewalk);

const rightSidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMaterial);
rightSidewalk.position.set(roadWidth / 2 + curbDepth + sidewalkWidth / 2, curbHeight / 2, 0);
rightSidewalk.receiveShadow = true;
scene.add(rightSidewalk);

// Infinite Ground
const outerGround = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x050811, roughness: 0.95, metalness: 0.05 })
);
outerGround.rotation.x = -Math.PI / 2;
outerGround.position.y = -0.05;
outerGround.receiveShadow = true;
scene.add(outerGround);

// ---------------------------------------------------------------------------
// 5. MODULAR BUILDINGS
// ---------------------------------------------------------------------------
const beacons = [];

function createBuilding({
    x,
    z,
    width = 3.2,
    height = 5.0,
    depth = 3.2,
    rotationY = 0,
    hasPenthouse = true,
    hasAntenna = true
}) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotationY;

    // Main Tower
    const mainGeo = new THREE.BoxGeometry(width, height, depth);
    const mainMesh = new THREE.Mesh(mainGeo, buildingBoxMaterials);
    mainMesh.position.y = height / 2 + curbHeight;
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);

    let currentTop = height + curbHeight;

    // Penthouse
    if (hasPenthouse) {
        const phWidth = width * 0.72;
        const phHeight = height * 0.28;
        const phDepth = depth * 0.72;
        const phMesh = new THREE.Mesh(new THREE.BoxGeometry(phWidth, phHeight, phDepth), buildingBoxMaterials);
        phMesh.position.y = currentTop + phHeight / 2;
        phMesh.castShadow = true;
        phMesh.receiveShadow = true;
        group.add(phMesh);
        currentTop += phHeight;
    }

    // Antenna & Warning Beacon
    if (hasAntenna) {
        const spireHeight = 1.6;
        const antMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, spireHeight, 8), antennaMat);
        antMesh.position.y = currentTop + spireHeight / 2;
        group.add(antMesh);

        const beaconMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        beaconMesh.position.y = currentTop + spireHeight;
        group.add(beaconMesh);
        beacons.push(beaconMesh);
    }

    // Entrance Door Assembly
    const doorW = 1.05;
    const doorH = 1.45;
    const doorPlane = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), doorMaterial);
    doorPlane.position.set(0, doorH / 2 + curbHeight + 0.05, depth / 2 + 0.03);
    doorPlane.receiveShadow = true;
    group.add(doorPlane);

    // Frame
    const frameT = 0.05;
    const frameD = 0.05;
    const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(frameT, doorH, frameD), doorFrameMat);
    leftJamb.position.set(-doorW / 2 - frameT / 2, doorH / 2 + curbHeight + 0.05, depth / 2 + 0.025);
    group.add(leftJamb);

    const rightJamb = new THREE.Mesh(new THREE.BoxGeometry(frameT, doorH, frameD), doorFrameMat);
    rightJamb.position.set(doorW / 2 + frameT / 2, doorH / 2 + curbHeight + 0.05, depth / 2 + 0.025);
    group.add(rightJamb);

    const header = new THREE.Mesh(new THREE.BoxGeometry(doorW + frameT * 2 + 0.04, 0.06, frameD), doorFrameMat);
    header.position.set(0, doorH + curbHeight + 0.05 + 0.03, depth / 2 + 0.025);
    group.add(header);

    // Canopy
    const canopyW = 1.45;
    const canopyD = 0.85;
    const canopyMesh = new THREE.Mesh(new THREE.BoxGeometry(canopyW, 0.05, canopyD), canopyMat);
    canopyMesh.position.set(0, doorH + curbHeight + 0.22, depth / 2 + canopyD / 2);
    group.add(canopyMesh);

    // Canopy Struts
    const strutGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.6, 8);
    const lStrut = new THREE.Mesh(strutGeo, strutMat);
    lStrut.position.set(-canopyW / 2 + 0.12, doorH + curbHeight + 0.42, depth / 2 + 0.35);
    lStrut.rotation.x = -Math.PI / 4;
    group.add(lStrut);

    const rStrut = new THREE.Mesh(strutGeo, strutMat);
    rStrut.position.set(canopyW / 2 - 0.12, doorH + curbHeight + 0.42, depth / 2 + 0.35);
    rStrut.rotation.x = -Math.PI / 4;
    group.add(rStrut);

    // Glowing Canopy Recessed Fixture (Emissive Mesh - no costly shadow light)
    const canopyLightMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), canopyBulbMat);
    canopyLightMesh.position.set(0, doorH + curbHeight + 0.18, depth / 2 + 0.4);
    group.add(canopyLightMesh);

    // Concrete Step & Walkway Pathway
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.6), concreteWalkwayMat);
    stepMesh.position.set(0, curbHeight + 0.03, depth / 2 + 0.3);
    stepMesh.receiveShadow = true;
    group.add(stepMesh);

    const pathwayMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 1.4), concreteWalkwayMat);
    pathwayMesh.position.set(0, curbHeight + 0.015, depth / 2 + 1.3);
    pathwayMesh.receiveShadow = true;
    group.add(pathwayMesh);

    scene.add(group);
}

// Populate buildings on left and right
const leftOffset = -roadWidth / 2 - curbDepth - sidewalkWidth - 1.8;
createBuilding({ x: leftOffset, z: -12, width: 3.4, height: 6.2, depth: 3.4, rotationY: Math.PI / 2, hasPenthouse: true, hasAntenna: true });
createBuilding({ x: leftOffset, z: 0,   width: 3.2, height: 4.8, depth: 3.2, rotationY: Math.PI / 2, hasPenthouse: true, hasAntenna: true });
createBuilding({ x: leftOffset, z: 12,  width: 3.6, height: 3.8, depth: 3.2, rotationY: Math.PI / 2, hasPenthouse: false, hasAntenna: true });

const rightOffset = roadWidth / 2 + curbDepth + sidewalkWidth + 1.8;
createBuilding({ x: rightOffset, z: -12, width: 3.2, height: 4.4, depth: 3.2, rotationY: -Math.PI / 2, hasPenthouse: true, hasAntenna: true });
createBuilding({ x: rightOffset, z: 0,   width: 3.5, height: 6.8, depth: 3.5, rotationY: -Math.PI / 2, hasPenthouse: true, hasAntenna: true });
createBuilding({ x: rightOffset, z: 12,  width: 3.2, height: 5.2, depth: 3.2, rotationY: -Math.PI / 2, hasPenthouse: true, hasAntenna: true });

// ---------------------------------------------------------------------------
// 6. STREETLAMPS (LEAN MESHES + BROAD RADIANT LIGHT POOLS)
// ---------------------------------------------------------------------------
const baseGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.35, 8);
const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 3.4, 8);
const armGeo = new THREE.BoxGeometry(0.05, 0.05, 0.55);
const headGeo = new THREE.ConeGeometry(0.22, 0.18, 8);
const bulbGeo = new THREE.SphereGeometry(0.08, 8, 8);

function createStreetlamp(x, z, armFacingRoad = 1) {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, curbHeight, z);

    const baseMesh = new THREE.Mesh(baseGeo, poleMat);
    baseMesh.position.y = 0.175;
    lampGroup.add(baseMesh);

    const poleMesh = new THREE.Mesh(poleGeo, poleMat);
    poleMesh.position.y = 1.7 + 0.3;
    lampGroup.add(poleMesh);

    const armMesh = new THREE.Mesh(armGeo, poleMat);
    armMesh.position.set(0, 3.65, 0.22 * armFacingRoad);
    lampGroup.add(armMesh);

    const headMesh = new THREE.Mesh(headGeo, poleMat);
    headMesh.position.set(0, 3.6, 0.45 * armFacingRoad);
    headMesh.rotation.x = Math.PI;
    lampGroup.add(headMesh);

    const bulbMesh = new THREE.Mesh(bulbGeo, lampBulbMat);
    bulbMesh.position.set(0, 3.5, 0.45 * armFacingRoad);
    lampGroup.add(bulbMesh);

    scene.add(lampGroup);
}

const leftLampX = -roadWidth / 2 - 0.7;
const rightLampX = roadWidth / 2 + 0.7;
const lampZs = [-14, -5, 5, 14];

lampZs.forEach(z => {
    createStreetlamp(leftLampX, z, 1);
    createStreetlamp(rightLampX, z, -1);
});

// Strategic warm street illuminators (4 broad coverage lights instead of 20 unneeded lights)
const streetLights = [
    { x: -3.0, z: -8 },
    { x: -3.0, z: 8 },
    { x: 3.0, z: -8 },
    { x: 3.0, z: 8 }
].map(pos => {
    const light = new THREE.PointLight(0xffaa22, 22, 18, 1.4);
    light.position.set(pos.x, 3.5, pos.z);
    scene.add(light);
    return light;
});

// ---------------------------------------------------------------------------
// 7. ANIMATION LOOP (LOCKED 60 FPS)
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Subtle Beacon Blink & Window Glow
    const beaconColor = (Math.sin(elapsedTime * 4) > 0) ? 0xef4444 : 0x300505;
    for (let i = 0; i < beacons.length; i++) {
        beacons[i].material.color.setHex(beaconColor);
    }

    // Controls & Render
    controls.update();
    renderer.render(scene, camera);
}

animate();

// ---------------------------------------------------------------------------
// 9. RESPONSIVE RESIZE
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
});
