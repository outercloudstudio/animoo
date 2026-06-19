import { Camera2D } from "./camera.ts";
import { RenderingElement } from "./elements/element.ts";
import { Renderer } from "./renderer.ts";
import { Vector4 } from "./vector.ts";
import { Output, Mp4OutputFormat, BufferTarget,CanvasSource, QUALITY_HIGH,} from 'mediabunny'

export class VideoRenderer {
	private canvas: HTMLCanvasElement
	private generator: any 
    private output: Output<Mp4OutputFormat, BufferTarget>
    private videoSource: CanvasSource

	private contexts: any[] = []
	private elements: RenderingElement[] = []

    private camera: Camera2D = new Camera2D()
    private renderer: Renderer
    private background: Vector4 = new Vector4(0, 0, 0, 1)

    private currentTick: number = 0

	constructor(generator: any) {
		this.canvas = document.createElement("canvas")
        this.canvas.width = 1920
        this.canvas.height = 1200
		this.generator = generator

        this.renderer = new Renderer(this.canvas)

        const output = new Output({
            format: new Mp4OutputFormat(),
            target: new BufferTarget(),
        });

        const videoSource = new CanvasSource(this.canvas, {
            codec: 'avc',
            bitrate: QUALITY_HIGH,
        });
        
        output.addVideoTrack(videoSource)

        this.output = output
        this.videoSource = videoSource
	}

    public async setup() {
        await this.renderer.setup()
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

    public async update(): Promise<boolean> {
        this.tick()

        this.currentTick++

        await this.render()

        return this.contexts.length === 0
    }

	public async render() {
        this.renderer.render(this.elements, this.camera.toTransform(), this.background)

        await this.videoSource.add(this.currentTick / 60, 1 / 60)
	}

    public async go() {
        await this.output.start();

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

        while(true) {
            const complete = await this.update()

            console.log(this.currentTick)
            
            await new Promise((res) => requestAnimationFrame(res))

            if(complete) break
        }

        await this.output.finalize()

        const blob = new Blob([this.output.target.buffer!], { type: "video/mp4" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "output.mp4"
        a.click()
        URL.revokeObjectURL(url)
    }
}
