import * as THREE from 'three';
import { WATCH_CONFIG } from '../config/watchConfig.js';

export class Environment {
    constructor(scene, renderer, cornerShadowTexture) {
        this.scene = scene;
        this.renderer = renderer;
        this.cornerShadowTexture = cornerShadowTexture;

        this._setupPMREMEnvironment();
        this._setupStudioStage();
    }

    _setupPMREMEnvironment() {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        const envScene = new THREE.Scene();
        envScene.background = new THREE.Color(0x1a1a1f);

        const softboxGeo = new THREE.PlaneGeometry(6, 6);
        const softboxMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

        // Key softbox
        const sb1 = new THREE.Mesh(softboxGeo, softboxMat);
        sb1.position.set(4, 5, 4);
        sb1.lookAt(0, 0, 0);
        envScene.add(sb1);

        // Fill softbox
        const sb2 = new THREE.Mesh(softboxGeo, softboxMat);
        sb2.position.set(-4, 3, 2);
        sb2.lookAt(0, 0, 0);
        envScene.add(sb2);

        // Rim strip softbox
        const stripGeo = new THREE.PlaneGeometry(2, 8);
        const sb3 = new THREE.Mesh(stripGeo, softboxMat);
        sb3.position.set(0, 3, -5);
        sb3.lookAt(0, 0, 0);
        envScene.add(sb3);

        // Warm bounce panel from bottom
        const floorBounce = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10),
            new THREE.MeshBasicMaterial({ color: 0xe8c8a8, side: THREE.DoubleSide })
        );
        floorBounce.rotation.x = Math.PI / 2;
        floorBounce.position.y = -3;
        envScene.add(floorBounce);

        const renderTarget = pmremGenerator.fromScene(envScene, 0.04);
        pmremGenerator.dispose();
        this.scene.environment = renderTarget.texture;
    }

    _setupStudioStage() {
        const { floorSize, floorY, wallZ, wallHeight } = WATCH_CONFIG.stage;
        const textureLoader = new THREE.TextureLoader();

        // Wall textures
        this.wallColorTex = textureLoader.load('./textures/wall/others_0031_color_dark_orange.jpg');
        this.wallColorTex.colorSpace = THREE.SRGBColorSpace;
        this.wallColorTex.wrapS = this.wallColorTex.wrapT = THREE.RepeatWrapping;
        this.wallColorTex.repeat.set(6, 2.4);

        this.wallRoughnessTex = textureLoader.load('./textures/wall/others_0031_roughness_2k.jpg');
        this.wallRoughnessTex.wrapS = this.wallRoughnessTex.wrapT = THREE.RepeatWrapping;
        this.wallRoughnessTex.repeat.set(6, 2.4);

        this.wallNormalTex = textureLoader.load('./textures/wall/others_0031_normal_opengl_2k.png');
        this.wallNormalTex.wrapS = this.wallNormalTex.wrapT = THREE.RepeatWrapping;
        this.wallNormalTex.repeat.set(6, 2.4);

        this.wallAoTex = textureLoader.load('./textures/wall/others_0031_ao_2k.jpg');
        this.wallAoTex.wrapS = this.wallAoTex.wrapT = THREE.RepeatWrapping;
        this.wallAoTex.repeat.set(6, 2.4);

        const studioWallMat = new THREE.MeshStandardMaterial({
            map: this.wallColorTex,
            normalMap: this.wallNormalTex,
            normalScale: new THREE.Vector2(1.2, 1.2),
            roughnessMap: this.wallRoughnessTex,
            aoMap: this.wallAoTex,
            aoMapIntensity: 1.0,
            roughness: 0.85,
            metalness: 0.05,
        });

        const studioFloorMat = new THREE.MeshPhysicalMaterial({
            color: '#fc5a03',
            roughness: 0,
            metalness: 0.15,
            clearcoat: 1.0,
            clearcoatRoughness: 0.08,
            envMapIntensity: 0,
            reflectivity: 0.9,
        });

        // 1. Ground floor plane
        const groundFloorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
        groundFloorGeo.attributes.uv2 = groundFloorGeo.attributes.uv;
        const groundFloor = new THREE.Mesh(groundFloorGeo, studioFloorMat);
        groundFloor.rotation.x = -Math.PI / 2;
        groundFloor.position.set(0, floorY, wallZ + floorSize / 2);
        groundFloor.receiveShadow = true;
        this.scene.add(groundFloor);

        // 2. Background wall plane
        const backWallGeo = new THREE.PlaneGeometry(floorSize, wallHeight);
        backWallGeo.attributes.uv2 = backWallGeo.attributes.uv;
        const backWall = new THREE.Mesh(backWallGeo, studioWallMat);
        backWall.position.set(0, floorY + wallHeight / 2, wallZ);
        backWall.receiveShadow = true;
        this.scene.add(backWall);

        // 3. Ambient occlusion contact shadow strips
        const wallBaseShadow = new THREE.Mesh(
            new THREE.PlaneGeometry(floorSize, 1.4),
            new THREE.MeshBasicMaterial({
                map: this.cornerShadowTexture,
                transparent: true,
                opacity: 0.85,
                depthWrite: false,
            })
        );
        wallBaseShadow.position.set(0, floorY + 0.7, wallZ + 0.01);
        this.scene.add(wallBaseShadow);

        const floorBaseShadow = new THREE.Mesh(
            new THREE.PlaneGeometry(floorSize, 1.4),
            new THREE.MeshBasicMaterial({
                map: this.cornerShadowTexture,
                transparent: true,
                opacity: 0.75,
                depthWrite: false,
            })
        );
        floorBaseShadow.rotation.x = -Math.PI / 2;
        floorBaseShadow.position.set(0, floorY + 0.005, wallZ + 0.7);
        this.scene.add(floorBaseShadow);

        // 4. Pedestal stand
        const stage = new THREE.Mesh(
            new THREE.CylinderGeometry(1.6, 1.7, 0.08, 64),
            new THREE.MeshStandardMaterial({ color: 0x222228, roughness: 0.3, metalness: 0.6 })
        );
        stage.position.y = -2.06;
        stage.receiveShadow = true;
        this.scene.add(stage);
    }

    update(elapsed) {
        // Smooth subtle drift of the wall texture
        const wallSpeed = 0.2;
        const wallOffset = (elapsed * wallSpeed) % 1;
        if (this.wallColorTex) this.wallColorTex.offset.x = wallOffset;
        if (this.wallRoughnessTex) this.wallRoughnessTex.offset.x = wallOffset;
        if (this.wallNormalTex) this.wallNormalTex.offset.x = wallOffset;
        if (this.wallAoTex) this.wallAoTex.offset.x = wallOffset;
    }
}
