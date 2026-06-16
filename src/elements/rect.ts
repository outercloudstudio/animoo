import { OptionallyReactable, react, Reactive } from "../react.ts"
import { Vector2, Vector4 } from "../vector.ts"

export class Rect {
    private static renderPipeline: any = null
    
    private static cameraBindGroup: any = null
    private static vertexBuffer: any = null

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

        struct VertexOut {
            @builtin(position) position : vec4f,
            @location(0) color : vec4f
        }

        @vertex
        fn vertex_main(@location(0) position: vec4f, @location(1) color: vec4f) -> VertexOut {
            var output : VertexOut;
            output.position = camera.viewProjection * position;
            output.color = color;
            return output;
        }

        @fragment
        fn fragment_main(fragData: VertexOut) -> @location(0) vec4f {
            return fragData.color;
        }
        `

        const shaderModule = device.createShaderModule({
            code: shaders,
        })

        const vertices = new Float32Array([
            -0.5, 0.5, 0, 1,
            1, 0, 0, 1,

            -0.5, -0.5, 0,
            1, 0, 1, 0, 1,

            0.5, -0.5, 0, 1,
            0, 0, 1, 1,


            -0.5, 0.5, 0, 1,
            1, 0, 0, 1,

            0.5, -0.5, 0, 1,
            0, 0, 1, 1,

            0.5, 0.5, 0, 1,
            1, 1, 1, 1,
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
                        format: "float32x4",
                    },
                    {
                        shaderLocation: 1,
                        offset: 16,
                        format: "float32x4",
                    },
                ],
                arrayStride: 32,
                stepMode: "vertex",
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

    public render(device: GPUDevice, passEncoder: GPURenderPassEncoder) {
        passEncoder.setPipeline(Rect.renderPipeline)
        passEncoder.setBindGroup(0, Rect.cameraBindGroup)
        passEncoder.setVertexBuffer(0, Rect.vertexBuffer)
        passEncoder.draw(6)
	}
}