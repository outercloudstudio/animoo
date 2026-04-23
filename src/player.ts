export class Player {
	private canvas: HTMLCanvasElement
	private generator: any

	private context: any = null
	private elements: any[] = []

	constructor(canvas: HTMLCanvasElement, generator: any) {
		this.canvas = canvas
		this.generator = generator
	}

	public play() {
		this.context = this.generator({
			add: (element: any) => {
				this.elements.push(element)
			},
		})

		this.context.next()

		this.render(this.canvas)
	}

	public render(canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d')!

		console.log(this.elements)

		for (const element of this.elements) {
			element.render(ctx)
		}
	}
}

export function player(canvas: HTMLCanvasElement, generator: any): Player {
	return new Player(canvas, generator)
}
