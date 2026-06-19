import { Camera2D } from "./camera.ts";
import { RenderingElement } from "./elements/element.ts";
import { Renderer } from "./renderer.ts";
import { Vector4 } from "./vector.ts";

export class Player {
	private canvas: HTMLCanvasElement
	private generator: any

	private contexts: any[] = []
	private elements: RenderingElement[] = []

    private camera: Camera2D = new Camera2D()
    private renderer: Renderer
    private background: Vector4 = new Vector4(0, 0, 0, 1)
    
    private start = Date.now()
    private lastTick = 0
    private last = Date.now()
    private averageFps = 0

	constructor(canvas: HTMLCanvasElement, generator: any) {
		this.canvas = canvas
		this.generator = generator

        this.renderer = new Renderer(canvas)
	}

    public async setup() {
        await this.renderer.setup()
    }

	public play() {
        this.start = Date.now()
        this.lastTick = 0
        this.camera = new Camera2D()
		this.contexts = [
            this.generator({
                camera: this.camera,
                add: <T extends RenderingElement>(element: T): T => {
                    this.elements.push(element)
                
                    return element
                },
                background: (color: Vector4) => {
                    this.background = color
                }
            })
        ]

		this.update()
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
    
    public tick() {
        let unfinishedContexts: any[] = []

        for(const context of this.contexts) {
            unfinishedContexts = unfinishedContexts.concat(this.handleContext(context))
        }

        this.contexts = unfinishedContexts
    }

    public update() {
        const targetTick = Math.max(Math.floor((Date.now() - this.start) / 1000 * 60), 1)

        for(let i = this.lastTick; i < targetTick; i++) {
            this.tick()
        }

        this.lastTick = targetTick

        this.render()

        if(this.contexts.length === 0) {
            this.elements = []

            this.start = Date.now()
            this.lastTick = 0
            this.camera = new Camera2D()
            this.contexts = [
                this.generator({
                    camera: this.camera,
                    add: (element: any) => {
                        this.elements.push(element)

                        return element
                    },
                    background: (color: Vector4) => {
                        this.background = color
                    }
                })
            ]
        }

        requestAnimationFrame(() => {
            this.update()
        })
    }

	public render() {
        const now = Date.now()
        const delta = (now - this.last) / 1000

        this.averageFps = Math.min(this.averageFps * 0.9 + (1 / delta) * 0.1, 999)

        // console.log(`FPS ${this.averageFps}`)

        this.last = now

        this.renderer.render(this.elements, this.camera.toTransform(), this.background)
	}
}

export async function player(canvas: HTMLCanvasElement, generator: any): Promise<Player> {
	const player = new Player(canvas, generator)
    
    await player.setup()
    
    return player
}
