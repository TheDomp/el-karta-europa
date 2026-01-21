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

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            this.scene.add(ambientLight);

            const pointLight = new THREE.PointLight(0xffffff, 0.8);
            pointLight.position.set(0, 50, 50);
            this.scene.add(pointLight);
        }

        onAdd() {
            this.create3DObjects();
        }

        onContextRestored({ gl }: { gl: WebGLRenderingContext }) {
            this.renderer = new THREE.WebGLRenderer({
                canvas: gl.canvas,
                context: gl,
                ...gl.getContextAttributes(),
            });
            this.renderer.autoClear = false;
        }

        onDraw(options: google.maps.WebGLDrawOptions) {
            // Center on Sweden roughly
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
            // Clear existing
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
                    depth: 0.1, // Base height
                    bevelEnabled: false,
                };

                const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                const material = new THREE.MeshPhongMaterial({
                    color: 0xcccccc,
                    transparent: true,
                    opacity: 0.8,
                });

                const mesh = new THREE.Mesh(geometry, material);
                this.scene.add(mesh);
                this.meshes.set(feature.id, mesh);

                // Rotation to match map coordinates might be needed or handled by transformer
                // Google Maps WebGL typically matches Three.js Y-up if using transformer correctly,
                // but sometimes shapes need rotation if defined in lat/lng directly mapped to x/y.
                // For simplicity assuming direct mapping or slight adjustment:
                // mesh.rotation.x = -Math.PI / 2; // Flat on map
            });

            this.updateMeshes();
        }

        private updateMeshes() {
            this.zoneData.forEach(zone => {
                const mesh = this.meshes.get(zone.id);
                if (mesh) {
                    const { index, level } = calculateGridStress(zone.price, zone.load);
                    const color = getStressColor(level);

                    // Height = Stress
                    const scale = 1 + (index / 100) * 5; // Scale height
                    mesh.scale.setZ(scale); // Assuming extrusion is on Z or Y depending on orientation

                    (mesh.material as THREE.MeshPhongMaterial).color.set(color);
                }
            });
        }
    };
};
