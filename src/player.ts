import { Camera, Renderer } from "./renderer.ts";

export class Player {
	private canvas: HTMLCanvasElement
	private generator: any

	private context: any = null
	private elements: any[] = []

    private renderer: Renderer

	constructor(canvas: HTMLCanvasElement, generator: any) {
		this.canvas = canvas
		this.generator = generator

        this.renderer = new Renderer(canvas)
	}

    public async setup(camera: Camera) {
        await this.renderer.setup(camera)
    }

	public play() {
		this.context = this.generator({
			add: (element: any) => {
				this.elements.push(element)
			
                return element
            },
		})

		this.context.next()

		this.render()

        requestAnimationFrame(() => {
            this.update()
        })
	}

    public update() {
        const result = this.context.next()

        this.render()

        if(result.done) {
            this.elements = []

            this.context = this.generator({
                add: (element: any) => {
                    this.elements.push(element)
                
                    return element
                },
            })

            this.context.next()
        }

        requestAnimationFrame(() => {
            this.update()
        })
    }

	public render() {
        this.renderer.render(this.elements)
	}
}

export async function player(canvas: HTMLCanvasElement, camera: Camera, generator: any): Promise<Player> {
	const player = new Player(canvas, generator)
    
    await player.setup(camera)
    
    return player
}
