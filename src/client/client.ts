import * as THREE from 'three'
import { Color, Material, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import AASFile from './aasfile';
import AASInfo from './aasinfo';
import AASRender from './aasrender';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';

const scene = new THREE.Scene();
(<any>window).SCENE = scene;

const fileInput = document.getElementById("file") as HTMLInputElement;
fileInput.addEventListener("change", onFileLoad);

window.addEventListener("load", (_) => {
    const e = document.createEvent("UIEvents");
    e.initEvent("change", true, true);
    fileInput.dispatchEvent(e);
});

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
            const mat = (<any>child).material;
            if (!!mat) {
                const color: Color = mat.color;
                if (!!color) {
                    let p = {
                        color: {
                            r: color.r * 255,
                            g: color.g * 255,
                            b: color.b * 255,
                        }
                    };
                    folder
                        .addColor(p, "color")
                        .onChange(v => {
                            if (typeof (v) == 'object')
                                mat.color = new Color(v.r / 255, v.g / 255, v.b / 255);
                            else if (typeof (v) == 'string')
                                mat.color = new Color(v);
                        });
                }
                if (mat.transparent) {
                    folder.add(mat, "opacity", 0, 1);
                }
            }
            folder.open();
        }
        (<any>window).GUI = gui;

        const bounds: THREE.Box3 = (<any>scene.children[1]).geometry.boundingBox;
        const center = new THREE.Vector3();
        bounds.getCenter(center);
        camera.position.set(bounds.max.x, bounds.max.y, bounds.max.z);
        camera.lookAt(center);
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
