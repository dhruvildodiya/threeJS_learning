import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * ============================================================================
 * THREE.JS TASK 10: RAYCASTING & 3D USER INTERACTION MASTERCLASS
 * ============================================================================
 * 
 * Core Topics Covered:
 * 1. What is Raycasting? (Shooting an invisible mathematical ray from 2D screen into 3D world)
 * 2. Normalized Device Coordinates (NDC: x in [-1, 1], y in [-1, 1])
 * 3. THREE.Raycaster & Camera Projection (raycaster.setFromCamera(mouse, camera))
 * 4. Intersection Testing (raycaster.intersectObjects(objectsArray))
 * 5. Intersection Payload:
 *    - intersection.object   (The 3D mesh clicked or hovered)
 *    - intersection.point    (Exact 3D coordinates [X, Y, Z] of impact)
 *    - intersection.distance (Distance in units from camera lens to impact surface)
 *    - intersection.face     (Hit polygon vertex normal & face index)
 * 6. Hover Detection & Dynamic Highlight
 * 7. Click Detection & Selection Feedback
 * ============================================================================
 */

// ============================================================================
// 1. CANVAS, SIZES & SCENE SETUP
// ============================================================================
const canvas = document.querySelector('#webgl-canvas');
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e1a);
scene.fog = new THREE.FogExp2(0x0a0e1a, 0.02);

// ============================================================================
// 2. CAMERA & ORBIT CONTROLS
// ============================================================================
const camera = new THREE.PerspectiveCamera(
    45,
    sizes.width / sizes.height,
    0.1,
    100
);
camera.position.set(0, 4.5, 11);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0.5, 0);
controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent camera from going below the ground plane

// ============================================================================
// 3. RENDERER WITH TONE MAPPING & SHADOWS
// ============================================================================
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ============================================================================
// 4. LIGHTING SYSTEM
// ============================================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Key Directional Light casting shadows
const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
dirLight.position.set(6, 10, 7);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 30;
dirLight.shadow.camera.left = -9;
dirLight.shadow.camera.right = 9;
dirLight.shadow.camera.top = 9;
dirLight.shadow.camera.bottom = -9;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

// Cool Cyan/Blue Rim Light from behind
const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
rimLight.position.set(-6, 4, -6);
scene.add(rimLight);

// ============================================================================
// 5. ENVIRONMENT: STUDIO FLOOR & GRID
// ============================================================================
const floorGeo = new THREE.PlaneGeometry(28, 28);
const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.4,
    metalness: 0.6
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.0;
floor.receiveShadow = true;
scene.add(floor);

const gridHelper = new THREE.GridHelper(28, 28, 0x38bdf8, 0x1e293b);
gridHelper.position.y = -0.99;
scene.add(gridHelper);

// ============================================================================
// 6. INTERACTIVE 3D OBJECTS GALLERY
// ============================================================================
// Array of interactive meshes tested during raycasting
const interactiveObjects = [];

// Helper function to create pedestals
function createPedestal(x, colorHex) {
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 1.0, 0.2, 32),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.4 })
    );
    base.position.set(x, -0.9, 0);
    base.receiveShadow = true;
    scene.add(base);

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.92, 0.02, 16, 48),
        new THREE.MeshBasicMaterial({ color: colorHex })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, -0.8, 0);
    scene.add(ring);
}

// Data definition for the 5 interactive showcase objects
const objectsData = [
    {
        name: 'Crystal Box',
        x: -4.8,
        color: 0x38bdf8,
        emissiveColor: 0x0284c7,
        geometry: new THREE.BoxGeometry(1.2, 1.2, 1.2),
        type: 'Cube (BoxGeometry)'
    },
    {
        name: 'Emerald Sphere',
        x: -2.4,
        color: 0x22c55e,
        emissiveColor: 0x15803d,
        geometry: new THREE.SphereGeometry(0.7, 32, 32),
        type: 'Sphere (SphereGeometry)'
    },
    {
        name: 'Solar Torus Knot',
        x: 0,
        color: 0xf59e0b,
        emissiveColor: 0xd97706,
        geometry: new THREE.TorusKnotGeometry(0.55, 0.18, 100, 16),
        type: 'Torus Knot (TorusKnotGeometry)'
    },
    {
        name: 'Amethyst Cone',
        x: 2.4,
        color: 0xa855f7,
        emissiveColor: 0x7e22ce,
        geometry: new THREE.ConeGeometry(0.7, 1.3, 32),
        type: 'Cone (ConeGeometry)'
    },
    {
        name: 'Ruby Cylinder',
        x: 4.8,
        color: 0xef4444,
        emissiveColor: 0xb91c1c,
        geometry: new THREE.CylinderGeometry(0.55, 0.55, 1.2, 32),
        type: 'Cylinder (CylinderGeometry)'
    }
];

// Create and register each mesh
objectsData.forEach((data) => {
    createPedestal(data.x, data.color);

    const material = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.2,
        metalness: 0.75,
        emissive: 0x000000,
        emissiveIntensity: 0.0
    });

    const mesh = new THREE.Mesh(data.geometry, material);
    mesh.position.set(data.x, 0.3, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Attach custom metadata to the mesh for information display
    mesh.userData = {
        name: data.name,
        type: data.type,
        baseColor: data.color,
        emissiveColor: data.emissiveColor,
        baseX: data.x,
        targetX: data.x,
        baseY: 0.3,
        targetY: 0.3,
        baseZ: 0,
        targetZ: 0,
        baseScale: 1.0,
        targetScale: 1.0,
        isSelected: false,
        spinSpeed: 0.5
    };

    scene.add(mesh);
    interactiveObjects.push(mesh);
});

// Selection Halo Ring (moves to currently clicked/selected object)
const selectionRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.03, 16, 64),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
);
selectionRing.rotation.x = Math.PI / 2;
selectionRing.position.set(0, -0.75, 0);
selectionRing.visible = false;
scene.add(selectionRing);

// Raycast Hit Point Marker (shows exact 3D coordinates where the ray hits the object surface)
const hitMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
);
hitMarker.visible = false;
scene.add(hitMarker);

// ============================================================================
// 7. HTML INFORMATION HUD OVERLAY
// ============================================================================
const infoOverlay = document.createElement('div');
infoOverlay.id = 'raycast-hud';
infoOverlay.innerHTML = `
    <div style="position: fixed; top: 20px; left: 20px; z-index: 1000; max-width: 360px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; padding: 18px 20px; color: #f8fafc; font-family: 'Outfit', sans-serif; box-shadow: 0 12px 36px rgba(0,0,0,0.5); pointer-events: none;">
        <div style="display: inline-block; background: linear-gradient(135deg, #38bdf8, #818cf8); color: #0f172a; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 3px 8px; border-radius: 20px; margin-bottom: 8px;">Phase 1 • Task 10</div>
        <h2 style="font-size: 16px; font-weight: 700; margin: 0 0 4px 0; color: #ffffff;">Raycasting & Interaction</h2>
        <p style="font-size: 12px; color: #94a3b8; margin: 0 0 12px 0;">Hover to glow, click to spin, or drag objects around in 3D.</p>

        <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-family: 'JetBrains Mono', monospace; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Target:</span>
                <strong id="hud-name" style="color: #38bdf8;">None (Hover an object)</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Distance:</span>
                <span id="hud-dist" style="color: #f1f5f9;">-- m</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Hit Point:</span>
                <span id="hud-point" style="color: #f1f5f9;">[--, --, --]</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Face Index:</span>
                <span id="hud-face" style="color: #f1f5f9;">--</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Status:</span>
                <span id="hud-status" style="color: #94a3b8;">Idle</span>
            </div>
        </div>
    </div>
`;
document.body.appendChild(infoOverlay);

// HUD Elements references
const hudName = document.querySelector('#hud-name');
const hudDist = document.querySelector('#hud-dist');
const hudPoint = document.querySelector('#hud-point');
const hudFace = document.querySelector('#hud-face');
const hudStatus = document.querySelector('#hud-status');

// ============================================================================
// 8. RAYCASTER & INTERACTION LOGIC
// ============================================================================
/**
 * 1. Raycaster: Casts an invisible line through the 3D scene.
 * 2. Mouse (Vector2): Stores mouse coordinates in Normalized Device Coordinates (NDC) [-1, 1].
 */
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-1000, -1000); // Default off-screen

let hoveredObject = null;
let selectedObject = null;

// Dragging State & Helpers
const dragPlane = new THREE.Plane();
const planeIntersection = new THREE.Vector3();
const dragOffset = new THREE.Vector3();
let draggedObject = null;
let isDragging = false;
let pointerDownPos = { x: 0, y: 0 };

function resetObjectVisuals(mesh) {
    if (!mesh) return;
    mesh.userData.targetScale = mesh.userData.baseScale;
    mesh.userData.targetY = mesh.userData.baseY;
    mesh.material.emissive.setHex(0x000000);
    mesh.material.emissiveIntensity = 0.0;
}

function handleObjectSelect(mesh) {
    if (selectedObject && selectedObject !== mesh) {
        resetObjectVisuals(selectedObject);
    }

    selectedObject = mesh;
    
    // Visual Selection Ring Feedback
    selectionRing.position.x = selectedObject.position.x;
    selectionRing.position.z = selectedObject.position.z;
    selectionRing.visible = true;

    // Trigger interactive jump & spin impulse
    selectedObject.userData.targetY = selectedObject.position.y + 0.6;
    selectedObject.userData.spinSpeed = 6.0; // Temporary high-speed spin burst

    hudStatus.innerHTML = `<span style="color: #22c55e; font-weight: 700;">Selected!</span>`;
}

// ----------------------------------------------------------------------------
// A. POINTER DOWN (START DRAG OR CLICK - TOUCH & MOUSE COMPATIBLE)
// ----------------------------------------------------------------------------
window.addEventListener('pointerdown', (event) => {
    // 1. Immediately update Normalized Device Coordinates (NDC) for touch/mouse
    mouse.x = (event.clientX / sizes.width) * 2 - 1;
    mouse.y = -(event.clientY / sizes.height) * 2 + 1;

    pointerDownPos.x = event.clientX;
    pointerDownPos.y = event.clientY;

    // 2. Perform immediate raycast (crucial for mobile where touch starts without prior hover)
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects, false);
    if (intersects.length > 0) {
        hoveredObject = intersects[0].object;
    }

    if (hoveredObject) {
        draggedObject = hoveredObject;
        isDragging = true;
        controls.enabled = false; // Disable OrbitControls while dragging

        // Create drag plane facing camera positioned at the object's position
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        dragPlane.setFromNormalAndCoplanarPoint(cameraDir.negate(), draggedObject.position);

        // Calculate offset between hit point and object position
        if (raycaster.ray.intersectPlane(dragPlane, planeIntersection)) {
            dragOffset.copy(draggedObject.position).sub(planeIntersection);
        }
    }
});

// ----------------------------------------------------------------------------
// B. POINTER MOVE (HOVER DETECTION & DRAG UPDATE)
// ----------------------------------------------------------------------------
window.addEventListener('pointermove', (event) => {
    /**
     * Convert 2D pixel coordinates (clientX, clientY) into Normalized Device Coordinates (NDC):
     * X: 0 (left) -> window.innerWidth (right)  =>  -1.0 (left) to +1.0 (right)
     * Y: 0 (top)  -> window.innerHeight (bottom) =>  +1.0 (top) to -1.0 (bottom) [Y is inverted in WebGL]
     */
    mouse.x = (event.clientX / sizes.width) * 2 - 1;
    mouse.y = -(event.clientY / sizes.height) * 2 + 1;

    // If dragging an object, update its target position in 3D world space
    if (isDragging && draggedObject) {
        raycaster.setFromCamera(mouse, camera);
        if (raycaster.ray.intersectPlane(dragPlane, planeIntersection)) {
            const newPos = planeIntersection.clone().add(dragOffset);
            draggedObject.userData.targetX = newPos.x;
            // Prevent the object from dipping below the floor / base plane (floor is at y = -1.0)
            draggedObject.userData.targetY = Math.max(newPos.y, -0.3);
            draggedObject.userData.targetZ = newPos.z;

            hudStatus.innerHTML = `<span style="color: #fbbf24; font-weight: 700;">Dragging</span>`;
        }
    }
});

// ----------------------------------------------------------------------------
// C. POINTER UP (END DRAG OR CONFIRM CLICK)
// ----------------------------------------------------------------------------
window.addEventListener('pointerup', (event) => {
    const distMoved = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);

    if (isDragging) {
        isDragging = false;
        controls.enabled = true; // Re-enable camera OrbitControls

        if (draggedObject) {
            // If pointer barely moved, treat it as a click/tap
            if (distMoved < 6) {
                handleObjectSelect(draggedObject);
            } else {
                // Drag completed: update object's resting base position to its new position in space
                draggedObject.userData.baseX = draggedObject.userData.targetX;
                draggedObject.userData.baseY = draggedObject.userData.targetY;
                draggedObject.userData.baseZ = draggedObject.userData.targetZ;
            }
        }
        draggedObject = null;
    } else if (distMoved < 6 && !hoveredObject) {
        // Clicked on empty space -> Deselect & reset previously selected object
        if (selectedObject) {
            resetObjectVisuals(selectedObject);
        }
        selectedObject = null;
        selectionRing.visible = false;
        hudStatus.innerHTML = `<span style="color: #94a3b8;">Idle</span>`;
    }
});

// ----------------------------------------------------------------------------
// D. POINTER CANCEL / LEAVE (HANDLE TOUCH INTERRUPTION)
// ----------------------------------------------------------------------------
window.addEventListener('pointercancel', () => {
    isDragging = false;
    controls.enabled = true;
    draggedObject = null;
});

window.addEventListener('pointerleave', (event) => {
    // If not dragging and pointer left the window, reset off-screen
    if (!isDragging && event.pointerType === 'mouse') {
        mouse.set(-1000, -1000);
    }
});

// ============================================================================
// 9. ANIMATION & RENDER LOOP
// ============================================================================
const clock = new THREE.Clock();

const animate = () => {
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsedTime = clock.getElapsedTime();

    // ------------------------------------------------------------------------
    // 1. UPDATE RAYCASTER (Origin & Direction from Mouse & Camera)
    // ------------------------------------------------------------------------
    raycaster.setFromCamera(mouse, camera);

    /**
     * 2. INTERSECT OBJECTS
     * Checks which 3D objects in the array are intersected by the ray.
     * Returns an array sorted from closest (index 0) to farthest.
     */
    const intersects = raycaster.intersectObjects(interactiveObjects, false);

    // ------------------------------------------------------------------------
    // 3. HOVER DETECTION & HIGHLIGHTING
    // ------------------------------------------------------------------------
    if (intersects.length > 0 && !isDragging) {
        const topHit = intersects[0];
        const hitMesh = topHit.object;

        // If hovered over a new object
        if (hoveredObject !== hitMesh) {
            // Reset previous hovered object highlight if not selected
            if (hoveredObject && hoveredObject !== selectedObject) {
                resetObjectVisuals(hoveredObject);
            }

            hoveredObject = hitMesh;
            canvas.style.cursor = 'grab'; // Change mouse cursor to grab
        }

        // Apply Hover Highlight on current hit object
        hoveredObject.userData.targetScale = 1.12; // Scale up slightly on hover
        hoveredObject.userData.targetY = hoveredObject.userData.baseY + 0.2; // Hover lift
        hoveredObject.material.emissive.setHex(hoveredObject.userData.emissiveColor);
        hoveredObject.material.emissiveIntensity = 0.6;

        // Position hit marker at exact 3D surface point
        hitMarker.position.copy(topHit.point);
        hitMarker.visible = true;

        // Update Real-Time HUD with Raycast Payload
        hudName.textContent = hoveredObject.userData.name;
        hudName.style.color = `#${hoveredObject.userData.baseColor.toString(16).padStart(6, '0')}`;
        hudDist.textContent = `${topHit.distance.toFixed(2)} m`;
        hudPoint.textContent = `[${topHit.point.x.toFixed(2)}, ${topHit.point.y.toFixed(2)}, ${topHit.point.z.toFixed(2)}]`;
        hudFace.textContent = topHit.faceIndex !== undefined ? `#${topHit.faceIndex}` : 'N/A';
        if (!selectedObject || selectedObject !== hoveredObject) {
            hudStatus.innerHTML = `<span style="color: #38bdf8;">Hovering</span>`;
        }
    } else if (!isDragging) {
        // No object intersected (Mouse is over empty background)
        if (hoveredObject) {
            if (hoveredObject !== selectedObject) {
                resetObjectVisuals(hoveredObject);
            } else {
                // If it was selected, lower it back down from hover height to its base position
                hoveredObject.userData.targetY = hoveredObject.userData.baseY;
                hoveredObject.userData.targetScale = hoveredObject.userData.baseScale;
            }
            hoveredObject = null;
            canvas.style.cursor = 'default';
            hitMarker.visible = false;

            if (!selectedObject) {
                hudName.textContent = 'None (Hover an object)';
                hudName.style.color = '#94a3b8';
                hudDist.textContent = '-- m';
                hudPoint.textContent = '[--, --, --]';
                hudFace.textContent = '--';
                hudStatus.innerHTML = `<span style="color: #94a3b8;">Idle</span>`;
            }
        }
    }

    // ------------------------------------------------------------------------
    // 4. ANIMATE OBJECTS (Positions, Rotations, Smooth Lerping & Selection Halo)
    // ------------------------------------------------------------------------
    interactiveObjects.forEach((mesh) => {
        // Smoothly interpolate position (X, Y, Z) towards target values
        mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, mesh.userData.targetX, delta * 10.0);
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, mesh.userData.targetY, delta * 10.0);
        mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, mesh.userData.targetZ, delta * 10.0);
        
        // Settle jump back to base position after click impulse
        if (!isDragging && mesh.userData.spinSpeed > 1.5 && mesh.position.y > mesh.userData.baseY + 0.3) {
            mesh.userData.targetY = mesh.userData.baseY;
        }

        const currentScale = THREE.MathUtils.lerp(mesh.scale.x, mesh.userData.targetScale, delta * 8.0);
        mesh.scale.set(currentScale, currentScale, currentScale);

        // Continuous idle rotation + decay click spin impulse
        mesh.rotation.y += mesh.userData.spinSpeed * delta;
        mesh.userData.spinSpeed = THREE.MathUtils.lerp(mesh.userData.spinSpeed, 0.5, delta * 3.0);
    });

    // Spin selection halo ring and follow selected object in 3D space
    if (selectionRing.visible && selectedObject) {
        selectionRing.position.set(
            selectedObject.position.x,
            selectedObject.position.y - 0.75,
            selectedObject.position.z
        );
        selectionRing.rotation.z = elapsedTime * 2.0;
    }

    // ------------------------------------------------------------------------
    // 5. UPDATE CONTROLS & RENDER SCENE
    // ------------------------------------------------------------------------
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
};

animate();

// ============================================================================
// 10. RESIZE LISTENER
// ============================================================================
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
