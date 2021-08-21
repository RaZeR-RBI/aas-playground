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
	NormalBlending,
	Color
} from 'three';
import AASFile from "./aasfile";
import AASInfo from "./aasinfo";
import * as earcut from 'earcut';
import { TravelType } from './aastypes';
import _ = require('lodash');

export class AASRender {
	public readonly info: AASInfo;

	private readonly groundFaces: Mesh;
	private readonly groundEdges: LineSegments;
	private readonly reachabilities: LineSegments[];

	private readonly waterFaces: Mesh;
	private readonly slimeFaces: Mesh;
	private readonly lavaFaces: Mesh;

	constructor(i: AASInfo) {
		const t0 = performance.now();

		this.info = i;
		const groundMat = new MeshLambertMaterial({ color: 0x333333, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
		this.groundFaces = this.getMesh(i.groundFaceIds, groundMat, "groundFaces");
		this.groundEdges = this.getEdges(i.groundFaceIds, 0x0, "groundLines");

		const waterMat = new MeshBasicMaterial({ color: 0x0000CC, depthWrite: false, opacity: 0.2, transparent: true });
		this.waterFaces = this.getMesh(i.waterFaceIds, waterMat, "waterFaces");
		const slimeMat = new MeshBasicMaterial({ color: 0x008822, depthWrite: false, opacity: 0.2, transparent: true });
		this.slimeFaces = this.getMesh(i.slimeFaceIds, slimeMat, "slimeFaces");
		const lavaMat = new MeshBasicMaterial({ color: 0xFF2200, depthWrite: false, opacity: 0.2, transparent: true });
		this.lavaFaces = this.getMesh(i.lavaFaceIds, lavaMat, "lavaFaces");

		this.reachabilities = this.getReachabilityGraph();

		const t1 = performance.now();
		console.log("AAS preview took " + (t1 - t0) + " ms");
	}

	private addOrRemove(scene: Scene, add: boolean) {
		const fn = add ? scene.add : scene.remove;
		const items: Object3D[] = [
			this.groundFaces,
			this.groundEdges,
			this.waterFaces,
			this.slimeFaces,
			this.lavaFaces,
			...this.reachabilities
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

	private getColorFor(r: TravelType): Color | null {
		switch (r) {
			case TravelType.Walk:
				return new Color(0xFF0000);
			case TravelType.Crouch:
				return new Color(0x00FF00);
			case TravelType.BarrierJump:
				return new Color(0x0000FF);
			case TravelType.Jump:
				return new Color(0xFF00FF);
			case TravelType.Ladder:
				return new Color(0xFFFF00);
			case TravelType.WalkOffLedge:
				return new Color(0x00FFFF);
			case TravelType.Swim:
				return new Color(0xFFFFFF);

			case TravelType.WaterJump:
				return new Color(0xAA0000);
			case TravelType.Teleport:
				return new Color(0x00AA00);
			case TravelType.Elevator:
				return new Color(0x0000AA);
			case TravelType.RocketJump:
				return new Color(0xAA00AA);
			case TravelType.BfgJump:
				return new Color(0xAAAA00);
			case TravelType.GrappleHook:
				return new Color(0x00AAAA);
			case TravelType.DoubleJump:
				return new Color(0xAAAAAA);

			case TravelType.RampJump:
				return new Color(0x440000);
			case TravelType.StrafeJump:
				return new Color(0x004400);
			case TravelType.JumpPad:
				return new Color(0x000044);
			case TravelType.FuncBob:
				return new Color(0x440044);
			default:
				return null;
		}
	}

	private getReachabilityGraph(): LineSegments[] {
		let types = _.range(TravelType.Walk, TravelType.FuncBob + 1);
		return types
			.map((val, i, a) => this.getReachabilityGraphForType(val), this)
			.filter((val, i, a) => val != null)
			.map((val, i, a) => val!);
	}

	private getReachabilityGraphForType(type: TravelType): LineSegments | null {
		var t0 = performance.now();
		let vertices: number[] = [];
		let colors: number[] = [];

		const areas = this.file.areaSettings;
		const reach = this.file.reachabilities;
		const color = this.getColorFor(type);
		if (color == null) return null;

		for (let areaId = 1; areaId < areas.length; areaId++) {
			const first = areas[areaId].firstReachable;
			const count = areas[areaId].numReachable;
			if (count <= 0) continue;
			let items = reach.slice(first, first + count);
			for (let r of items) {
				if (r.travelType != type) continue;

				const v = [r.start.x, r.start.y, r.start.z, r.end.x, r.end.y, r.end.z];
				const c = [color.r, color.g, color.b];
				vertices.push.apply(vertices, v);
				colors.push.apply(colors, c);
				colors.push.apply(colors, c);
			}
		}
		if (vertices.length <= 0) return null;

		const data = new Float32Array(vertices);
		const colorData = new Float32Array(colors);
		const geo = new BufferGeometry();
		geo.setAttribute('position', new BufferAttribute(data, 3));
		geo.setAttribute('color', new BufferAttribute(colorData, 3));
		const mat = new LineDashedMaterial({ vertexColors: true });
		const mesh = new LineSegments(geo, mat);
		mesh.name = "Travel_" + TravelType[type];

		var t1 = performance.now();
		console.log("getReachabilityGraph(" + TravelType[type] + "): " + (t1 - t0) + " ms");
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