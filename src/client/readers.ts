import {
	Vector3,
	Plane
} from './aastypes';

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