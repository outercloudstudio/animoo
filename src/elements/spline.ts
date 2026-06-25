import { OptionallyReactable, react, Reactive } from "../react.ts"
import { Vector2, Vector4 } from "../vector.ts"
import { RenderingElement } from "./element.ts";

export type SplineRenderState = {
    renderPipeline: GPURenderPipeline
    cameraBindGroup: GPUBindGroup
    vertexBuffer: GPUBuffer
}

export class Spline implements RenderingElement {
    public positionA: Reactive<Vector2> = react(new Vector2(0, 0))
    public positionB: Reactive<Vector2> = react(new Vector2(300, 300))
    public positionC: Reactive<Vector2> = react(new Vector2(300, 0))
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

    public static setup(state: any, device: GPUDevice, cameraBuffer: GPUBuffer) {
        const shaders = `
        struct Camera {
            position: vec2f,
            rotation: f32,
            scale: f32,
        }

        @group(0) @binding(0) var<uniform> camera: Camera;

        struct VertexInput {
            @location(0) uv: vec2f,

            @location(1) position_a: vec2f,
            @location(2) position_b: vec2f,
            @location(3) position_c: vec2f,
            @location(4) color: vec4f,
            @location(5) size: f32,
            @location(6) radius: f32,
        }

        struct VertexOut {
            @builtin(position) position : vec4f,

            @location(0) color : vec4f,
            @location(1) uv : vec2f,
            @location(2) position_a : vec2f,
            @location(3) position_b : vec2f,
            @location(4) position_c : vec2f,
            @location(5) size : f32,
            @location(6) radius: f32,
        }

        @vertex
        fn vertex_main(input: VertexInput) -> VertexOut {
            var output : VertexOut;

            let lower_left = vec2f(min(input.position_a.x, min(input.position_b.x, input.position_c.x)), min(input.position_a.y, min(input.position_b.y, input.position_c.y)));
            let upper_right = vec2f(max(input.position_a.x, max(input.position_b.x, input.position_c.x)), max(input.position_a.y, max(input.position_b.y, input.position_c.y)));
            let size = upper_right - lower_left;

            output.uv = input.uv * (1.0 + input.size * 4 / size) - input.size * 2 / size;

            let world_position = lower_left - vec2f(2 * input.size) + (size + vec2f(4 * input.size)) * input.uv;

            let local_position = world_position - camera.position;

            let camera_c = cos(-camera.rotation);
            let camera_s = sin(-camera.rotation);
            let rotated_view_position = vec2f(
                local_position.x * camera_c - local_position.y * camera_s,
                local_position.x * camera_s + local_position.y * camera_c
            );
            output.position = vec4f(rotated_view_position / vec2f(1920.0 / 2.0, 1200.0 / 2.0), 0.0, 1.0 / camera.scale);

            output.color = input.color;
            output.size = input.size;
            output.radius = input.radius;
            output.position_a = input.position_a;
            output.position_b = input.position_b;
            output.position_c = input.position_c;

            return output;
        }

        fn optimize(t: f32, pixel: vec2f, a: vec2f, b: vec2f, c: vec2f) -> f32 {
            let f_x = a.x + (2 * c.x - 2 * a.x) * t + (a.x + b.x - 2 * c.x) * t * t - pixel.x;
            let f_y = a.y + (2 * c.y - 2 * a.y) * t + (a.y + b.y - 2 * c.y) * t * t - pixel.y;
            let f_p_x = 2 * f_x * (2 * c.x - 2 * a.x + 2 * (a.x + b.x - 2 * c.x) * t);
            let f_p_y = 2 * f_y * (2 * c.y - 2 * a.y + 2 * (a.y + b.y - 2 * c.y) * t);
            let f_p = f_p_x + f_p_y;

            let f_pp = 4 * (2 * c * c - 2 * a * c + a * b - a * c) + 8 * t * (a * c + b * c - 2 * c * c + 2 * c * b - 2 * a * b - 2 * c * c + 2 * a * c) + 12 * t * t * (a * b + b * b - 2 * b * c - a * c - b * c + 2 * c * c);

            return t - f_p / (f_pp.x + f_pp.y);
        }

        @fragment
        fn fragment_main(input: VertexOut) -> @location(0) vec4f {
            let position = camera.position;

            let lower_left = vec2f(min(input.position_a.x, min(input.position_b.x, input.position_c.x)), min(input.position_a.y, min(input.position_b.y, input.position_c.y)));
            let upper_right = vec2f(max(input.position_a.x, max(input.position_b.x, input.position_c.x)), max(input.position_a.y, max(input.position_b.y, input.position_c.y)));

            let pixel = vec2f(lower_left + (upper_right - lower_left) * input.uv);

            var t = 1.0;
            t = optimize(t, pixel, input.position_a, input.position_b, input.position_c);
            t = optimize(t, pixel, input.position_a, input.position_b, input.position_c);
            t = optimize(t, pixel, input.position_a, input.position_b, input.position_c);
            t = optimize(t, pixel, input.position_a, input.position_b, input.position_c);
            t = optimize(t, pixel, input.position_a, input.position_b, input.position_c);
            t = optimize(t, pixel, input.position_a, input.position_b, input.position_c);
            t = optimize(t, pixel, input.position_a, input.position_b, input.position_c);
            t = optimize(t, pixel, input.position_a, input.position_b, input.position_c);
            t = optimize(t, pixel, input.position_a, input.position_b, input.position_c);
            t = optimize(t, pixel, input.position_a, input.position_b, input.position_c);
            t = optimize(t, pixel, input.position_a, input.position_b, input.position_c);
            t = optimize(t, pixel, input.position_a, input.position_b, input.position_c);
            t = optimize(t, pixel, input.position_a, input.position_b, input.position_c);
            t = optimize(t, pixel, input.position_a, input.position_b, input.position_c);

            t = max(min(t, 1.0), 0.0);

            let point = input.position_a + (2 * input.position_c - 2 * input.position_a) * t + (input.position_a + input.position_b - 2 * input.position_c) * t * t;

            let distance = length(pixel - point);

            if(distance > input.size) {
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
            0, 1, 
            1, 1, 
            0, 0, 
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

        state.spline = {
            renderPipeline,
            cameraBindGroup,
            vertexBuffer
        } as SplineRenderState
    }

    public requestInstanceBufferSize(): number {
        return (2 + 2 + 2 + 1 + 4 + 1) * 4
    }

    public render(state: { spline: SplineRenderState | null }, device: GPUDevice, passEncoder: GPURenderPassEncoder, instanceBuffer: GPUBuffer, instancePointer: number): number {
        if(!state.spline) throw new Error('Spline is not setup!')
        
        const positionA = this.positionA.value
        const positionB = this.positionB.value
        const positionC = this.positionC.value
        const color = this.color.value
        const size = this.size.value
        const radius = this.radius.value

        const instance = new Float32Array([ color.x, color.y, color.z, color.w, positionA.x, positionA.y, positionB.x, positionB.y, positionC.x, positionC.y, size, radius ])

        device.queue.writeBuffer(instanceBuffer, instancePointer, instance, 0, instance.length)

        passEncoder.setPipeline(state.spline.renderPipeline)
        passEncoder.setBindGroup(0, state.spline.cameraBindGroup)
        passEncoder.setVertexBuffer(0, state.spline.vertexBuffer)
        passEncoder.setVertexBuffer(1, instanceBuffer, instancePointer, instance.byteLength)
        passEncoder.draw(6, 1)

        return instance.byteLength
	}

    public renderingOrder() {
        return this.order.value
    }
}