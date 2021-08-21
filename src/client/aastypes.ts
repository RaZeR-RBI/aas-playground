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

export interface Edge {
	v1: number,
	v2: number
};

export enum FaceFlags {
	None = 0,
	Solid = 1,
	Ladder = 2,
	Ground = 4,
	Gap = 8,
	Liquid = 16,
	LiquidSurface = 32,
	Bridge = 64
};

export interface Face {
	planeId: number,
	flags: FaceFlags,
	numEdges: number,
	firstEdge: number,
	frontArea: number,
	backArea: number
};

export enum AreaContents {
	None = 0,
	Water = 1,
	Lava = 2,
	Slime = 4,
	ClusterPortal = 8,
	TelePortal = 16,
	RoutePortal = 32,
	Teleporter = 64,
	JumpPad = 128,
	DoNotEnter = 256,
	ViewPortal = 512,
	Mover = 1024,
	NotTeam1 = 2048,
	NotTeam2 = 4096,
	ModelNumShift = 24,
	MaxModelNum = 0xFF,
};

export enum AreaFlags {
	None = 0,
	Grounded = 1,
	Ladder = 2,
	Liquid = 4,
	Disabled = 8,
	Bridge = 16
};

export interface Area {
	id: number,
	numFaces: number,
	firstFace: number,
	mins: Vector3,
	maxs: Vector3,
	center: Vector3
};

export interface AreaSettings {
	contents: AreaContents,
	flags: AreaFlags,
	presence: number,
	cluster: number,
	clusterAreaNum: number,
	numReachable: number,
	firstReachable: number
};

export interface Node {
	planeNum: number,
	children: [number, number]
};

export enum TravelType {
	Invalid = 1,		//temporary not possible
	Walk = 2,		//walking
	Crouch = 3,		//crouching
	BarrierJump = 4,	//jumping onto a barrier
	Jump = 5,		//jumping
	Ladder = 6,		//climbing a ladder
	WalkOffLedge = 7,	//walking of a ledge
	Swim = 8,		//swimming
	WaterJump = 9,		//jump out of the water
	Teleport = 10,		//teleportation
	Elevator = 11,		//travel by elevator
	RocketJump = 12,	//rocket jumping required for travel
	BfgJump = 13,		//bfg jumping required for travel
	GrappleHook = 14,	//grappling hook required for travel
	DoubleJump = 15,	//double jump
	RampJump = 16,		//ramp jump
	StrafeJump = 17,	//strafe jump
	JumpPad = 18,		//jump pad
	FuncBob = 19,		//func bob
	MaxTravelTypes = 32,
};

export interface Reachability {
	areaNum: number,
	faceNum: number,
	edgeNum: number,
	start: Vector3,
	end: Vector3,
	travelType: TravelType,
	travelTime: number
};