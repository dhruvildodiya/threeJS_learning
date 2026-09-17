import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { color } from "three/src/nodes/tsl/TSLCore.js";

const sizes = {
    height: window.innerHeight,
    width: window.innerWidth
}

const canvas = document.getElementById("webgl-canvas");

const scene = new THREE.Scene()
scene.background = new THREE.Color("wheat");

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

const loader = new GLTFLoader()
loader.load(
    './models/gun4k/gun4k.gltf',
    (gltf) => {
        gunModel = gltf.scene;
        scene.add(gunModel);

        gltf.scene.position.y = 0.3

        const bolt1 = gltf.scene.getObjectByName("bolt_action_rifle_7_62_bolt_a")
        if (bolt1) {
            const oldTexture = bolt1.material.map;
            const oldNormal = bolt1.material.normalMap;
            bolt1.material = new THREE.MeshStandardMaterial({
                map: oldTexture,
                normalMap: oldNormal,
                roughness: 0,
                metalness: 0.9,
            });
        }

        const bolt2 = gltf.scene.getObjectByName("bolt_action_rifle_7_62_bolt_b")
        if (bolt2) {
            const oldTexture = bolt2.material.map;
            const oldNormal = bolt2.material.normalMap;
            bolt2.material = new THREE.MeshStandardMaterial({
                map: oldTexture,
                normalMap: oldNormal,
                roughness: 0,
                metalness: 0.9,
            });
        }

        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                console.log(child.name)

                // Do not overwrite bolt1 and bolt2 materials
                if (child.name !== "bolt_action_rifle_7_62_bolt_a" && child.name !== "bolt_action_rifle_7_62_bolt_b") {
                    const oldTexture = child.material.map;
                    const oldNormal = child.material.normalMap;

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
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 2048;
spotLight.shadow.mapSize.height = 2048;
spotLight.target.position.set(0, 0.3, 0); // Points straight at the gun
scene.add(spotLight);
scene.add(spotLight.target);

// ============================================================================
// PLANES FOR SHADOWS (Floor & Back Wall)
// ============================================================================
// 1. Bottom Floor Plane (Lies flat on ground)
const floorGeometry = new THREE.PlaneGeometry(10, 10);
const planeMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8dfc8, // Warm tone matching the wheat background
    roughness: 0.8,
    metalness: 0.1,
    color: "#FFDADA"
});

const floorPlane = new THREE.Mesh(floorGeometry, planeMaterial);
floorPlane.rotation.x = -Math.PI / 2; // Flat horizontal plane
floorPlane.position.y = -0.35;        // Placed right underneath the gun
floorPlane.receiveShadow = true;
scene.add(floorPlane);

// 2. Background Wall Plane (Behind the gun)
const wallGeometry = new THREE.PlaneGeometry(10, 6);
const wallPlane = new THREE.Mesh(wallGeometry, planeMaterial);
wallPlane.position.set(0, 1.5, -1.5); // Placed behind the gun
wallPlane.receiveShadow = true;
scene.add(wallPlane);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(sizes.width, sizes.height)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap


// ORBIT CONTROLS (Camera zoom & pan enabled, camera rotation disabled)
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.enableRotate = false
controls.minDistance = 0.01;
controls.maxDistance = 6;
controls.target.set(0, 0.3, 0);
// ============================================================================
// DIRECT GUN ROTATION VIA MOUSE DRAG (Only rotates the gun model!)
// ============================================================================
let isDragging = false;
let previousPointerPosition = { x: 0, y: 0 };
const gunRotationVelocity = { x: 0, y: 0 };

canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    previousPointerPosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener('pointerup', () => {
    isDragging = false;
});

window.addEventListener('pointermove', (e) => {
    if (!isDragging || !gunModel) return;

    const deltaX = e.clientX - previousPointerPosition.x;
    const deltaY = e.clientY - previousPointerPosition.y;

    // Direct rotation response
    gunModel.rotation.y += deltaX * 0.004;
    gunModel.rotation.x += deltaY * 0.004;

    // Store velocity for inertia damping
    gunRotationVelocity.y = deltaX * 0.001;
    gunRotationVelocity.x = deltaY * 0.001;

    previousPointerPosition = { x: e.clientX, y: e.clientY };
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
    // If a double-click was started, cancel any pending single-click color change
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

window.addEventListener('dblclick', (event) => {
    // Cancel single click color change immediately!
    if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
    }

    updatePointerCoordinates(event);

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(interactableObjects);

    if (intersects.length > 0 && gunModel && !isRecoiling) {
        isRecoiling = true;

        // 1. Remember the gun's current position and rotation before the recoil kick
        const currentPosition = gunModel.position.clone();
        const currentRotationX = gunModel.rotation.x;
        const currentRotationZ = gunModel.rotation.z;

        // 2. Local Recoil Kick:
        // translateX moves backward along the gun's own barrel/spine regardless of viewing angle
        gunModel.translateX(-0.04);
        gunModel.rotateZ(0.1); // Muzzle kick upward along the gun's own local orientation

        // 3. Smooth spring recovery back to the exact current orientation
        let progress = 0;
        const kickInterval = setInterval(() => {
            progress += 0.08;
            gunModel.position.lerp(currentPosition, 0.2);
            gunModel.rotation.x = THREE.MathUtils.lerp(gunModel.rotation.x, currentRotationX, 0.2);
            gunModel.rotation.z = THREE.MathUtils.lerp(gunModel.rotation.z, currentRotationZ, 0.2);

            if (progress >= 1.0) {
                gunModel.position.copy(currentPosition);
                gunModel.rotation.x = currentRotationX;
                gunModel.rotation.z = currentRotationZ;
                isRecoiling = false;
                clearInterval(kickInterval);
            }
        }, 16);

        console.log('💥 Recoil kick on ENTIRE gun model!');
    } else if (intersects.length === 0) {
        // Double click background: Reset all meshes back to default color and camera
        interactableObjects.forEach((mesh) => {
            mesh.material.color.set('rgba(250, 123, 80, 1)');
            mesh.material.wireframe = false;
            mesh.material.emissive?.set(0x000000);
        });
        if (gunModel) {
            gunModel.position.copy(gunInitialPosition);
            gunModel.rotation.set(0, 0, 0);
        }
        camera.position.set(0, 0.3, 1);
        controls.target.set(0, 0.3, 0);
        controls.update();
        console.log('🔄 Scene & Camera Reset');
    }
});

// Resize handler to keep canvas and NDC coordinates accurate
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.position.z = getCameraDistance();
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

function animate() {
    requestAnimationFrame(animate)

    // Smooth inertia deceleration for gun rotation when dragging stops
    if (!isDragging && gunModel) {
        gunModel.rotation.y += gunRotationVelocity.y;
        gunModel.rotation.x += gunRotationVelocity.x;
        gunRotationVelocity.y *= 0.92;
        gunRotationVelocity.x *= 0.92;
    }

    controls.update()
    renderer.render(scene, camera)
}
animate()