import {
	readVector3,
	readPlane
} from "./readers";

import {
	Vector3,
	Plane
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

	private lumpInfo: LumpInfo[] = [];

	constructor(b: ArrayBuffer) {
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

		console.log("Vertexes: " + this.vertexes.length);
		console.log("Planes: " + this.planes.length);
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