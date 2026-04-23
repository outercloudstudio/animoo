export class Player {
	private canvas: HTMLCanvasElement

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas
	}

	public play() {
		const ctx = this.canvas.getContext('2d')!

		ctx.fillStyle = 'red'
		ctx.fillRect(0, 0, 100, 100)
	}
}
