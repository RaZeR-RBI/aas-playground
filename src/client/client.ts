import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import AASFile from './aasfile';
import AASInfo from './aasinfo';

const scene = new THREE.Scene()

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
    };
    reader.readAsArrayBuffer(file);
}

const navSize = 32;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight - navSize), 0.1, 1000)
camera.position.z = 2

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight - navSize)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

const geometry = new THREE.BoxGeometry()
const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
})

const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / (window.innerHeight - navSize)
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight - navSize)
    render()
}

function animate() {
    requestAnimationFrame(animate)

    // cube.rotation.x += 0.01
    // cube.rotation.y += 0.01

    controls.update()

    render()
}

function render() {
    renderer.render(scene, camera)
}
animate()
