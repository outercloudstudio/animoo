import { vec2 } from 'gl-matrix'
import { Rect, RectRenderState } from './elements/rect.ts';
import { Ellipse, EllipseRenderState } from './elements/ellipse.ts';
import { RenderingElement } from "./elements/element.ts";
import { Spline, SplineRenderState } from "./elements/spline.ts";
import { Triangle, TriangleRenderState } from "./elements/triangle.ts";
import { Letter, LetterRenderState } from "./elements/letter.ts";
import { Vector4 } from "./vector.ts";

export interface Camera2DTransform {
    position: vec2
    rotation: number
    scale: number
}

export class Renderer {    
    private canvas: HTMLCanvasElement

    private device: GPUDevice | null = null
    private context: GPUCanvasContext | null = null
    private cameraBuffer: GPUBuffer | null = null
    private instanceBuffer: GPUBuffer | null = null
    private state: { rect: RectRenderState | null, ellipse: EllipseRenderState | null, spline: SplineRenderState | null, triangle: TriangleRenderState | null, letter: LetterRenderState | null } = {
        rect: null,
        ellipse: null,
        spline: null,
        triangle: null,
        letter: null,
    }

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
    }

    public async setup() {
        const adapter = await navigator.gpu.requestAdapter()

        if (!adapter) throw new Error("Could not get WebGpu adapater!")

        const device = await adapter.requestDevice()

        const context = this.canvas.getContext("webgpu") as GPUCanvasContext | null

        if (!context) throw new Error("Could not get WebGpu canvas context!")

        context.configure({
            device,
            format: navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: "premultiplied",
        })

        const cameraBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        const instanceBuffer = device.createBuffer({
            size: 256,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        })

        this.context = context
        this.device = device
        this.cameraBuffer = cameraBuffer
        this.instanceBuffer = instanceBuffer

        Rect.setup(this.state, device, cameraBuffer)
        Ellipse.setup(this.state, device, cameraBuffer)
        Spline.setup(this.state, device, cameraBuffer)
        Triangle.setup(this.state, device, cameraBuffer)
        Letter.setup(this.state, device, cameraBuffer)
    }

    render(elements: RenderingElement[], camera: Camera2DTransform, background: Vector4) {        
        if(!this.device || !this.instanceBuffer || !this.context || !this.cameraBuffer) throw new Error('Renderer is not setup!')

        elements = elements.toSorted((a, b) => a.renderingOrder() - b.renderingOrder())

        let requestedInstanceBufferSize = 0

        for(const element of elements) {
            requestedInstanceBufferSize += element.requestInstanceBufferSize()
        }

        if(requestedInstanceBufferSize > this.instanceBuffer.size) {
            this.instanceBuffer.destroy()

            this.instanceBuffer = this.device.createBuffer({
                size: requestedInstanceBufferSize,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            })
        }

        this.device.queue.writeBuffer(this.cameraBuffer, 0, new Float32Array([camera.position[0], camera.position[1], camera.rotation, camera.scale]))

        const commandEncoder = this.device.createCommandEncoder()

        const clearColor = { r: background.x, g: background.y, b: background.z, a: background.w }

        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    clearValue: clearColor,
                    loadOp: "clear",
                    storeOp: "store",
                    view: this.context.getCurrentTexture().createView(),
                },
            ],
        }

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)

        let instanceBufferPointer = 0
        for(const element of elements) {
            instanceBufferPointer += element.render(this.state, this.device, passEncoder, this.instanceBuffer, instanceBufferPointer)
        }

        passEncoder.end()

        this.device.queue.submit([commandEncoder.finish()])
    }
}
