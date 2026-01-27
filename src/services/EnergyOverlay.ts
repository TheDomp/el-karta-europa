/// <reference types="google.maps" />
import * as THREE from 'three';
import { getStressColor, calculateGridStress } from '../utils/GridStress';

// Assuming EnergyData shape or simpler interface
export interface ZoneStatus {
    id: string;
    price: number;
    load: number;
}

// Factory function to create the class when google.maps is available
export const createEnergyOverlayClass = (googleMaps: typeof google.maps) => {
    return class EnergyOverlay extends googleMaps.WebGLOverlayView {
        private scene: THREE.Scene;
        private camera: THREE.PerspectiveCamera;
        private renderer: THREE.WebGLRenderer | null = null;
        private geoJson: any;
        private zoneData: ZoneStatus[];
        private meshes: Map<string, THREE.Mesh> = new Map();

        constructor(geoJson: any, initialData: ZoneStatus[]) {
            super();
            this.geoJson = geoJson;
            this.zoneData = initialData;
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera();

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
            this.scene.add(ambientLight);

            const pointLight = new THREE.PointLight(0xffffff, 1.5);
            pointLight.position.set(20, 100, 100);
            this.scene.add(pointLight);

            const spotLight = new THREE.SpotLight(0x3b82f6, 5);
            spotLight.position.set(-50, 50, 50);
            this.scene.add(spotLight);
        }

        onAdd() {
            this.create3DObjects();
        }

        onContextRestored({ gl }: { gl: WebGLRenderingContext }) {
            this.renderer = new THREE.WebGLRenderer({
                canvas: gl.canvas,
                context: gl,
                ...gl.getContextAttributes(),
                antialias: true,
                alpha: true
            });
            this.renderer.autoClear = false;
            this.renderer.toneMapping = THREE.ReinhardToneMapping;
            this.renderer.toneMappingExposure = 1.2;
        }

        onDraw(options: google.maps.WebGLDrawOptions) {
            const matrix = options.transformer.fromLatLngAltitude({
                lat: 62.0,
                lng: 16.0,
                altitude: 0,
            });

            this.camera.projectionMatrix.fromArray(matrix);

            this.renderer?.resetState();
            this.renderer?.render(this.scene, this.camera);
        }

        updateData(newData: ZoneStatus[]) {
            this.zoneData = newData;
            this.updateMeshes();
            this.requestRedraw();
        }

        private create3DObjects() {
            this.meshes.forEach(mesh => this.scene.remove(mesh));
            this.meshes.clear();

            this.geoJson.features.forEach((feature: any) => {
                const coords = feature.geometry.coordinates[0];
                const shape = new THREE.Shape();

                coords.forEach((coord: number[], index: number) => {
                    const [lng, lat] = coord;
                    if (index === 0) shape.moveTo(lng, lat);
                    else shape.lineTo(lng, lat);
                });

                const extrudeSettings = {
                    steps: 1,
                    depth: 0.05,
                    bevelEnabled: true,
                    bevelThickness: 0.02,
                    bevelSize: 0.02,
                    bevelOffset: 0,
                    bevelSegments: 3
                };

                const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                const material = new THREE.MeshStandardMaterial({
                    color: 0x222222,
                    transparent: true,
                    opacity: 0.9,
                    metalness: 0.8,
                    roughness: 0.2,
                    emissive: 0x000000,
                    emissiveIntensity: 0.5
                });

                const mesh = new THREE.Mesh(geometry, material);
                this.scene.add(mesh);
                this.meshes.set(feature.id, mesh);
            });

            this.updateMeshes();
        }

        private updateMeshes() {
            this.zoneData.forEach(zone => {
                const mesh = this.meshes.get(zone.id);
                if (mesh) {
                    const { index, level } = calculateGridStress(zone.price, zone.load);
                    const color = getStressColor(level);

                    // Height = Stress (more pronounced)
                    const targetScale = 1 + (index / 100) * 8;
                    mesh.scale.setZ(targetScale);

                    const material = mesh.material as THREE.MeshStandardMaterial;
                    material.color.set(color);
                    material.emissive.set(color);
                    material.emissiveIntensity = index / 100 + 0.2;
                }
            });
        }
    };
};
