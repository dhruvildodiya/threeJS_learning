import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { TransformControls } from "three/addons/controls/TransformControls.js"
import { gsap } from "gsap"

const sizes = {
    height: window.innerHeight,
    width: window.innerWidth
}

const canvas = document.getElementById("webgl-canvas");

const scene = new THREE.Scene()
scene.background = new THREE.Color("black");

function getCameraDistance() {
    if (window.innerWidth < 768) {
        return 1.9;
    } else if (window.innerWidth < 1024) {
        return 1.4;
    } else {
        return 1.0;
    }
}


const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.01, 1000)
camera.position.z = getCameraDistance();
camera.position.y = 0.3
scene.add(camera)

let gunModel = null;
let transformGizmo = null;
let transformGizmoHelper = null;
let gunAxesHelper = null;

// Individual Gun Part References for Object & Sequence Animations
let partScope = null;
let partBoltA = null;
let partBoltB = null;
let partWrap = null;
let partBullet = null;
let partTrigger = null;
let partBody = null;

// Animation State Machine
const AnimState = {
    IDLE: "IDLE",
    INSPECTING: "INSPECTING",
    RELOADING: "RELOADING",
    EXPLODED: "EXPLODED",
    FIRING: "FIRING",
    TURNTABLE: "TURNTABLE"
};
let currentAnimState = AnimState.IDLE;

// Cache default local transforms of gun parts for exploded & reload recovery
const partDefaultTransforms = new Map();

const light = new THREE.DirectionalLight(0xffffff, 2.5)
light.position.set(2, 4, 3)
light.castShadow = true
light.shadow.mapSize.width = 2048
light.shadow.mapSize.height = 2048
light.shadow.camera.near = 0.5
light.shadow.camera.far = 15
light.shadow.bias = -0.0005
scene.add(light)

scene.add(new THREE.AmbientLight(0xffffff, 1.2))

// Spotlight directly above the gun for focused brightness and highlights
const spotLight = new THREE.SpotLight(0xffffff, 5.0);
spotLight.position.set(0, 2.5, 0.5); // Directly above and slightly front
spotLight.angle = Math.PI / 5;       // Beam spread angle
spotLight.penumbra = 0.4;            // Soft edge
spotLight.decay = 1.2;
spotLight.distance = 10;
spotLight.target.position.set(0, 0.3, 0); // Points straight at the gun
scene.add(spotLight);
scene.add(spotLight.target);

// Target Spotlight: illuminates the dartboard target on the back wall
const targetSpotLight = new THREE.SpotLight(0xfff5ea, 3.5);
targetSpotLight.position.set(0, 4.0, -3.5);
targetSpotLight.angle = Math.PI / 4;
targetSpotLight.penumbra = 0.5;
targetSpotLight.decay = 1.0;
targetSpotLight.distance = 12;
targetSpotLight.target.position.set(0, 1.6, -7.0); // Points directly at target
scene.add(targetSpotLight);
scene.add(targetSpotLight.target);

// ============================================================================
// TEXTURE LOADER & PBR MATERIALS FOR SURROUNDING PLANES
// ============================================================================
const textureLoader = new THREE.TextureLoader();

// 1. Bottom Floor Tiles Texture
const tilesTexture = textureLoader.load('./textures/tiles.jpg');
tilesTexture.wrapS = THREE.RepeatWrapping;
tilesTexture.wrapT = THREE.RepeatWrapping;
tilesTexture.repeat.set(6, 6);

// Room dimensions (Width = 14m, Depth = 14m, Height = 6m)
const ROOM_WIDTH = 14;
const ROOM_DEPTH = 14;
const ROOM_HEIGHT = 6;
const FLOOR_Y = -0.35;
const CEILING_Y = FLOOR_Y + ROOM_HEIGHT;
const WALL_CENTER_Y = FLOOR_Y + (ROOM_HEIGHT / 2); // 2.65

const floorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
const floorMaterial = new THREE.MeshStandardMaterial({
    map: tilesTexture,
    roughness: 0.3,
    metalness: 0.1,
});

const floorPlane = new THREE.Mesh(floorGeometry, floorMaterial);
floorPlane.rotation.x = -Math.PI / 2; // Flat horizontal plane
floorPlane.position.set(0, FLOOR_Y, 0); // Centered at origin under the gun
floorPlane.receiveShadow = true;
scene.add(floorPlane);

// 2. Surrounding Wall Textures (Brick Wall)
const brickTexture = textureLoader.load('./textures/brick.jpg');
brickTexture.wrapS = THREE.RepeatWrapping;
brickTexture.wrapT = THREE.RepeatWrapping;
brickTexture.repeat.set(6, 3);

const wallMaterial = new THREE.MeshStandardMaterial({
    map: brickTexture,
    roughness: 0.85,
    metalness: 0.05,
});

// Surfaces that can receive bullet holes / gun shots
const shootableSurfaces = [];
shootableSurfaces.push(floorPlane);

// A. Back Wall (Facing camera behind gun at Z = -ROOM_DEPTH/2 = -7)
const backWallGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
const backWallPlane = new THREE.Mesh(backWallGeometry, wallMaterial);
backWallPlane.position.set(0, WALL_CENTER_Y, -ROOM_DEPTH / 2);
backWallPlane.receiveShadow = true;
scene.add(backWallPlane);
shootableSurfaces.push(backWallPlane);

// ============================================================================
// TARGET / DARTBOARD MODEL ON BACKGROUND WALL
// ============================================================================
let targetModel = null;
const targetLoader = new GLTFLoader();
targetLoader.load(
    './models/target/dartboard_1k.gltf',
    (gltf) => {
        targetModel = gltf.scene;

        // Position on the back wall (Z = -7.0 + 0.05 = -6.95, Y = 1.6m eye-level)
        targetModel.scale.set(4.0, 4.0, 4.0);
        targetModel.position.set(0, 1.6, (-ROOM_DEPTH / 2) + 0.05);
        targetModel.rotation.set(0, 0, 0);

        targetModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                shootableSurfaces.push(child);
            }
        });

        scene.add(targetModel);
    },
    undefined,
    (error) => {
        console.error('Target model failed to load', error);
    }
);

// B. Left Side Wall (X = -ROOM_WIDTH/2 = -7, rotated +90 deg facing inward)
const sideWallGeometry = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);
const leftWallPlane = new THREE.Mesh(sideWallGeometry, wallMaterial);
leftWallPlane.position.set(-ROOM_WIDTH / 2, WALL_CENTER_Y, 0);
leftWallPlane.rotation.y = Math.PI / 2;
leftWallPlane.receiveShadow = true;
scene.add(leftWallPlane);
shootableSurfaces.push(leftWallPlane);

// C. Right Side Wall (X = +ROOM_WIDTH/2 = +7, rotated -90 deg facing inward)
const rightWallPlane = new THREE.Mesh(sideWallGeometry, wallMaterial);
rightWallPlane.position.set(ROOM_WIDTH / 2, WALL_CENTER_Y, 0);
rightWallPlane.rotation.y = -Math.PI / 2;
rightWallPlane.receiveShadow = true;
scene.add(rightWallPlane);
shootableSurfaces.push(rightWallPlane);

// D. Front Wall (Behind camera at Z = +ROOM_DEPTH/2 = +7, rotated 180 deg facing inward)
const frontWallGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
const frontWallPlane = new THREE.Mesh(frontWallGeometry, wallMaterial);
frontWallPlane.position.set(0, WALL_CENTER_Y, ROOM_DEPTH / 2);
frontWallPlane.rotation.y = Math.PI;
frontWallPlane.receiveShadow = true;
scene.add(frontWallPlane);
shootableSurfaces.push(frontWallPlane);

// E. Ceiling (Dark concrete overhead canopy)
const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e2229,
    roughness: 0.9,
    metalness: 0.1
});
const ceilingPlane = new THREE.Mesh(floorGeometry, ceilingMaterial);
ceilingPlane.rotation.x = Math.PI / 2; // Facing downward into the room
ceilingPlane.position.set(0, CEILING_Y, 0);
ceilingPlane.receiveShadow = true;
scene.add(ceilingPlane);
shootableSurfaces.push(ceilingPlane);

// ============================================================================
// PROCEDURAL BULLET HOLE TEXTURE & IMPACT CREATOR
// ============================================================================
function createBulletHoleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const cx = 64, cy = 64;

    // 1. Outer rough scorch / blast radius
    const outerGrad = ctx.createRadialGradient(cx, cy, 14, cx, cy, 60);
    outerGrad.addColorStop(0, 'rgba(15, 12, 10, 0.95)');
    outerGrad.addColorStop(0.35, 'rgba(40, 30, 25, 0.8)');
    outerGrad.addColorStop(0.7, 'rgba(60, 45, 35, 0.35)');
    outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.fill();

    // 2. Irregular cracks / fragments radiating outwards
    ctx.strokeStyle = 'rgba(10, 8, 8, 0.85)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const len = 35 + Math.random() * 22;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * 14, cy + Math.sin(angle) * 14);
        ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
        ctx.stroke();
    }

    // 3. Deep inner cavity (pitch black hole)
    const holeGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 16);
    holeGrad.addColorStop(0, '#000000');
    holeGrad.addColorStop(0.85, '#0a0a0a');
    holeGrad.addColorStop(1, 'rgba(25, 20, 15, 0.95)');
    ctx.fillStyle = holeGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

const bulletHoleTexture = createBulletHoleTexture();
const bulletHoleGeometry = new THREE.PlaneGeometry(0.18, 0.18);
const bulletHoles = [];

function spawnBulletHole(intersection) {
    const material = new THREE.MeshBasicMaterial({
        map: bulletHoleTexture,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4
    });

    const decal = new THREE.Mesh(bulletHoleGeometry, material);

    // Position slightly offset along the surface normal to prevent z-fighting
    const normal = intersection.face ? intersection.face.normal.clone() : new THREE.Vector3(0, 0, 1);
    normal.transformDirection(intersection.object.matrixWorld).normalize();

    decal.position.copy(intersection.point).addScaledVector(normal, 0.008);

    // Orient decal flush with the impacted surface normal
    decal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    // Random rotation around normal for visual variety
    decal.rotateZ(Math.random() * Math.PI * 2);

    scene.add(decal);
    bulletHoles.push(decal);

    // Limit maximum active bullet holes to avoid performance degradation
    if (bulletHoles.length > 50) {
        const oldest = bulletHoles.shift();
        scene.remove(oldest);
        oldest.geometry.dispose();
        oldest.material.dispose();
    }

    // Spark / muzzle flash effect at gun tip & flash at impact point
    createImpactFlash(intersection.point, normal);
}

// Quick glowing impact spark
function createImpactFlash(point, normal) {
    const sparkGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 1 });
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.copy(point).addScaledVector(normal, 0.02);
    scene.add(spark);

    let op = 1.0;
    const fade = setInterval(() => {
        op -= 0.15;
        spark.scale.multiplyScalar(1.15);
        sparkMat.opacity = Math.max(0, op);
        if (op <= 0) {
            clearInterval(fade);
            scene.remove(spark);
            sparkGeo.dispose();
            sparkMat.dispose();
        }
    }, 20);
}


const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(sizes.width, sizes.height)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap


// ORBIT CONTROLS (Can be toggled via "O" key)
let orbitControlsEnabled = false;
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 0.01;
controls.maxDistance = 15;
controls.target.set(0, 0.3, 0);
controls.enabled = false; // Disabled by default, enabled when user presses 'O'

// ============================================================================
// TRANSFORM CONTROLS (Interactive 3D Gizmo for Translate, Rotate, Scale)
// ============================================================================
transformGizmo = new TransformControls(camera, renderer.domElement);
transformGizmo.size = 0.75;
transformGizmoHelper = transformGizmo.getHelper();
scene.add(transformGizmoHelper);

// Disable OrbitControls / dragging when interacting with the transform gizmo
transformGizmo.addEventListener('dragging-changed', (event) => {
    controls.enabled = event.value ? false : orbitControlsEnabled;
    isGizmoDragging = event.value;
});

// Enforce scale limits (max 2 on all axes) while using the TransformControls gizmo
transformGizmo.addEventListener('change', () => {
    if (gunModel && transformGizmo.getMode() === 'scale') {
        gunModel.scale.x = THREE.MathUtils.clamp(gunModel.scale.x, 0.1, 2.0);
        gunModel.scale.y = THREE.MathUtils.clamp(gunModel.scale.y, 0.1, 2.0);
        gunModel.scale.z = THREE.MathUtils.clamp(gunModel.scale.z, 0.1, 2.0);
    }
});

let isGizmoDragging = false;
let gizmoVisible = true;

const loader = new GLTFLoader()
loader.load(
    './models/gun4k/gun4k.gltf',
    (gltf) => {
        gunModel = gltf.scene;
        scene.add(gunModel);

        // Local AxesHelper attached directly to gun model (Red = X, Green = Y, Blue = Z)
        gunAxesHelper = new THREE.AxesHelper(0.5);
        gunAxesHelper.material.depthTest = false;
        gunAxesHelper.renderOrder = 999;
        gunModel.add(gunAxesHelper);

        // Attach TransformControls gizmo to the gun model
        transformGizmo.attach(gunModel);

        gltf.scene.position.y = 0.3

        partBoltA = gltf.scene.getObjectByName("bolt_action_rifle_7_62_bolt_a");
        partBoltB = gltf.scene.getObjectByName("bolt_action_rifle_7_62_bolt_b");
        partScope = gltf.scene.getObjectByName("bolt_action_rifle_7_62_scope");
        partWrap = gltf.scene.getObjectByName("bolt_action_rifle_7_62_wrap");
        partBullet = gltf.scene.getObjectByName("bolt_action_rifle_7_62_bullet_54mm");
        partTrigger = gltf.scene.getObjectByName("bolt_action_rifle_7_62_trigger");
        partBody = gltf.scene.getObjectByName("bolt_action_rifle_7_62");

        // Position bullet mesh inside the chamber bore line initially
        // (In the model file, bullet was translated down at y = -0.054 below the magazine.
        // The chamber bore line aligns with bolt_b at y = +0.0506, x = -0.08)
        if (partBullet) {
            partBullet.position.set(-0.06, 0.0506, 0.0);
            partBullet.visible = true;
        }

        // Cache initial local transforms of each part
        [partBoltA, partBoltB, partScope, partWrap, partBullet, partTrigger, partBody].forEach((part) => {
            if (part) {
                partDefaultTransforms.set(part, {
                    position: part.position.clone(),
                    rotation: part.rotation.clone(),
                    scale: part.scale.clone()
                });
            }
        });

        if (partBoltA) {
            const oldTexture = partBoltA.material.map;
            const oldNormal = partBoltA.material.normalMap;
            partBoltA.material = new THREE.MeshStandardMaterial({
                map: oldTexture,
                normalMap: oldNormal,
                roughness: 0,
                metalness: 0.9,
            });
        }

        if (partBoltB) {
            const oldTexture = partBoltB.material.map;
            const oldNormal = partBoltB.material.normalMap;
            partBoltB.material = new THREE.MeshStandardMaterial({
                map: oldTexture,
                normalMap: oldNormal,
                roughness: 0,
                metalness: 0.9,
            });
        }

        // Configure Scope Materials (Multi-material: [0]=Outer metal body, [1]=Optical glass lens)
        if (partScope) {
            // Generate high-resolution procedural sniper crosshair reticle
            const reticleCanvas = document.createElement("canvas");
            reticleCanvas.width = 1024;
            reticleCanvas.height = 1024;
            const ctx = reticleCanvas.getContext("2d");
            const cx = 512, cy = 512;

            ctx.clearRect(0, 0, 1024, 1024);

            // Subtle optical tint vignette
            const grad = ctx.createRadialGradient(cx, cy, 180, cx, cy, 480);
            grad.addColorStop(0, "rgba(22, 54, 72, 0.0)");
            grad.addColorStop(0.7, "rgba(16, 44, 58, 0.12)");
            grad.addColorStop(1, "rgba(6, 20, 30, 0.45)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, 490, 0, Math.PI * 2);
            ctx.fill();

            // Scope reticle ring & crosshairs
            ctx.strokeStyle = "rgba(15, 20, 25, 0.88)";
            ctx.lineWidth = 3;

            // Outer range ring
            ctx.beginPath();
            ctx.arc(cx, cy, 320, 0, Math.PI * 2);
            ctx.stroke();

            // Inner circle
            ctx.beginPath();
            ctx.arc(cx, cy, 80, 0, Math.PI * 2);
            ctx.stroke();

            // Center cross lines
            ctx.lineWidth = 2.5;
            // Horizontal
            ctx.beginPath();
            ctx.moveTo(cx - 360, cy);
            ctx.lineTo(cx - 30, cy);
            ctx.moveTo(cx + 30, cy);
            ctx.lineTo(cx + 360, cy);
            ctx.stroke();

            // Vertical
            ctx.beginPath();
            ctx.moveTo(cx, cy - 360);
            ctx.lineTo(cx, cy - 30);
            ctx.moveTo(cx, cy + 30);
            ctx.lineTo(cx, cy + 360);
            ctx.stroke();

            // Mil-dots / tick marks
            ctx.lineWidth = 2;
            for (let d = 80; d <= 280; d += 40) {
                // Horizontal ticks
                ctx.beginPath();
                ctx.moveTo(cx - d, cy - 8);
                ctx.lineTo(cx - d, cy + 8);
                ctx.moveTo(cx + d, cy - 8);
                ctx.lineTo(cx + d, cy + 8);
                // Vertical ticks
                ctx.moveTo(cx - 8, cy - d);
                ctx.lineTo(cx + 8, cy - d);
                ctx.moveTo(cx - 8, cy + d);
                ctx.lineTo(cx + 8, cy + d);
                ctx.stroke();
            }

            // Red central illuminated precision dot
            ctx.fillStyle = "rgba(235, 45, 45, 0.95)";
            ctx.beginPath();
            ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
            ctx.fill();

            const reticleTexture = new THREE.CanvasTexture(reticleCanvas);
            reticleTexture.needsUpdate = true;

            const metalMat = Array.isArray(partScope.material) ? partScope.material[0] : partScope.material;
            const glassMat = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color(0xd6ecfa),
                transparent: true,
                opacity: 0.35,
                roughness: 0.08,
                metalness: 0.1,
                transmission: 0.85,
                ior: 1.52,
                thickness: 0.02,
                map: reticleTexture,
                depthWrite: false,
                side: THREE.DoubleSide
            });

            partScope.material = [metalMat, glassMat];
        }

        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                console.log(child.name)

                // Do not overwrite bolt materials or scope (which has separate metal + glass materials)
                if (child.name !== "bolt_action_rifle_7_62_bolt_a" && 
                    child.name !== "bolt_action_rifle_7_62_bolt_b" && 
                    child.name !== "bolt_action_rifle_7_62_scope") {
                    const oldTexture = child.material ? child.material.map : null;
                    const oldNormal = child.material ? child.material.normalMap : null;

                    child.material = new THREE.MeshStandardMaterial({
                        map: oldTexture,
                        normalMap: oldNormal,
                        metalness: 0.9,
                    });
                }

                child.castShadow = true;
                child.receiveShadow = true;

                interactableObjects.push(child);

            }
        });

    },
    (progress) => {
        if (progress.total > 0) {
            console.log(`Loading: ${Math.round((progress.loaded / progress.total) * 100)}%`);
        } else {
            console.log(`Loaded: ${progress.loaded} bytes`);
        }
    },
    (error) => {
        console.error('Model failed to load', error);
    }
)

// ============================================================================
// DIRECT GUN ROTATION VIA MOUSE DRAG (Only rotates the gun model around Y-axis!)
// ============================================================================
let isDragging = false;
let previousPointerPosition = { x: 0, y: 0 };
const gunRotationVelocity = { x: 0, y: 0 };

canvas.addEventListener('pointerdown', (e) => {
    if (isGizmoDragging || orbitControlsEnabled) return;
    isDragging = true;
    previousPointerPosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener('pointerup', () => {
    isDragging = false;
});

window.addEventListener('pointermove', (e) => {
    if (!isDragging || !gunModel || isGizmoDragging) return;

    const deltaX = e.clientX - previousPointerPosition.x;

    // Direct rotation response: only rotate around Y-axis (turntable yaw)
    gunModel.rotation.y += deltaX * 0.004;

    // Store velocity for inertia damping
    gunRotationVelocity.y = deltaX * 0.001;

    previousPointerPosition = { x: e.clientX, y: e.clientY };
});

// Prevent browser context menu ("Inspect", "Reload", etc.) on right-click so 3D controls remain smooth
window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// ============================================================================
// RAYCASTER & POINTER INTERACTIONS (Hover, Click, Double Click, Pointer Movement)
// ============================================================================
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Store interactive meshes from model
const interactableObjects = [];

let hoveredObject = null;
let selectedObject = null;

// Cache original positions for spring/recoil animations
const originalPositions = new Map();

// Helper to calculate Normalized Device Coordinates (-1 to +1)
function updatePointerCoordinates(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// 1. HOVER ACTION: Wireframe Outline + Subtle Breathing Pulse
window.addEventListener('pointermove', (event) => {
    if (isGizmoDragging) return;
    updatePointerCoordinates(event);

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(interactableObjects);

    if (intersects.length > 0) {
        const hit = intersects[0].object;

        if (hoveredObject !== hit) {
            // Restore previously hovered object's wireframe
            if (hoveredObject && hoveredObject !== selectedObject) {
                hoveredObject.material.wireframe = false;
                hoveredObject.material.emissive?.set(0x000000);
            }

            hoveredObject = hit;

            // Hover Action: Toggle wireframe overlay + neon cyan edge glow
            if (hoveredObject !== selectedObject) {
                hoveredObject.material.wireframe = true;
                hoveredObject.material.emissive?.set(0x06b6d4);
            }

            canvas.style.cursor = 'pointer';
        }
    } else {
        if (hoveredObject && hoveredObject !== selectedObject) {
            hoveredObject.material.wireframe = false;
            hoveredObject.material.emissive?.set(0x000000);
        }
        hoveredObject = null;
        canvas.style.cursor = 'default';
    }
});

// Palette for click colorization
const customColors = [
    0xef4444, // Crimson Red
    0x10b981, // Emerald Green
    0x3b82f6, // Electric Blue
    0xf59e0b, // Amber Gold
    0x8b5cf6, // Violet
    0xec4899, // Hot Pink
    0x14b8a6, // Teal
    0x64748b  // Gunmetal Slate
];

// 2. CLICK ACTION: Custom Paint Job (Debounced to prevent firing on double click!)
let clickTimeout = null;

window.addEventListener('click', (event) => {
    if (isGizmoDragging) return;
    if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
        return;
    }

    clickTimeout = setTimeout(() => {
        clickTimeout = null;
        updatePointerCoordinates(event);

        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(interactableObjects);

        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;

            // Reset wireframe if it was hovered
            clickedMesh.material.wireframe = false;

            // Action: Pick a random vibrant color and apply high-gloss specular shine
            const randomColor = customColors[Math.floor(Math.random() * customColors.length)];
            clickedMesh.material.color.set(randomColor);
            clickedMesh.material.shininess = 200;
            clickedMesh.material.emissive?.set(0x111111);

            selectedObject = clickedMesh;
            console.log(`🎨 Painted ${clickedMesh.name} to color: #${randomColor.toString(16)}`);
        }
    }, 250); // 250ms delay distinguishes single click from double click!
});

// 3. DOUBLE CLICK ACTION: Recoil / Kick the WHOLE Gun Model & Snap Back
let isRecoiling = false;
const gunInitialPosition = new THREE.Vector3(0, 0.3, 0);
const gunInitialScale = new THREE.Vector3(1, 1, 1);

// Movement Boundaries (min/max for X, Y, Z)
const MOVEMENT_BOUNDS = {
    minX: -2.0, maxX: 2.0,
    minY: -0.15, maxY: 2.5,
    minZ: -2.0, maxZ: 1.5
};

// Rotation limits (pitch / X-axis limit)
const ROTATION_LIMITS = {
    minPitch: -Math.PI / 2.2,
    maxPitch: Math.PI / 2.2
};

// Scale limits
const SCALE_LIMITS = { min: 0.3, max: 2.0 };

// Keyboard state for WASD + Elevation / Scaling / Snapping
const keysPressed = {};
let snapGridEnabled = false;
const SNAP_TRANSLATION_STEP = 0.2; // 20cm step
const SNAP_ROTATION_STEP = Math.PI / 12; // 15 deg step

window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    keysPressed[key] = true;

    // Toggle Transform Gizmo on/off with key "T"
    if (key === "t") {
        gizmoVisible = !gizmoVisible;
        transformGizmo.visible = gizmoVisible;
        transformGizmo.enabled = gizmoVisible;

        // In Three.js, transformGizmo.getHelper() is what renders the 3D axes handles into the scene
        if (transformGizmoHelper) {
            transformGizmoHelper.visible = gizmoVisible;
        }

        // Also toggle the local gun axes helper (XYZ lines)
        if (gunAxesHelper) {
            gunAxesHelper.visible = gizmoVisible;
        }

        console.log("🎯 Transform Gizmo & Helpers:", gizmoVisible ? "ENABLED (Visible)" : "DISABLED (Hidden)");
    }

    // Switch Gizmo Mode: 1 = Translate, 2 = Rotate, 3 = Scale
    if (key === "1") {
        transformGizmo.setMode("translate");
        console.log("Gizmo Mode: TRANSLATE");
    }
    if (key === "2") {
        transformGizmo.setMode("rotate");
        console.log("Gizmo Mode: ROTATE");
    }
    if (key === "3") {
        transformGizmo.setMode("scale");
        console.log("Gizmo Mode: SCALE");
    }

    // Toggle Snapping with key "G"
    if (key === "g") {
        snapGridEnabled = !snapGridEnabled;
        transformGizmo.setTranslationSnap(snapGridEnabled ? SNAP_TRANSLATION_STEP : null);
        transformGizmo.setRotationSnap(snapGridEnabled ? SNAP_ROTATION_STEP : null);
        transformGizmo.setScaleSnap(snapGridEnabled ? 0.1 : null);
        console.log("🧲 Snapping Mode:", snapGridEnabled ? "ENABLED (0.2m / 15°)" : "DISABLED");

        if (snapGridEnabled && gunModel) {
            gunModel.position.x = Math.round(gunModel.position.x / SNAP_TRANSLATION_STEP) * SNAP_TRANSLATION_STEP;
            gunModel.position.y = Math.round(gunModel.position.y / SNAP_TRANSLATION_STEP) * SNAP_TRANSLATION_STEP;
            gunModel.position.z = Math.round(gunModel.position.z / SNAP_TRANSLATION_STEP) * SNAP_TRANSLATION_STEP;
            gunModel.rotation.y = Math.round(gunModel.rotation.y / SNAP_ROTATION_STEP) * SNAP_ROTATION_STEP;
        }
    }

    // Reset transform with key "R"
    if (key === "r") {
        if (gunModel) {
            gunModel.position.copy(gunInitialPosition);
            gunModel.rotation.set(0, 0, 0);
            gunModel.scale.copy(gunInitialScale);
            gunRotationVelocity.x = 0;
            gunRotationVelocity.y = 0;
            console.log("🔄 Gun Transform fully reset (Position, Rotation, Scale)");
        }
    }

    // Toggle OrbitControls with key "O"
    if (key === "o") {
        orbitControlsEnabled = !orbitControlsEnabled;
        controls.enabled = orbitControlsEnabled;
        controls.enableRotate = orbitControlsEnabled;
        controls.enableZoom = orbitControlsEnabled;
        controls.enablePan = orbitControlsEnabled;
        console.log(`🌐 Orbit Controls: ${orbitControlsEnabled ? "ENABLED (Camera Rotate / Zoom / Pan active)" : "DISABLED (Gun interaction mode)"}`);
    }
});

window.addEventListener("keyup", (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

// Wheel Scaling (Scale with mouse wheel when over model or canvas - only when OrbitControls is OFF)
canvas.addEventListener("wheel", (e) => {
    if (!gunModel || orbitControlsEnabled) return;
    e.preventDefault();
    const scaleFactor = e.deltaY < 0 ? 1.05 : 0.95;
    const newScale = THREE.MathUtils.clamp(
        gunModel.scale.x * scaleFactor,
        SCALE_LIMITS.min,
        SCALE_LIMITS.max
    );
    gunModel.scale.set(newScale, newScale, newScale);
}, { passive: false });


// Helper to calculate barrel muzzle point and shooting direction in World space
function getGunMuzzleAndDirection() {
    if (!gunModel) return null;

    // Update gun world matrix
    gunModel.updateMatrixWorld(true);

    // Muzzle tip position in gun's local space (rifle barrel tip: X ~ +0.58m, Y ~ -0.015m, Z ~ 0)
    const localMuzzlePos = new THREE.Vector3(0.58, -0.015, 0.0);
    const muzzleWorldPos = localMuzzlePos.clone().applyMatrix4(gunModel.matrixWorld);

    // Gun forward direction in local space is along +X (towards the barrel tip)
    const localForward = new THREE.Vector3(1, 0, 0);
    const worldForward = localForward.clone().transformDirection(gunModel.matrixWorld).normalize();

    return { origin: muzzleWorldPos, direction: worldForward };
}

// Gun raycaster used for firing
const gunRaycaster = new THREE.Raycaster();

window.addEventListener('dblclick', (event) => {
    if (isGizmoDragging) return;
    // Cancel single click color change immediately!
    if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
    }

    if (!gunModel || isRecoiling) return;

    // =========================================================================
    // 1. SHOOT: CAST RAY DIRECTLY FROM GUN BARREL POINT IN GUN DIRECTION
    // =========================================================================
    const muzzle = getGunMuzzleAndDirection();
    if (muzzle) {
        gunRaycaster.set(muzzle.origin, muzzle.direction);

        // Raycast against all shootable scene elements (target model, back wall, side walls, floor)
        const hits = gunRaycaster.intersectObjects(shootableSurfaces, true);

        if (hits.length > 0) {
            const hit = hits[0];
            console.log('🎯 Shot hit:', hit.object.name || 'Surface', 'at', hit.point);
            spawnBulletHole(hit);
        } else {
            console.log('💨 Shot missed (fired into open space)');
        }
    }

    // =========================================================================
    // 2. RECOIL ANIMATION (GSAP with Elastic / Back Easing & State Control)
    // =========================================================================
    setAnimState(AnimState.FIRING);

    const kickPos = gunModel.position.clone().add(
        new THREE.Vector3(-0.06, 0.015, 0).applyQuaternion(gunModel.quaternion)
    );
    const origPos = gunModel.position.clone();

    // Trigger local bolt rattle along bore axis (-X)
    const boltsToJiggle = [partBoltA, partBoltB].filter(Boolean).map(b => b.position);
    if (boltsToJiggle.length > 0) {
        gsap.to(boltsToJiggle, {
            x: "-=0.015",
            duration: 0.05,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
        });
    }

    gsap.timeline({
        onComplete: () => {
            setAnimState(AnimState.IDLE);
        }
    })
    .to(gunModel.position, {
        x: kickPos.x,
        y: kickPos.y,
        z: kickPos.z,
        duration: 0.06,
        ease: "power3.out"
    })
    .to(gunModel.position, {
        x: origPos.x,
        y: origPos.y,
        z: origPos.z,
        duration: 0.35,
        ease: "elastic.out(1.2, 0.4)" // Snappy spring recovery
    });

    console.log('💥 Gun fired & coordinated recoil executed via GSAP!');
});

// ============================================================================
// ANIMATION SUITE: STATE MACHINE, CAMERA PATHS, SEQUENCES & TIMELINES
// ============================================================================
const stateBadgeEl = document.getElementById("anim-state-badge");
const annotationPinEl = document.getElementById("annotation-pin");
const pinTitleEl = document.getElementById("pin-title");
const pinDescEl = document.getElementById("pin-desc");
let activeAnnotationTarget = null; // Vector3 in 3D world space to project

function setAnimState(newState) {
    currentAnimState = newState;
    if (stateBadgeEl) {
        stateBadgeEl.textContent = `STATE: ${newState}`;
        stateBadgeEl.style.color = newState === AnimState.IDLE ? "#38bdf8" : "#f59e0b";
        stateBadgeEl.style.borderColor = newState === AnimState.IDLE ? "rgba(56, 189, 248, 0.3)" : "rgba(245, 158, 11, 0.5)";
    }
}

// 1. CAMERA ANIMATION HELPER (Synchronizes Camera Position & OrbitControls Target)
function animateCameraTo(targetCamPos, targetLookAt, duration = 1.4, onComplete = null) {
    // Kill any active camera tweens
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(controls.target);

    gsap.to(camera.position, {
        x: targetCamPos.x,
        y: targetCamPos.y,
        z: targetCamPos.z,
        duration: duration,
        ease: "power2.inOut"
    });

    gsap.to(controls.target, {
        x: targetLookAt.x,
        y: targetLookAt.y,
        z: targetLookAt.z,
        duration: duration,
        ease: "power2.inOut",
        onUpdate: () => controls.update(),
        onComplete: () => {
            if (onComplete) onComplete();
        }
    });
}

// Show / Hide 3D Projected UI Pin Callout (Dynamically tracks any Mesh or Vector3)
let activeAnnotationObject = null;
let activeAnnotationOffset = new THREE.Vector3();

function showAnnotationPin(target, title, desc, offset = new THREE.Vector3()) {
    activeAnnotationObject = target;
    activeAnnotationOffset = offset.clone();
    pinTitleEl.textContent = title;
    pinDescEl.textContent = desc;
    annotationPinEl.classList.remove("hidden");
    updateAnnotationPinScreenPos();
}

function hideAnnotationPin() {
    annotationPinEl.classList.add("hidden");
    activeAnnotationTarget = null;
    activeAnnotationObject = null;
}

function updateAnnotationPinScreenPos() {
    if (!activeAnnotationObject && !activeAnnotationTarget) return;

    let worldPos = new THREE.Vector3();
    if (activeAnnotationObject && activeAnnotationObject.isObject3D) {
        activeAnnotationObject.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(activeAnnotationObject);
        box.getCenter(worldPos);
        worldPos.add(activeAnnotationOffset);
    } else if (typeof activeAnnotationObject === "function") {
        worldPos = activeAnnotationObject();
    } else if (activeAnnotationTarget) {
        worldPos.copy(activeAnnotationTarget);
    }

    const projected = worldPos.clone().project(camera);
    // If behind camera plane, hide
    if (projected.z > 1) {
        annotationPinEl.classList.add("hidden");
        return;
    }

    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(projected.y * 0.5) + 0.5) * window.innerHeight;

    annotationPinEl.style.left = `${x}px`;
    annotationPinEl.style.top = `${y}px`;
    annotationPinEl.classList.remove("hidden");
}

// 2. UI-TO-3D INSPECTION ANIMATIONS
// A. Scope Inspection
document.getElementById("btn-inspect-scope")?.addEventListener("click", () => {
    if (currentAnimState === AnimState.RELOADING || currentAnimState === AnimState.FIRING) return;
    setAnimState(AnimState.INSPECTING);

    let scopeTarget = new THREE.Vector3(-0.20, 0.40, 0.0);
    if (partScope) {
        partScope.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(partScope);
        box.getCenter(scopeTarget);
    }

    animateCameraTo(
        { x: scopeTarget.x - 0.05, y: scopeTarget.y + 0.12, z: scopeTarget.z + 0.55 },
        { x: scopeTarget.x, y: scopeTarget.y, z: scopeTarget.z },
        1.2,
        () => {
            if (partScope && partScope.material) {
                const mats = Array.isArray(partScope.material) ? partScope.material : [partScope.material];
                mats.forEach(m => {
                    if (m && m.color) {
                        gsap.to(m.color, {
                            r: 0.2, g: 0.6, b: 1.0,
                            duration: 0.4,
                            yoyo: true,
                            repeat: 3,
                            onComplete: () => m.color.set(0xffffff)
                        });
                    }
                });
            }
            showAnnotationPin(
                partScope || scopeTarget,
                "4x Optical Scope",
                "High-precision reticle optic with anti-glare coated lens",
                new THREE.Vector3(0, 0.08, 0)
            );
        }
    );
});

// B. Barrel & Muzzle Inspection
document.getElementById("btn-inspect-barrel")?.addEventListener("click", () => {
    if (currentAnimState === AnimState.RELOADING || currentAnimState === AnimState.FIRING) return;
    setAnimState(AnimState.INSPECTING);

    // Calculate muzzle position relative to the gun model
    const getBarrelWorldPos = () => {
        if (!gunModel) return new THREE.Vector3(0.55, 0.30, 0.0);
        gunModel.updateMatrixWorld(true);
        // The muzzle tip is at local x ~ +0.58, y ~ 0.0, z ~ 0.0
        return new THREE.Vector3(0.58, 0.0, 0.0).applyMatrix4(gunModel.matrixWorld);
    };

    const barrelPos = getBarrelWorldPos();

    animateCameraTo(
        { x: barrelPos.x + 0.28, y: barrelPos.y + 0.12, z: barrelPos.z + 0.45 },
        { x: barrelPos.x, y: barrelPos.y, z: barrelPos.z },
        1.2,
        () => {
            showAnnotationPin(
                getBarrelWorldPos,
                "7.62mm Heavy Barrel",
                "Cold-hammer forged rifled steel barrel with threaded muzzle"
            );
        }
    );
});

// C. Trigger & Receiver Inspection
document.getElementById("btn-inspect-trigger")?.addEventListener("click", () => {
    if (currentAnimState === AnimState.RELOADING || currentAnimState === AnimState.FIRING) return;
    setAnimState(AnimState.INSPECTING);

    // Calculate trigger world center dynamically from partTrigger
    const getTriggerWorldPos = () => {
        if (partTrigger) {
            partTrigger.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(partTrigger);
            const center = new THREE.Vector3();
            box.getCenter(center);
            return center;
        }
        if (gunModel) {
            gunModel.updateMatrixWorld(true);
            return new THREE.Vector3(-0.285, -0.015, 0.0).applyMatrix4(gunModel.matrixWorld);
        }
        return new THREE.Vector3(-0.285, 0.285, 0.0);
    };

    const triggerPos = getTriggerWorldPos();

    animateCameraTo(
        { x: triggerPos.x, y: triggerPos.y - 0.02, z: triggerPos.z + 0.40 }, // Close-up camera directly facing trigger guard
        { x: triggerPos.x, y: triggerPos.y, z: triggerPos.z }, // Looking directly at the trigger blade
        1.2,
        () => {
            // Highlight trigger with subtle pulse
            if (partTrigger && partTrigger.material) {
                const mats = Array.isArray(partTrigger.material) ? partTrigger.material : [partTrigger.material];
                mats.forEach(m => {
                    if (m && m.color) {
                        gsap.to(m.color, {
                            r: 0.2, g: 0.8, b: 1.0,
                            duration: 0.3,
                            yoyo: true,
                            repeat: 3,
                            onComplete: () => m.color.set(0xffffff)
                        });
                    }
                });
            }
            showAnnotationPin(
                partTrigger || getTriggerWorldPos,
                "Two-Stage Trigger Assembly",
                "Clean 2.5lb trigger pull with crisp mechanical release",
                new THREE.Vector3(0, 0.04, 0)
            );
        }
    );
});

// 3. COMPLEX ANIMATION SEQUENCE: BOLT ACTION CYCLE & RELOAD SEQUENCE
document.getElementById("btn-reload-sequence")?.addEventListener("click", () => {
    if (!partBoltA || currentAnimState === AnimState.RELOADING) return;
    setAnimState(AnimState.RELOADING);
    hideAnnotationPin();

    const reloadTimeline = gsap.timeline({
        onComplete: () => {
            setAnimState(AnimState.IDLE);
            console.log("✅ Complex Reload Sequence Complete!");
        }
    });

    const origBoltRotX = partBoltA.rotation.x;
    const origBoltPosX = partBoltA.position.x;
    const origBoltBPosX = partBoltB ? partBoltB.position.x : origBoltPosX;

    // Chamber position (where the cartridge sits when chambered inside the bore)
    const chamberX = -0.06;
    const chamberY = 0.0506;
    const chamberZ = 0.0;

    // Create a temporary cloned mesh for the spent cartridge inside the chamber
    let spentCasing = null;
    if (partBullet) {
        spentCasing = partBullet.clone();
        spentCasing.material = partBullet.material.clone();
        spentCasing.material.transparent = true;
        // Ensure spent casing starts seated inside the chamber bore
        spentCasing.position.set(chamberX, chamberY, chamberZ);
        spentCasing.rotation.set(0, 0, 0);
        partBullet.parent.add(spentCasing);

        // Hide original fresh bullet while spent casing is inside the chamber
        partBullet.visible = false;
    }

    reloadTimeline
        // Stage 1: Rotate bolt handle upwards 60 deg (Unlock) - spent casing stays still in chamber
        .to(partBoltA.rotation, {
            x: origBoltRotX - (Math.PI / 3),
            duration: 0.25,
            ease: "power2.out"
        })
        // Stage 2: Slide bolt carrier backward along -X AND extract spent casing backward with it out of the chamber
        .to([partBoltA.position, partBoltB ? partBoltB.position : {}], {
            x: "-=0.12",
            duration: 0.35,
            ease: "power1.inOut"
        }, "+=0.05")
        .to(spentCasing ? spentCasing.position : {}, {
            x: chamberX - 0.14, // Extracted straight backward along the bore line
            duration: 0.35,
            ease: "power1.inOut"
        }, "<")

        // Stage 3: EJECT SPENT CASING (Flipped out right ejection port +Z, arching up +Y, spinning with gravity)
        .to(spentCasing ? spentCasing.position : {}, {
            x: chamberX - 0.18,
            y: chamberY + 0.14, // Arcs upward out of ejection port
            z: chamberZ + 0.25, // Flung outward to the right
            duration: 0.22,
            ease: "power2.out"
        })
        .to(spentCasing ? spentCasing.rotation : {}, {
            x: "+=" + (Math.PI * 2.5), // Rapid tumbling
            z: "+=" + Math.PI,
            duration: 0.5,
            ease: "power1.out"
        }, "<")
        .to(spentCasing ? spentCasing.position : {}, {
            y: chamberY - 0.6, // Falls toward ground
            z: chamberZ + 0.45,
            duration: 0.35,
            ease: "power2.in"
        }, ">-0.05")
        .to(spentCasing ? spentCasing.material : {}, {
            opacity: 0,
            duration: 0.15,
            onComplete: () => {
                if (spentCasing) {
                    spentCasing.parent?.remove(spentCasing);
                    spentCasing.geometry.dispose();
                    spentCasing.material.dispose();
                    spentCasing = null;
                }
            }
        }, "<0.15")

        // Stage 4: FRESH CARTRIDGE RISES FROM MAGAZINE WELL
        .call(() => {
            if (partBullet) {
                // Fresh round sits down inside the magazine box (-Y)
                partBullet.position.set(chamberX - 0.14, chamberY - 0.12, chamberZ);
                partBullet.rotation.set(0, 0, 0);
                partBullet.visible = true;
            }
        }, null, "<0.05")
        .to(partBullet ? partBullet.position : {}, {
            y: chamberY, // Springs up to feed ramp level
            duration: 0.2,
            ease: "back.out(1.5)"
        })

        // Stage 5: Push fresh round forward along +X into the chamber as the bolt closes
        .to(partBullet ? partBullet.position : {}, {
            x: chamberX, // Pushed directly into the chamber bore
            duration: 0.32,
            ease: "power1.inOut"
        }, "+=0.06")
        .to([partBoltA.position, partBoltB ? partBoltB.position : {}], {
            x: (target) => (target === partBoltA.position ? origBoltPosX : origBoltBPosX),
            duration: 0.32,
            ease: "power1.inOut"
        }, "<")

        // Stage 6: Rotate bolt handle downward into battery locked position
        .to(partBoltA.rotation, {
            x: origBoltRotX,
            duration: 0.22,
            ease: "power2.in"
        });
});

// 4. TIMELINE-BASED ANIMATION: EXPLODED SCHEMATIC VIEW (With Scrubbing Support)
let explodedTimeline = null;
function createExplodedTimeline() {
    if (explodedTimeline) explodedTimeline.kill();

    explodedTimeline = gsap.timeline({
        paused: true,
        onUpdate: () => {
            const progress = explodedTimeline.progress();
            const slider = document.getElementById("timeline-slider");
            const valLabel = document.getElementById("scrub-time-val");
            if (slider) slider.value = progress;
            if (valLabel) valLabel.textContent = `${(progress * 2.0).toFixed(2)}s`;
        }
    });

    if (partScope) {
        explodedTimeline.to(partScope.position, { y: partScope.position.y + 0.25, duration: 1.0, ease: "power2.inOut" }, 0);
    }
    if (partBoltA) {
        explodedTimeline.to(partBoltA.position, { x: partBoltA.position.x - 0.16, duration: 1.0, ease: "power2.inOut" }, 0);
    }
    if (partBoltB) {
        explodedTimeline.to(partBoltB.position, { x: partBoltB.position.x - 0.16, duration: 1.0, ease: "power2.inOut" }, 0);
    }
    if (partWrap) {
        explodedTimeline.to(partWrap.position, { y: partWrap.position.y - 0.15, duration: 1.0, ease: "power2.inOut" }, 0);
    }
    if (partTrigger) {
        explodedTimeline.to(partTrigger.position, { y: partTrigger.position.y - 0.15, duration: 1.0, ease: "power2.inOut" }, 0);
    }
    if (partBullet) {
        explodedTimeline.to(partBullet.position, { x: partBullet.position.x + 0.15, y: partBullet.position.y - 0.2, duration: 1.0, ease: "power2.inOut" }, 0);
    }
}

let isExploded = false;
document.getElementById("btn-exploded-view")?.addEventListener("click", () => {
    if (!explodedTimeline) createExplodedTimeline();
    isExploded = !isExploded;
    hideAnnotationPin();

    if (isExploded) {
        setAnimState(AnimState.EXPLODED);
        explodedTimeline.play();
    } else {
        setAnimState(AnimState.IDLE);
        explodedTimeline.reverse();
    }
});

// Timeline Scrubber Slider input
document.getElementById("timeline-slider")?.addEventListener("input", (e) => {
    if (!explodedTimeline) createExplodedTimeline();
    const val = parseFloat(e.target.value);
    explodedTimeline.progress(val);
    hideAnnotationPin();
});

// 5. TURNTABLE ORBIT ANIMATION
let turntableTween = null;
document.getElementById("btn-turntable")?.addEventListener("click", () => {
    if (!gunModel) return;
    hideAnnotationPin();

    if (turntableTween && turntableTween.isActive()) {
        turntableTween.kill();
        turntableTween = null;
        setAnimState(AnimState.IDLE);
    } else {
        setAnimState(AnimState.TURNTABLE);
        turntableTween = gsap.to(gunModel.rotation, {
            y: "+=" + (Math.PI * 2),
            duration: 6.0,
            repeat: -1,
            ease: "none"
        });
    }
});

// 6. RESET VIEW ACTION
document.getElementById("btn-reset-view")?.addEventListener("click", () => {
    hideAnnotationPin();
    if (turntableTween) {
        turntableTween.kill();
        turntableTween = null;
    }
    if (explodedTimeline) {
        explodedTimeline.progress(0);
        isExploded = false;
    }

    setAnimState(AnimState.IDLE);

    // Reset part transforms
    partDefaultTransforms.forEach((trans, part) => {
        part.position.copy(trans.position);
        part.rotation.copy(trans.rotation);
        part.scale.copy(trans.scale);
    });

    if (gunModel) {
        gsap.to(gunModel.position, { x: 0, y: 0.3, z: 0, duration: 1.0, ease: "power2.out" });
        gsap.to(gunModel.rotation, { x: 0, y: 0, z: 0, duration: 1.0, ease: "power2.out" });
        gsap.to(gunModel.scale, { x: 1, y: 1, z: 1, duration: 1.0, ease: "power2.out" });
    }

    animateCameraTo(
        { x: 0, y: 0.3, z: getCameraDistance() },
        { x: 0, y: 0.3, z: 0 },
        1.0
    );
});

// 7. SCROLL-BASED ANIMATION (Tied to right storyboard cards container)
const scrollContainer = document.getElementById("scroll-container");
if (scrollContainer) {
    scrollContainer.addEventListener("scroll", () => {
        const scrollTop = scrollContainer.scrollTop;
        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        if (maxScroll <= 0) return;

        const scrollRatio = THREE.MathUtils.clamp(scrollTop / maxScroll, 0, 1);

        // Stage 1 (0.0 -> 0.4): Rotate Gun to profile view
        // Stage 2 (0.4 -> 0.7): Part expansion / Exploded separation
        // Stage 3 (0.7 -> 1.0): Aim Down Sight towards Target
        if (gunModel && currentAnimState !== AnimState.RELOADING && currentAnimState !== AnimState.FIRING) {
            if (scrollRatio < 0.4) {
                const subT = scrollRatio / 0.4;
                gunModel.rotation.y = THREE.MathUtils.lerp(0, Math.PI * 0.4, subT);
                camera.position.set(0, 0.3, THREE.MathUtils.lerp(getCameraDistance(), 1.4, subT));
            } else if (scrollRatio < 0.75) {
                const subT = (scrollRatio - 0.4) / 0.35;
                if (!explodedTimeline) createExplodedTimeline();
                explodedTimeline.progress(subT);
            } else {
                const subT = (scrollRatio - 0.75) / 0.25;
                // Aim Down Sight: align gun barrel with dartboard target at back wall
                gunModel.rotation.y = THREE.MathUtils.lerp(Math.PI * 0.4, -Math.PI / 2, subT);
                camera.position.set(
                    THREE.MathUtils.lerp(0, 0.05, subT),
                    THREE.MathUtils.lerp(0.3, 0.42, subT),
                    THREE.MathUtils.lerp(1.4, 0.8, subT)
                );
            }
        }
    });
}

// Resize handler to keep canvas and NDC coordinates accurate
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.position.z = getCameraDistance();
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    updateAnnotationPinScreenPos();
});

// CLOCK TIMING: Animation Timing via THREE.Clock for frame-rate independence
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate)

    // Uniform delta time progression across any monitor refresh rate
    const delta = clock.getDelta();

    if (gunModel) {
        // WASD Position Movement & Dragging with Movement Boundaries
        const moveSpeed = 1.8 * delta; // Frame-rate independent speed in meters/second
        if (keysPressed["w"]) gunModel.position.z -= moveSpeed;
        if (keysPressed["s"]) gunModel.position.z += moveSpeed;
        if (keysPressed["a"]) gunModel.position.x -= moveSpeed;
        if (keysPressed["d"]) gunModel.position.x += moveSpeed;
        if (keysPressed["q"]) gunModel.position.y += moveSpeed;
        if (keysPressed["e"]) gunModel.position.y -= moveSpeed;

        // Apply Movement Boundaries (clamping)
        gunModel.position.x = THREE.MathUtils.clamp(gunModel.position.x, MOVEMENT_BOUNDS.minX, MOVEMENT_BOUNDS.maxX);
        gunModel.position.y = THREE.MathUtils.clamp(gunModel.position.y, MOVEMENT_BOUNDS.minY, MOVEMENT_BOUNDS.maxY);
        gunModel.position.z = THREE.MathUtils.clamp(gunModel.position.z, MOVEMENT_BOUNDS.minZ, MOVEMENT_BOUNDS.maxZ);

        // Smooth inertia deceleration for gun rotation when dragging stops (Y-axis only)
        if (!isDragging && !isGizmoDragging && currentAnimState !== AnimState.TURNTABLE) {
            gunModel.rotation.y += gunRotationVelocity.y;
            gunRotationVelocity.y *= 0.92;
        }
    }

    // Keep projected 3D annotations updated with camera & object movements
    if (activeAnnotationObject || activeAnnotationTarget) {
        updateAnnotationPinScreenPos();
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();