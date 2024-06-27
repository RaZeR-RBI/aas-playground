import AASFile from "./aasfile";
import { Area, AreaContents, AreaFlags, AreaPortal, Face, FaceFlags, Reachability, TravelType } from "./aastypes";
import * as _ from 'lodash';

export class AASInfo {
	public readonly file: AASFile;
	public readonly clusterCount: number;

	public groundFaceIds: number[] = [];
	public waterFaceIds: number[] = [];
	public slimeFaceIds: number[] = [];
	public lavaFaceIds: number[] = [];
	public doNotEnterFaceIds: number[] = [];
	public clusterPortalFaceIds: number[] = [];
	public walkableClusterPortalFaceIds: number[] = [];

	constructor(f: AASFile) {
		var t0 = performance.now();
		this.file = f;
		this.load();
		this.clusterCount = new Set(f.areaSettings.map((val, i, a) => val.cluster)).size;
		var t1 = performance.now();
		console.log("AAS geometry loaded in " + (t1 - t0) + " ms");
	}

	public getReachabilitiesOfType(t: TravelType): Reachability[] {
		return this.file.reachabilities.filter((val, i, a) => val.travelType == t);
	}

	private getAreaFaces(areaId: number): Map<number, Face> {
		const f = this.file;
		const area = f.areas[areaId];
		let result = new Map<number, Face>();
		for (var i = area.firstFace; i < area.firstFace + area.numFaces; i++) {
			const faceId = f.faceIndexes[i];
			// if faceId < 0 then the face is flipped
			result.set(faceId, f.faces[Math.abs(faceId)]);
		}
		return result;
	}

	private hasLiquidOnOneSide(face: Face): boolean {
		const f = this.file;
		const front = !!(f.areaSettings[face.frontArea].flags & AreaFlags.Liquid);
		const back = !!(f.areaSettings[face.backArea].flags & AreaFlags.Liquid);
		return front !== back;
	}

	private isGround(face: Face): boolean {
		return (face.flags & FaceFlags.Ground) != 0;
	}

	getFaceVertices(faceId: number): [number, number, number][] {
		if (faceId == 0) return [];
		const flip = faceId < 0;
		const f = this.file;
		const edgeIds = this.getFaceEdgeIds(f.faces[Math.abs(faceId)]);
		let e = new Map<number, number>();
		for (let i of edgeIds) {
			const edge = f.edges[Math.abs(i)];
			if (i > 0)
				e.set(edge.v1, edge.v2);
			else
				e.set(edge.v2, edge.v1);
		}
		let vertexIds: number[] = [];
		let current = [...e.keys()][0];
		vertexIds.push(current);
		while (vertexIds.length < e.size) {
			current = e.get(current)!;
			vertexIds.push(current);
		}
		const vertices: [number, number, number][] = vertexIds
			.map((val, i, a) => f.vertexes[val])
			.map((v, i, a) => [v.x, v.y, v.z]);

		return !flip ? vertices.reverse() : vertices;
	}

	getFaceLineSegments(faceId: number): [number, number, number][] {
		if (faceId == 0) return [];
		const flip = faceId < 0;
		const f = this.file;
		const edgeIds = this.getFaceEdgeIds(f.faces[Math.abs(faceId)]);
		const vertices = edgeIds.map((id, i, a) => this.getEdgeVertices(id), this);
		return vertices.reduce((acc, val) => acc.concat(val), []);
	}

	getEdgeVertices(edgeId: number): [number, number, number][] {
		const flip = edgeId < 0;
		const edge = this.file.edges[Math.abs(edgeId)];
		let v1 = this.file.vertexes[edge.v1];
		let v2 = this.file.vertexes[edge.v2];
		if (flip) {
			const tmp = v1;
			v1 = v2;
			v2 = tmp;
		}
		return [[v1.x, v1.y, v1.z], [v2.x, v2.y, v2.z]];
	}

	getFaceEdgeIds(face: Face): number[] {
		const indexes = this.file.edgeIndexes;
		// if edge is < 0 then it's flipped
		return _.range(face.firstEdge, face.firstEdge + face.numEdges)
			.map((i, _, __) => indexes[i]);
	}

	private flipIfNeeded(id: number, face: Face): Face {
		if (id > 0) return face;
		let result = { ...face };
		// flip areas
		const tmp = result.frontArea;
		result.frontArea = result.backArea;
		result.backArea = tmp;
		return result;
	}

	private addClusterPortal(portal: AreaPortal) {
		const faceMap = this.getAreaFaces(portal.areaNum);
		const faceIds = [...faceMap.keys()];
		const faces = [...faceMap.values()];

		const a = this.clusterPortalFaceIds;
		a.push.apply(a, faceIds);

		if (faces.some((val, i, a) => this.isGround(val), this)) {
			const a = this.walkableClusterPortalFaceIds;
			a.push.apply(a, faceIds);
		}
	}

	private load() {
		const f = this.file;
		for (let portalId = 1; portalId < f.portals.length; portalId++) {
			const portal = f.portals[portalId];
			this.addClusterPortal(portal);
		}
		// area 0 is a dummy, skip it
		for (let areaId = 1; areaId < f.areas.length; areaId++) {
			const settings = f.areaSettings[areaId];
			const contents = settings.contents;
			const modelNum = (contents >> 24) & 0xFF
			// worldspawn only
			// if (modelNum != 0) continue;
			const faces = this.getAreaFaces(areaId);
			for (let [faceId, _face] of faces) {
				let face = this.flipIfNeeded(faceId, _face);
				if (this.hasLiquidOnOneSide(face) && face.frontArea > 0 && face.backArea > 0) {
					const contents =
						f.areaSettings[face.frontArea].contents |
						f.areaSettings[face.backArea].contents;
					if (contents & AreaContents.Lava)
						this.lavaFaceIds.push(faceId);
					else if (contents & AreaContents.Slime)
						this.slimeFaceIds.push(faceId);
					else if (contents & AreaContents.Water)
						this.waterFaceIds.push(faceId);
				}
				else if (this.isGround(face))
				{
					if (contents & AreaContents.DoNotEnter)
						this.doNotEnterFaceIds.push(faceId);
					else
						this.groundFaceIds.push(faceId);
				}
			}
		}
	}
}

export default AASInfo;