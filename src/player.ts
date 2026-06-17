import { RenderingElement } from "./elements/element.ts";
import { Camera2D, Renderer } from "./renderer.ts";

export class Player {
	private canvas: HTMLCanvasElement
	private generator: any

	private contexts: any[] = []
	private elements: RenderingElement[] = []

    private renderer: Renderer

	constructor(canvas: HTMLCanvasElement, generator: any) {
		this.canvas = canvas
		this.generator = generator

        this.renderer = new Renderer(canvas)
	}

    public async setup(camera: Camera2D) {
        await this.renderer.setup(camera)
    }

	public play() {
		this.contexts = [
            this.generator({
                add: <T extends RenderingElement>(element: T): T => {
                    this.elements.push(element)
                
                    return element
                },
            })
        ]

		this.update()

        requestAnimationFrame(() => {
            this.update()
        })
	}

    private handleContext(context: any) {
        let unfinishedContexts: any[] = []

        let result = context.next()

        while(!result.done && result.value !== null) {
            unfinishedContexts = unfinishedContexts.concat(this.handleContext(result.value))

            result = context.next()
        }

        if(!result.done) {
            unfinishedContexts.unshift(context)
        }

        return unfinishedContexts
    }

    public update() {
        let unfinishedContexts: any[] = []

        for(const context of this.contexts) {
            unfinishedContexts = unfinishedContexts.concat(this.handleContext(context))
        }

        this.contexts = unfinishedContexts

        this.render()

        if(this.contexts.length === 0) {
            this.elements = []

            this.contexts = [
                this.generator({
                    add: (element: any) => {
                        this.elements.push(element)

                        return element
                    },
                })
            ]
        }

        requestAnimationFrame(() => {
            this.update()
        })
    }

	public render() {
        this.renderer.render(this.elements)
	}
}

export async function player(canvas: HTMLCanvasElement, camera: Camera2D, generator: any): Promise<Player> {
	const player = new Player(canvas, generator)
    
    await player.setup(camera)
    
    return player
}
