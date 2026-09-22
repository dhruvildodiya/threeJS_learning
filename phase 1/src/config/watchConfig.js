import * as THREE from 'three';

export const WATCH_CONFIG = {
    dimensions: {
        caseRadius: 0.62,
        caseDepth: 0.24,
        strapLinks: 6,
    },
    colorways: {
        steel: { case: 0xd8dce4, bezel: 0xe8ecf4, crown: 0xdce0e8, strap: 0x1c1c1f },
        onyx: { case: 0x222228, bezel: 0x33333d, crown: 0x33333d, strap: 0x0c0c0e },
        gold: { case: 0xe0b870, bezel: 0xf5d088, crown: 0xebd084, strap: 0x3a2418 },
    },
    stage: {
        floorSize: 40,
        floorY: -2.1,
        wallZ: -8.0,
        wallHeight: 22,
    },
    explodedOffsets: {
        rest: {
            caseBack: new THREE.Vector3(0, 0, 0),
            bezel: new THREE.Vector3(0, 0, 0),
            dial: new THREE.Vector3(0, 0, 0.24 / 2 - 0.03),
            movement: new THREE.Vector3(0, 0, -0.02),
            crown: new THREE.Vector3(0, 0, 0),
            strapTop: new THREE.Vector3(0, 0, 0),
            strapBottom: new THREE.Vector3(0, 0, 0),
        },
        exploded: {
            caseBack: new THREE.Vector3(0, 0, -0.5),
            bezel: new THREE.Vector3(0, 0, 0.55),
            dial: new THREE.Vector3(0, 0, 0.18),
            movement: new THREE.Vector3(0, 0, -0.22),
            crown: new THREE.Vector3(0.35, 0, 0),
            strapTop: new THREE.Vector3(0, 0.35, 0),
            strapBottom: new THREE.Vector3(0, -0.35, 0),
        },
    },
    baseLights: {
        ambient: 0.5,
        key: 2.4,
        fill: 0.7,
        rim: 1.1,
        spot: 0.5,
    },
};
