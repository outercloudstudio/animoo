import { vec2 } from 'gl-matrix'
import { Rect } from './elements/rect.ts';
import { Ellipse } from './elements/ellipse.ts';
import { RenderingElement } from "./elements/element.ts";
import { Spline } from "./elements/spline.ts";
import { Triangle } from "./elements/triangle.ts";
import { Letter } from "./elements/letter.ts";

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

        Rect.setup(device, cameraBuffer)
        Ellipse.setup(device, cameraBuffer)
        Spline.setup(device, cameraBuffer)
        Triangle.setup(device, cameraBuffer)
        Letter.setup(device, cameraBuffer)
    }

    render(elements: RenderingElement[], camera: Camera2DTransform) {        
        if(!this.device || !this.instanceBuffer || !this.context || !this.cameraBuffer) throw new Error('Renderer is not setup!')

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

        const clearColor = { r: 0, g: 0, b: 0, a: 1 }

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
            instanceBufferPointer += element.render(this.device, passEncoder, this.instanceBuffer, instanceBufferPointer)
        }

        passEncoder.end()

        this.device.queue.submit([commandEncoder.finish()])
    }
}
