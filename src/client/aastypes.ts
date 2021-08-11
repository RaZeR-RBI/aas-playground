export interface Vector3 {
	x: number;
	y: number;
	z: number;
};

export interface Plane {
	normal: Vector3,
	d: number, // float
	type: number // int
};