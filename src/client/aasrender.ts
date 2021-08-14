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
	private readonly groundLines: LineSegments;
	private readonly reachWalk: Mesh;
	private readonly reachWalkEdges: LineSegments;
	private readonly reachFall: Mesh;
	private readonly reachFallEdges: LineSegments;

	constructor(i: AASInfo) {
		this.info = i;
		const groundMat = new MeshLambertMaterial({ color: 0x333333, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
		this.groundFaces = this.getMesh(i.groundFaceIds, groundMat, "groundFaces");
		this.groundLines = this.getEdges(i.groundFaceIds, 0x0, "groundLines");

		const reachWalkMat = new MeshLambertMaterial({ transparent: true, color: 0x00FF00, opacity: 0.25 });
		this.reachWalk = this.getMesh(i.reachWalkFaceIds, reachWalkMat, "reachWalk");
		this.reachWalkEdges = this.getEdges(i.reachWalkFaceIds, 0x00FF00, "reachWalkEdges");

		const reachFallMat = new MeshLambertMaterial({ transparent: true, color: 0xFF00FF, opacity: 0.25 });
		this.reachFall = this.getMesh(i.reachFallFaceIds, reachFallMat, "reachFall");
		this.reachFallEdges = this.getEdges(i.reachFallFaceIds, 0xFF00FF, "reachFallEdges");
	}

	private addOrRemove(scene: Scene, add: boolean) {
		const fn = add ? scene.add : scene.remove;
		const items: Object3D[] = [
			this.groundFaces,
			this.groundLines,
			this.reachWalk,
			this.reachWalkEdges,
			this.reachFall,
			this.reachFallEdges
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
		return mesh;
	}

	private getEdges(faceIds: number[], color: number | string, name: string | undefined = undefined): LineSegments {
		const vertices = faceIds.map((val, i, a) => this.info.getFaceLineSegments(val), this)
			.reduce((acc, val) => acc.concat(val), (<[number, number, number][]>[]))
			.reduce((acc, val) => acc.concat([...val]), (<number[]>[]));

		const data = new Float32Array(vertices);
		const geo = new BufferGeometry();
		geo.setAttribute('position', new BufferAttribute(data, 3));

		const mat = new LineBasicMaterial({ color });
		const mesh = new LineSegments(geo, mat);
		mesh.name = name ?? "";
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