import {
	Scene,
	Mesh,
	BufferGeometry,
	BufferAttribute,
	Material,
	DoubleSide,
	MeshBasicMaterial,
	MeshLambertMaterial,
	LineBasicMaterial,
	LineDashedMaterial,
	EdgesGeometry,
	LineSegments,
	Object3D,
	NormalBlending
} from 'three';
import AASFile from "./aasfile";
import AASInfo from "./aasinfo";
import * as earcut from 'earcut';

export class AASRender {
	public readonly info: AASInfo;

	private readonly groundFaces: Mesh;
	private readonly groundEdges: LineSegments;
	private readonly portalFaces: Mesh;
	// private readonly portalEdges: LineSegments;
	private readonly reachWalk: Mesh;
	private readonly reachWalkEdges: LineSegments;
	private readonly reachFall: Mesh;
	private readonly reachFallEdges: LineSegments;
	private readonly reachStep: Mesh;
	private readonly reachStepEdges: LineSegments;

	constructor(i: AASInfo) {
		const t0 = performance.now();

		this.info = i;
		const groundMat = new MeshLambertMaterial({ color: 0x333333, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
		this.groundFaces = this.getMesh(i.groundFaceIds, groundMat, "groundFaces");
		this.groundEdges = this.getEdges(i.groundFaceIds, 0x0, "groundLines");

		const portalMat = new MeshBasicMaterial({ transparent: true, color: '#FF00FF', opacity: 0.25, depthWrite: false });
		this.portalFaces = this.getMesh(i.portalFaceIds, portalMat, "portal");
		// this.portalEdges = this.getEdges(i.portalFaceIds, '#FF00FF', "portalEdges");

		const reachWalkMat = new MeshBasicMaterial({ transparent: true, color: '#00FF00', opacity: 0.25, depthWrite: false });
		this.reachWalk = this.getMesh(i.reachWalkFaceIds, reachWalkMat, "reachWalk");
		this.reachWalkEdges = this.getEdges(i.reachWalkFaceIds, '#00FF00', "reachWalkEdges");

		const reachFallMat = new MeshBasicMaterial({ transparent: true, color: '#FF0000', opacity: 0.25, depthWrite: false });
		this.reachFall = this.getMesh(i.reachFallFaceIds, reachFallMat, "reachFall");
		this.reachFallEdges = this.getEdges(i.reachFallFaceIds, '#FF0000', "reachFallEdges");

		const reachStepMat = new MeshBasicMaterial({ transparent: true, color: '#0000FF', opacity: 0.25, depthWrite: false });
		this.reachStep = this.getMesh(i.reachStepFaceIds, reachStepMat, "reachStep");
		this.reachStepEdges = this.getEdges(i.reachStepFaceIds, '#0000FF', "reachStepEdges");

		for (let obj of this.invisibleOnLoad)
			obj.visible = false;

		const t1 = performance.now();
		console.log("AAS preview took " + (t1 - t0) + " ms");
	}

	get invisibleOnLoad(): Object3D[] {
		return [
			this.portalFaces,
			// this.portalEdges,
		];
	}

	private addOrRemove(scene: Scene, add: boolean) {
		const fn = add ? scene.add : scene.remove;
		const items: Object3D[] = [
			this.groundFaces,
			this.groundEdges,
			this.reachWalk,
			this.reachWalkEdges,
			this.reachFall,
			this.reachFallEdges,
			this.reachStep,
			this.reachStepEdges,
			...this.invisibleOnLoad
		];
		for (let m of items)
			fn.apply(scene, [m]);
	}

	private triangulate(faceId: number): number[] {
		const vertices = this.info.getFaceVertices(faceId);
		const count = vertices.length - 2;
		const root = vertices[0];
		let offset = 1;
		let after: [number, number, number][] = [];
		for (let i = 0; i < count * 3; i += 3) {
			after.push(root);
			after.push(vertices[offset]);
			after.push(vertices[offset + 1]);
			offset++;
		}

		return (<number[]>[]).concat(...after);
	}

	private getMesh(faceIds: number[], mat: Material, name: string | undefined = undefined): Mesh {
		var t0 = performance.now();
		const verticesPerFace = faceIds
			.map((faceId, i, a) => this.triangulate(faceId), this);
		const vertices = new Float32Array(verticesPerFace
			.reduce((acc, val) => acc.concat(val), []));
		const geometry = new BufferGeometry();
		geometry.setAttribute('position', new BufferAttribute(vertices, 3));
		geometry.computeBoundingBox();
		geometry.computeBoundingSphere();
		geometry.computeVertexNormals();
		const mesh = new Mesh(geometry, mat);
		mesh.name = name ?? "";
		var t1 = performance.now();
		console.log("getMesh(" + mesh.name + "): " + (t1 - t0) + " ms");
		return mesh;
	}

	private getEdges(faceIds: number[], color: number | string, name: string | undefined = undefined): LineSegments {
		var t0 = performance.now();
		const vertices = faceIds.map((val, i, a) => this.info.getFaceLineSegments(val), this)
			.reduce((acc, val) => acc.concat(val), (<[number, number, number][]>[]))
			.reduce((acc, val) => acc.concat([...val]), (<number[]>[]));

		const data = new Float32Array(vertices);
		const geo = new BufferGeometry();
		geo.setAttribute('position', new BufferAttribute(data, 3));

		const mat = new LineDashedMaterial({ color });
		const mesh = new LineSegments(geo, mat);
		mesh.name = name ?? "";
		var t1 = performance.now();
		console.log("getEdges(" + mesh.name + "): " + (t1 - t0) + " ms");
		return mesh;
	}

	get file(): AASFile {
		return this.info.file;
	}

	addToScene(scene: Scene) {
		this.addOrRemove(scene, true);
	}

	removeFromScene(scene: Scene) {
		this.addOrRemove(scene, false);
	}
}

export default AASRender;