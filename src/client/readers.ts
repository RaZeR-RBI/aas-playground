import {
	Vector3,
	Plane,
	Edge,
	Face,
	Area,
	AreaSettings,
	Node
} from './aastypes';

export function readInt32(v: DataView, byteOffset: number): number {
	return v.getInt32(byteOffset, true);
}

export function readVector3(v: DataView, byteOffset: number): Vector3 {
	return {
		x: v.getFloat32(byteOffset, true),
		y: v.getFloat32(byteOffset + 8, true),
		z: -v.getFloat32(byteOffset + 4, true)
	}
}

export function readPlane(v: DataView, byteOffset: number): Plane {
	const normal = readVector3(v, byteOffset);
	const d = v.getFloat32(byteOffset + 12, true);
	const type = v.getInt32(byteOffset + 16, true);
	return {
		normal,
		d,
		type,
	};
}

export function readEdge(v: DataView, byteOffset: number): Edge {
	const v1 = v.getInt32(byteOffset, true);
	const v2 = v.getInt32(byteOffset + 4, true);
	return { v1, v2 };
}

export function readFace(v: DataView, byteOffset: number): Face {
	return {
		planeId: v.getInt32(byteOffset, true),
		flags: v.getInt32(byteOffset + 4, true),
		numEdges: v.getInt32(byteOffset + 8, true),
		firstEdge: v.getInt32(byteOffset + 12, true),
		frontArea: v.getInt32(byteOffset + 16, true),
		backArea: v.getInt32(byteOffset + 20, true),
	};
}

export function readArea(v: DataView, byteOffset: number): Area {
	return {
		id: v.getInt32(byteOffset, true),
		numFaces: v.getInt32(byteOffset + 4, true),
		firstFace: v.getInt32(byteOffset + 8, true),
		mins: readVector3(v, byteOffset + 12),
		maxs: readVector3(v, byteOffset + 24),
		center: readVector3(v, byteOffset + 36)
	};
}

export function readAreaSettings(v: DataView, byteOffset: number): AreaSettings {
	return {
		contents: v.getInt32(byteOffset, true),
		flags: v.getInt32(byteOffset + 4, true),
		presence: v.getInt32(byteOffset + 8, true),
		cluster: v.getInt32(byteOffset + 12, true),
		clusterAreaNum: v.getInt32(byteOffset + 16, true),
		numReachable: v.getInt32(byteOffset + 20, true),
		firstReachable: v.getInt32(byteOffset + 24, true),
	}
}

export function readNode(v: DataView, byteOffset: number): Node {
	return {
		planeNum: v.getInt32(byteOffset, true),
		children: [
			v.getInt32(byteOffset + 4, true),
			v.getInt32(byteOffset + 8, true),
		]
	}
}