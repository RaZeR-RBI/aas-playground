import { Scene, Mesh, BufferGeometry, BufferAttribute, MeshBasicMaterial, Side, DoubleSide } from 'three';
import AASFile from "./aasfile";
import AASInfo from "./aasinfo";
import * as earcut from 'earcut';

export class AASRender {
	public readonly info: AASInfo;

	private readonly groundFaces: Mesh;

	constructor(i: AASInfo) {
		this.info = i;
		this.groundFaces = this.getMesh(i.groundFaceIds, 0xff0000, DoubleSide);
	}

	private addOrRemove(scene: Scene, add: boolean) {
		const fn = add ? scene.add : scene.remove;
		fn.apply(scene, [this.groundFaces]);
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

	private getMesh(faceIds: number[], color: number | string, side: Side | undefined): Mesh {
		const verticesPerFace = faceIds
			.map((faceId, i, a) => this.triangulate(faceId), this);
		const vertices = new Float32Array(verticesPerFace
			.reduce((acc, val) => acc.concat(val), []));
		const geometry = new BufferGeometry();
		geometry.setAttribute('position', new BufferAttribute(vertices, 3));
		const material = new MeshBasicMaterial({ color, side: (side || DoubleSide) });
		return new Mesh(geometry, material);
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