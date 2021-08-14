import * as THREE from 'three'
import { Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import AASFile from './aasfile';
import AASInfo from './aasinfo';
import AASRender from './aasrender';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';

const scene = new THREE.Scene();
(<any>window).SCENE = scene;

const fileInput = document.getElementById("file") as HTMLInputElement;
fileInput.addEventListener("change", onFileLoad);

function onFileLoad(e: any) {
    const files: FileList = e.target.files;
    if (files.length != 1) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        const f = new AASFile(e.target?.result as ArrayBuffer);
        (<any>window).AAS = f;
        const info = new AASInfo(f);
        (<any>window).INFO = info;
        const render = new AASRender(info);
        (<any>window).RENDER?.removeFromScene(scene);
        render.addToScene(scene);
        (<any>window).RENDER = render;
        (<any>window).GUI?.destroy();
        const gui = new GUI();
        for (let child of scene.children) {
            if (!child.name) continue;
            const folder = gui.addFolder(child.name);
            folder.add(child, 'visible');
            folder.open();
        }
        (<any>window).GUI = gui;

        const bounds: THREE.Box3 = (<any>scene.children[1]).geometry.boundingBox;
        const center = bounds.min.lerp(bounds.max, 0.5);
        camera.lookAt(center);
        camera.position.set(bounds.max.x, bounds.max.y, bounds.max.z);
        controls.update();
    };
    reader.readAsArrayBuffer(file);
}

const navSize = 32;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight - navSize), 1, 10000)
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 1, 0);
scene.add(light);

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight - navSize)
renderer.setClearColor('#6495ed');
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / (window.innerHeight - navSize)
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight - navSize)
    render()
}

function animate() {
    setTimeout(() => requestAnimationFrame(animate), 1000 / 30);
    controls.update();

    render();
}

function render() {
    renderer.render(scene, camera);
}
animate()
