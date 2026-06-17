import { OptionallyReactable, react, Reactive } from "../react.ts"
import { Vector2, Vector4 } from "../vector.ts"
import { RenderingElement } from "./element.ts";

export class Spline implements RenderingElement {
    private static renderPipeline: GPURenderPipeline | null = null
    private static cameraBindGroup: GPUBindGroup | null = null
    private static vertexBuffer: GPUBuffer | null = null

    public positionA: Reactive<Vector2> = react(new Vector2(-100, -100))
    public positionB: Reactive<Vector2> = react(new Vector2(-100, 100))
    public positionC: Reactive<Vector2> = react(new Vector2(100, 100))
    public color: Reactive<Vector4> = react(new Vector4(1, 1, 1, 1))
    public size: Reactive<number> = react(10)
    public radius: Reactive<number> = react(0)
    public order: Reactive<number> = react(0)

    public constructor(options: {
        positionA?: OptionallyReactable<Vector2>
        positionB?: OptionallyReactable<Vector2>
        positionC?: OptionallyReactable<Vector2>
        color?: OptionallyReactable<Vector4>
        size?: OptionallyReactable<number>
        radius?: OptionallyReactable<number>
        order?: OptionallyReactable<number>
    }) {
        for (const key of Object.keys(options)) {
            //@ts-ignore
            this[key] = react(options[key])
        }
    }

    public static setup(device: GPUDevice, cameraBuffer: GPUBuffer) {
        const shaders = `
        struct Camera {
            position: vec2f,
            rotation: f32,
            scale: f32,
        }

        @group(0) @binding(0) var<uniform> camera: Camera;

        struct VertexInput {
            @location(0) uv: vec2f,

            @location(1) positionA: vec2f,
            @location(2) positionB: vec2f,
            @location(3) positionC: vec2f,
            @location(4) color: vec4f,
            @location(5) size: f32,
            @location(6) radius: f32,
        }

        struct VertexOut {
            @builtin(position) position : vec4f,

            @location(0) color : vec4f,
            @location(1) uv : vec2f,
            @location(2) positionA : vec2f,
            @location(3) positionB : vec2f,
            @location(4) positionC : vec2f,
            @location(5) size : f32,
            @location(6) radius: f32,
        }

        @vertex
        fn vertex_main(input: VertexInput) -> VertexOut {
            var output : VertexOut;

            output.position = vec4f(input.uv, 0.0, 3.0);

            output.color = input.color;
            output.uv = input.uv;
            output.size = input.size;
            output.radius = input.radius;

            return output;
        }

        @fragment
        fn fragment_main(input: VertexOut) -> @location(0) vec4f {
            let position = camera.position;

            return input.color;
        }
        `

        const shaderModule = device.createShaderModule({
            code: shaders,
        })

        const vertices = new Float32Array([
            0, 0, 
            1, 0,
            0, 1,
            0, 1,
            1, 0,
            1, 1,
        ])

        const vertexBuffer = device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        })

        device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length)

        const vertexBuffers: GPUVertexBufferLayout[] = [
            {
                attributes: [
                    {
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x2",
                    },
                ],
                arrayStride: 8,
                stepMode: "vertex",
            },
            {
                attributes: [
                    {
                        shaderLocation: 4,
                        offset: 0,
                        format: "float32x4",
                    },
                    {
                        shaderLocation: 1,
                        offset: 16,
                        format: "float32x2",
                    },
                    {
                        shaderLocation: 2,
                        offset: 16 + 8,
                        format: "float32x2",
                    },
                    {
                        shaderLocation: 3,
                        offset: 16 + 8 + 8,
                        format: "float32x2",
                    },
                    {
                        shaderLocation: 5,
                        offset: 16 + 8 + 8 + 8,
                        format: "float32",
                    },
                    {
                        shaderLocation: 6,
                        offset: 16 + 8 + 8 + 8 + 4,
                        format: "float32",
                    },
                ],
                arrayStride: 48,
                stepMode: "instance",
            },
        ]

        const pipelineDescriptor: GPURenderPipelineDescriptor = {
            vertex: {
                module: shaderModule,
                entryPoint: "vertex_main",
                buffers: vertexBuffers,
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragment_main",
                targets: [
                    {
                        format: navigator.gpu.getPreferredCanvasFormat(),
                        blend: {
                            color: {
                                operation: "add",
                                srcFactor: "src-alpha",
                                dstFactor: "one-minus-src-alpha",
                            },
                            alpha: {
                                operation: "add",
                                srcFactor: "one",
                                dstFactor: "one-minus-src-alpha",
                            }
                        }
                    },
                ],
            },
            primitive: {
                topology: "triangle-list",
            },
            layout: "auto",
        }

        const renderPipeline = device.createRenderPipeline(pipelineDescriptor)

        const cameraBindGroup = device.createBindGroup({
            layout: renderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: cameraBuffer } },
            ],
        })

        this.renderPipeline = renderPipeline
        this.vertexBuffer = vertexBuffer
        this.cameraBindGroup = cameraBindGroup
    }

    public requestInstanceBufferSize(): number {
        return (2 + 2 + 2 + 1 + 4 + 1) * 4
    }

    public render(device: GPUDevice, passEncoder: GPURenderPassEncoder, instanceBuffer: GPUBuffer, instancePointer: number): number {
        if(!Spline.renderPipeline || !Spline.cameraBindGroup || !Spline.vertexBuffer) throw new Error('Spline is not setup!')
        
        const positionA = this.positionA.value
        const positionB = this.positionB.value
        const positionC = this.positionC.value
        const color = this.color.value
        const size = this.size.value
        const radius = this.radius.value

        const instance = new Float32Array([ color.x, color.y, color.z, color.w, positionA.x, positionA.y, positionB.x, positionB.y, positionC.x, positionC.y, size, radius ])

        device.queue.writeBuffer(instanceBuffer, instancePointer, instance, 0, instance.length)

        passEncoder.setPipeline(Spline.renderPipeline)
        passEncoder.setBindGroup(0, Spline.cameraBindGroup)
        passEncoder.setVertexBuffer(0, Spline.vertexBuffer)
        passEncoder.setVertexBuffer(1, instanceBuffer, instancePointer, instance.byteLength)
        passEncoder.draw(6, 1)

        return instance.byteLength
	}
}