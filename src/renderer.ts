import { mat4, vec3 } from 'gl-matrix'
import { Rect } from './elements/rect.ts';
import { Ellipse } from './elements/ellipse.ts';
import { RenderingElement } from "./elements/element.ts";

export class Camera {
    public position: vec3 = vec3.fromValues(0, 0, 3)
    public target: vec3 = vec3.fromValues(0, 0, 0)
    public up: vec3 = vec3.fromValues(0, 1, 0)

    public fovY = Math.PI / 4
    public aspect = 1
    public near = 0.1
    public far = 100

    private view = mat4.create()
    private projection = mat4.create()
    private viewProjection = mat4.create()

    getViewProjectionMatrix(): Float32Array {
        mat4.lookAt(this.view, this.position, this.target, this.up)
        mat4.perspective(this.projection, this.fovY, this.aspect, this.near, this.far)
        mat4.multiply(this.viewProjection, this.projection, this.view)
        return this.viewProjection as Float32Array
    }
}

export class Renderer {    
    private canvas: HTMLCanvasElement

    private device: GPUDevice | null = null
    private context: GPUCanvasContext | null = null
    private camera: Camera | null = null
    private cameraBuffer: GPUBuffer | null = null
    private instanceBuffer: GPUBuffer | null = null

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
    }

    public async setup(camera: Camera) {
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
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        const instanceBuffer = device.createBuffer({
            size: 256,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        })

        this.context = context
        this.device = device
        this.camera = camera
        this.cameraBuffer = cameraBuffer
        this.instanceBuffer = instanceBuffer

        Rect.setup(device, cameraBuffer)
        Ellipse.setup(device, cameraBuffer)
    }

    render(elements: RenderingElement[]) {
        if(!this.device || !this.instanceBuffer || !this.context || !this.camera || !this.cameraBuffer) throw new Error('Renderer is not setup!')

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

        this.camera.aspect = this.canvas.width / this.canvas.height

        this.device.queue.writeBuffer(this.cameraBuffer, 0, this.camera.getViewProjectionMatrix())

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
