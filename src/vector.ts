export class Vector2 {
	constructor(public x: number, public y: number) {}

	public add(b: Vector2): Vector2 {
		return new Vector2(this.x + b.x, this.y + b.y)
	}
}

export class Vector3 {
	constructor(public x: number, public y: number, public z: number) {}

	public add(b: Vector3): Vector3 {
		return new Vector3(this.x + b.x, this.y + b.y, this.z + b.z)
	}
}

export class Vector4 {
	constructor(public x: number, public y: number, public z: number, public w: number) {}
}