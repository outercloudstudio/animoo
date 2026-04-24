export class Vector2 {
	constructor(public x: number, public y: number) {}

	public add(b: Vector2) {
		return new Vector2(this.x + b.x, this.y + b.y)
	}
}

export class Vector4 {
	constructor(public x: number, public y: number, public z: number, public w: number) {}
}