/*
-	when a node child is a solid leaf the node child number is zero
-	two adjacent areas (sharing a plane at opposite sides) share a face
	this face is a portal between the areas
-	when an area uses a face from the faceindex with a positive index
	then the face plane normal points into the area
-	the face edges are stored counter clockwise using the edgeindex
-	two adjacent convex areas (sharing a face) only share One face
	this is a simple result of the areas being convex
-	the areas can't have a mixture of ground and gap faces
	other mixtures of faces in one area are allowed
-	areas with the AREACONTENTS_CLUSTERPORTAL in the settings have
	the cluster number set to the negative portal number
-	edge zero is a dummy
-	face zero is a dummy
-	area zero is a dummy
-	node zero is a dummy
*/

import {
	readVector3,
	readPlane,
	readEdge,
	readFace,
	readArea,
	readInt32,
	readAreaSettings,
	readNode
} from "./readers";

import {
	Vector3,
	Plane,
	Edge,
	Face,
	Area,
	AreaSettings,
	Node,
} from "./aastypes";

interface LumpInfo {
	offset: number;
	size: number
}

enum Lumps {
	Boxes,
	Vertexes,
	Planes,
	Edges,
	EdgeIndex,
	Faces,
	FaceIndex,
	Areas,
	AreaSettings,
	Reachability,
	Nodes,
	Portals,
	PortalIndex,
	Clusters,
	TOTAL
};

type LumpReader<T> = (v: DataView, byteOffset: number) => T;

export default class AASFile {
	public vertexes: Vector3[] = [];
	public planes: Plane[] = [];
	public edges: Edge[] = [];
	public edgeIndexes: number[] = [];
	public faces: Face[] = [];
	public faceIndexes: number[] = [];
	public areas: Area[] = [];
	public areaSettings: AreaSettings[] = [];
	public nodes: Node[] = [];

	private lumpInfo: LumpInfo[] = [];

	constructor(b: ArrayBuffer) {
		var t0 = performance.now();
		const magic = new Uint8Array(b, 0, 4);
		if (!this.checkMagic(magic)) {
			alert("Not an AAS file");
			return;
		}
		const version = new Uint32Array(b, 4, 1)[0];
		if (version != 5) {
			alert("Version " + version + " is not supported, expected 5");
			return;
		}

		this.lumpInfo = this.getLumpInfo(b);
		this.vertexes = this.readLump(Lumps.Vertexes, b, 12, readVector3);
		this.planes = this.readLump(Lumps.Planes, b, 20, readPlane);
		this.edges = this.readLump(Lumps.Edges, b, 8, readEdge);
		this.edgeIndexes = this.readLump(Lumps.EdgeIndex, b, 4, readInt32);
		this.faces = this.readLump(Lumps.Faces, b, 24, readFace);
		this.faceIndexes = this.readLump(Lumps.FaceIndex, b, 4, readInt32);
		this.areas = this.readLump(Lumps.Areas, b, 48, readArea);
		this.areaSettings = this.readLump(Lumps.AreaSettings, b, 28, readAreaSettings);
		this.nodes = this.readLump(Lumps.Nodes, b, 12, readNode);
		var t1 = performance.now();
		console.log("AAS file loading took " + (t1 - t0) + " ms");
	}

	readLump<T>(type: Lumps, b: ArrayBuffer, size: number, reader: LumpReader<T>): T[] {
		const l = this.lumpInfo[type];
		const v = new DataView(b, l.offset, l.size);
		const count = v.byteLength / size;
		let result: T[] = [];
		for (var i = 0, offset = 0; i < count; i++, offset += size)
			result.push(reader(v, offset));
		return result;
	}

	checkMagic(b: Uint8Array): boolean {
		const s: string = "EAAS";
		let valid = true;
		for (let i = 0; i < s.length; i++)
			valid = valid && (b[i] == s.charCodeAt(i));
		return valid;
	}

	getKey(size: number): Uint8Array {
		let result = new Uint8Array(size);
		for (let i = 0; i < size; i++)
			result[i] = (i * 119) & 0xFF;
		return result;
	}

	decodeLumpInfo(b: ArrayBuffer): Uint32Array {
		const lumpCount = Lumps.TOTAL;
		const sizeInBytes = 4 + lumpCount * 8; // 116
		const key = this.getKey(sizeInBytes);
		let data = new Uint8Array(b, 8, sizeInBytes);
		for (let i = 0; i < sizeInBytes; i++)
			data[i] = data[i] ^ key[i];
		// skip checksum
		return new Uint32Array(data.buffer, data.byteOffset + 4, lumpCount * 2);
	}

	getLumpInfo(b: ArrayBuffer): LumpInfo[] {
		const info = this.decodeLumpInfo(b);
		let result = [];
		for (let i = 0; i < info.length; i += 2)
			result.push({
				offset: info[i],
				size: info[i + 1]
			});
		return result;
	}
}