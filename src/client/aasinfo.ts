import AASFile from "./aasfile";
import { AreaFlags, Face, FaceFlags } from "./aastypes";
import * as _ from 'lodash';

export interface Connectivity {
	frontArea: number, // from
	backArea: number, // to
	faceId: number
}

export interface ReachabilityInfo {
	faceIds: number[],
	reach: Connectivity[]
}

export class AASInfo {
	public readonly file: AASFile;

	public groundFaceIds: number[] = [];
	public portalFaceIds: number[] = [];
	public liquidAreas: number[] = [];

	// reachabilities
	public reachWalk: Connectivity[] = [];
	public reachFall: Connectivity[] = [];
	public reachStep: Connectivity[] = [];

	constructor(f: AASFile) {
		var t0 = performance.now();
		this.file = f;
		this.load();
		var t1 = performance.now();
		console.log("AAS reach calculation took " + (t1 - t0) + " ms");
	}

	get reachWalkFaceIds() {
		return this.getFaceIdsForConnectivity(this.reachWalk);
	}

	get reachFallFaceIds() {
		return this.getFaceIdsForConnectivity(this.reachFall);
	}

	get reachStepFaceIds() {
		return this.getFaceIdsForConnectivity(this.reachStep);
	}

	private getFaceIdsForConnectivity(c: Connectivity[]): number[] {
		return c.map((val, i, a) => val.faceId);
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

	private hasLiquidOnAnySide(face: Face): boolean {
		const f = this.file;
		const flags = f.areaSettings[face.frontArea].flags | f.areaSettings[face.backArea].flags;
		return (flags & FaceFlags.Liquid) != 0;
	}

	private isGround(face: Face): boolean {
		return (face.flags & FaceFlags.Ground) != 0;
	}

	private isPortal(face: Face): boolean {
		if (face.frontArea < 1 || face.backArea < 1) return false;
		const f = this.file;
		const flags = f.areaSettings[face.frontArea].flags | f.areaSettings[face.backArea].flags;
		return !!(flags & AreaFlags.Grounded) && !(flags & AreaFlags.Liquid);
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

	private getEdgeVertices(edgeId: number): [number, number, number][] {
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

	private getFaceEdgeIds(face: Face): number[] {
		const indexes = this.file.edgeIndexes;
		// if edge is < 0 then it's flipped
		return _.range(face.firstEdge, face.firstEdge + face.numEdges)
			.map((i, _, __) => indexes[i]);
	}

	private hasCommonEdge(face: Face, edgelist: number[]): boolean {
		const src = this.getFaceEdgeIds(face).map(Math.abs);
		const dst = edgelist.map(Math.abs);
		return _.intersection(src, dst).length > 0;
	}

	private getLowestEdge(edgelist: number[]): { id: number, height: number } | null {
		const f = this.file;
		let min = Number.MAX_VALUE;
		let minId: number | null = null;
		for (let i of edgelist) {
			const e = f.edges[Math.abs(i)];
			let [v1, v2] = [f.vertexes[e.v1], f.vertexes[e.v2]];
			const upper = Math.max(v1.y, v2.y);
			if (upper < min) {
				minId = i;
				min = upper;
			}
		}

		if (minId) {
			return { id: minId, height: min };
		} else return null;
	}

	private _lastTouchingFace: Face | null = null;
	private _lastTouchingFaceResult: [front: Map<number, Face>, back: Map<number, Face>] | null = null;

	private getTouchingFaces(portal: Face): [front: Map<number, Face>, back: Map<number, Face>] {
		if (_.isEqual(this._lastTouchingFace, portal)) {
			return this._lastTouchingFaceResult!;
		}
		const f = this.file;
		const edges = this.getFaceEdgeIds(portal);
		let front = this.getAreaFaces(portal.frontArea);
		let back = this.getAreaFaces(portal.backArea);
		const _f = [...front.keys()];
		const _b = [...back.keys()];
		for (let key of _f)
			if (!this.hasCommonEdge(front.get(key)!, edges))
				front.delete(key);
		for (let key of _b)
			if (!this.hasCommonEdge(back.get(key)!, edges))
				back.delete(key);

		this._lastTouchingFace = portal;
		this._lastTouchingFaceResult = [front, back];
		return this._lastTouchingFaceResult;
	}

	private hasReachWalk(face: Face): boolean {
		if (!this.isPortal(face)) return false;
		let [front, back] = this.getTouchingFaces(face);
		const hasFront = [...front.values()].some(this.isGround);
		const hasBack = [...back.values()].some(this.isGround);
		return hasFront && hasBack;
	}

	private hasReachFall(face: Face): boolean {
		if (!this.isPortal(face)) return false;
		let [front, back] = this.getTouchingFaces(face);
		const hasFront = [...front.values()].some(this.isGround);
		const hasBack = [...back.values()].some(this.isGround);
		return hasFront && !hasBack;
	}

	private hasReachStep(face: Face): boolean {
		if (face.flags != 0 || face.frontArea == 0 || face.backArea == 0)
			return false;
		const [front, back] = this.getTouchingFaces(face);
		const hasFront = [...front.values()].some(this.isGround);
		const hasBack = [...back.values()].some(this.isGround);
		const possible = !hasFront && hasBack;
		if (!possible) return false;

		const portalEdges = this.getFaceEdgeIds(face);
		const crease = this.getLowestEdge(portalEdges);
		if (!crease) return false;

		const lower = [...this.getAreaFaces(face.frontArea).values()];
		if (!lower.length) return false;
		for (let f of lower) {
			const fold = this.getLowestEdge(this.getFaceEdgeIds(f));
			if (!fold) continue;
			if (crease.height - fold.height > 18) continue; // MAX_STEPSIZE
			// check if we have flooring
			const floor = lower.filter((f, i, a) => this.isGround(f) && this.hasCommonEdge(f, [fold.id]), this);
			if (!floor.length) continue;
			return true;
		}
		return false;
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

	private load() {
		const f = this.file;
		for (let areaId = 1; areaId < f.areas.length; areaId++) {
			const area = f.areas[areaId];
			const settings = f.areaSettings[areaId];
			const contents = settings.contents;
			const flags = settings.flags;
			const modelNum = (contents >> 24) & 0xFF
			// worldspawn only
			// if (modelNum != 0) continue;
			// we are hydrophobic
			if (flags & AreaFlags.Liquid) {
				this.liquidAreas.push(areaId);
				continue;
			}
			const faces = this.getAreaFaces(areaId);
			for (let [faceId, _face] of faces) {
				let face = this.flipIfNeeded(faceId, _face);
				const connect = {
					frontArea: face.frontArea,
					backArea: face.backArea,
					faceId: faceId
				};
				// we are still hydrophobic
				if (this.hasLiquidOnAnySide(face))
					return;
				if (this.isGround(face))
					this.groundFaceIds.push(faceId);
				if (this.isPortal(face))
					this.portalFaceIds.push(faceId);

				if (this.hasReachWalk(face))
					this.reachWalk.push(connect);
				else if (this.hasReachFall(face))
					this.reachFall.push(connect);
				else if (this.hasReachStep(face))
					this.reachStep.push(connect);
			}
		}
	}
}

export default AASInfo;