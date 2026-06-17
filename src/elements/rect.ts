import { OptionallyReactable, react, Reactive } from "../react.ts"
import { Vector2, Vector4 } from "../vector.ts"
import { RenderingElement } from "./element.ts";

export class Rect implements RenderingElement {
    private static renderPipeline: GPURenderPipeline | null = null
    private static cameraBindGroup: GPUBindGroup | null = null
    private static vertexBuffer: GPUBuffer | null = null

    public position: Reactive<Vector2> = react(new Vector2(0, 0))
    public origin: Reactive<Vector2> = react(new Vector2(0.5, 0.5))
    public size: Reactive<Vector2> = react(new Vector2(100, 100))
    public rotation: Reactive<number> = react(0)
    public color: Reactive<Vector4> = react(new Vector4(1, 1, 1, 1))
    public radius: Reactive<number> = react(0)
    public order: Reactive<number> = react(0)

    public constructor(options: {
        position?: OptionallyReactable<Vector2>
        origin?: OptionallyReactable<Vector2>
        size?: OptionallyReactable<Vector2>
        rotation?: OptionallyReactable<number>
        color?: OptionallyReactable<Vector4>
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
            viewProjection: mat4x4f,
        }

        @group(0) @binding(0) var<uniform> camera: Camera;

        struct VertexInput {
            @location(0) uv: vec2f,

            @location(1) position: vec2f,
            @location(2) origin: vec2f,
            @location(3) size: vec2f,
            @location(4) rotation: f32,
            @location(5) color: vec4f,
            @location(6) radius: f32,
        }

        struct VertexOut {
            @builtin(position) position : vec4f,
            @location(0) color : vec4f,
            @location(1) uv : vec2f,
            @location(2) size : vec2f,
            @location(3) radius : f32,
        }

        @vertex
        fn vertex_main(input: VertexInput) -> VertexOut {
            var output : VertexOut;

            let local_position = (input.uv - input.origin) * input.size;
            let c = cos(input.rotation);
            let s = sin(input.rotation);

            let rotated_position = vec2f(
                local_position.x * c - local_position.y * s,
                local_position.x * s + local_position.y * c
            );

            let world_position = vec4f((rotated_position + input.position) / vec2f(1920.0 / 2.0, 1200.0 / 2.0), 0.0, 1.0);

            output.position = camera.viewProjection * world_position;
            output.position = world_position;

            output.color = input.color;
            output.uv = input.uv;
            output.size = input.size;
            output.radius = input.radius;

            return output;
        }

        @fragment
        fn fragment_main(input: VertexOut) -> @location(0) vec4f {
            let pixel = input.uv * input.size;

            if (pixel.x < input.radius && pixel.y < input.radius && length(pixel - vec2f(input.radius, input.radius)) > input.radius) {
                discard;
            }

            if (pixel.x > input.size.x - input.radius && pixel.y < input.radius && length(pixel - vec2f(input.size.x - input.radius, input.radius)) > input.radius) {
                discard;
            }

            if (pixel.x < input.radius && pixel.y > input.size.y - input.radius && length(pixel - vec2f(input.radius, input.size.y - input.radius)) > input.radius) {
                discard;
            }

            if (pixel.x > input.size.x - input.radius && pixel.y > input.size.y - input.radius && length(pixel - vec2f(input.size.x - input.radius, input.size.y - input.radius)) > input.radius) {
                discard;
            }

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
                        shaderLocation: 5,
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
                        shaderLocation: 4,
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
        if(!Rect.renderPipeline || !Rect.cameraBindGroup || !Rect.vertexBuffer) throw new Error('Rect is not setup!')
        
        const position = this.position.value
        const origin = this.origin.value
        const size = this.size.value
        const rotation = this.rotation.value
        const color = this.color.value
        const radius = this.radius.value

        const instance = new Float32Array([ color.x, color.y, color.z, color.w, position.x, position.y, origin.x, origin.y, size.x, size.y, rotation, radius ])

        device.queue.writeBuffer(instanceBuffer, instancePointer, instance, 0, instance.length)

        passEncoder.setPipeline(Rect.renderPipeline)
        passEncoder.setBindGroup(0, Rect.cameraBindGroup)
        passEncoder.setVertexBuffer(0, Rect.vertexBuffer)
        passEncoder.setVertexBuffer(1, instanceBuffer, instancePointer, instance.byteLength)
        passEncoder.draw(6, 1)

        return instance.byteLength
	}
}