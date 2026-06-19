import { OptionallyReactable, react, Reactive } from "../react.ts"
import { Vector2, Vector4 } from "../vector.ts"
import { RenderingElement } from "./element.ts";
import { Font } from "../font.ts";

import { vec2 } from 'gl-matrix'
import earcut from 'earcut';

type Line = { start: { x: number, y: number }, end: { x: number, y: number }, control?: { x: number, y: number } }
type Contour = { cutout: boolean, lines: Line[] }

export class Letter implements RenderingElement {
    private static renderPipeline: GPURenderPipeline | null = null
    private static cameraBindGroup: GPUBindGroup | null = null
    private static vertexBuffer: GPUBuffer | null = null

    public font: Reactive<Font | null> = react(null)
    public character: Reactive<string> = react('a')
    public position: Reactive<Vector2> = react(new Vector2(0, 0))
    public size: Reactive<number> = react(100)
    public rotation: Reactive<number> = react(0)
    public color: Reactive<Vector4> = react(new Vector4(1, 1, 1, 1))
    public order: Reactive<number> = react(0)

    public constructor(options: {
        font?: OptionallyReactable<Font>
        character?: OptionallyReactable<string>
        position?: OptionallyReactable<Vector2>
        size?: OptionallyReactable<number>
        rotation?: OptionallyReactable<number>
        color?: OptionallyReactable<Vector4>
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
            @location(0) vertex_position: vec2f,
            @location(1) uv: vec2f,
            @location(2) mode: f32,

            @location(3) position: vec2f,
            @location(4) size: f32,
            @location(5) rotation: f32,
            @location(6) color: vec4f,
        }

        struct VertexOut {
            @builtin(position) position : vec4f,

            @location(0) color : vec4f,
            @location(1) vertex_position : vec2f,
            @location(2) uv : vec2f,
            @location(3) size : f32,
            @location(4) mode : f32,
        }

        @vertex
        fn vertex_main(input: VertexInput) -> VertexOut {
            var output : VertexOut;

            // let local_position = input.vertex_position * input.size;
            // let c = cos(input.rotation);
            // let s = sin(input.rotation);

            // let rotated_position = vec2f(
            //     local_position.x * c - local_position.y * s,
            //     local_position.x * s + local_position.y * c
            // );

            // let world_position = rotated_position + input.position - camera.position;

            // let camera_c = cos(-camera.rotation);
            // let camera_s = sin(-camera.rotation);
            // let rotated_view_position = vec2f(
            //     world_position.x * camera_c - world_position.y * camera_s,
            //     world_position.x * camera_s + world_position.y * camera_c
            // );
            // output.position = vec4f(rotated_view_position / vec2f(1920.0 / 2.0, 1200.0 / 2.0), 0.0, 1.0 / camera.scale);

            let local_position = input.vertex_position;
            output.position = vec4f(local_position / vec2f(1920.0 / 2.0, 1200.0 / 2.0), 0.0, 1.0 / camera.scale);

            output.color = input.color;
            output.vertex_position = input.vertex_position;
            output.uv = input.uv;
            output.size = input.size;
            output.mode = input.mode;

            return output;
        }

        @fragment
        fn fragment_main(input: VertexOut) -> @location(0) vec4f {
            if(input.mode == 1.0) {
                if(input.uv.x * input.uv.x > input.uv.y) {
                    discard;
                }
            }

            if(input.mode == 2.0) {
                if(input.uv.x * input.uv.x < input.uv.y) {
                    discard;
                }
            }

            return input.color;
        }
        `

        const shaderModule = device.createShaderModule({
            code: shaders,
        })

        const vertexBuffer = device.createBuffer({
            size: 256,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        })

        const vertexBuffers: GPUVertexBufferLayout[] = [
            {
                attributes: [
                    {
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x2",
                    },
                    {
                        shaderLocation: 1,
                        offset: 8,
                        format: "float32x2",
                    },
                    {
                        shaderLocation: 2,
                        offset: 16,
                        format: "float32",
                    },
                ],
                arrayStride: 20,
                stepMode: "vertex",
            },
            {
                attributes: [
                    {
                        shaderLocation: 6,
                        offset: 0,
                        format: "float32x4",
                    },
                    {
                        shaderLocation: 3,
                        offset: 16,
                        format: "float32x2",
                    },
                    {
                        shaderLocation: 4,
                        offset: 16 + 8,
                        format: "float32",
                    },
                    {
                        shaderLocation: 5,
                        offset: 16 + 8 + 4,
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

    private buildMesh(device: GPUDevice, passEncoder: GPURenderPassEncoder, instanceBuffer: GPUBuffer, instancePointer: number): number[] {
        const font = this.font.value
        const character = this.character.value
        const size = this.size.value

        if(!font) throw new Error('Tried to render Letter with no font!')

        const scaler = 1 / font.unitsPerEm * 96 / 72 * size

        const glyph = font.getGlyph(character)

        if(!glyph) throw new Error('Failed to load glyphs!')

        let contours: Contour[] = []

        let contourStart = 0
        for(const contourEnd of glyph.endPtsOfContours) {
            const contour: Contour = {
                cutout: false,
                lines: []
            }

            const firstPoint = glyph.points[contourStart]

            let area = 0

            let lastPoint: { x: number, y: number } | null = null
            let lastControl: { x: number, y: number } | null = null
            for(let pointIndex = contourStart; pointIndex <= contourEnd + 1; pointIndex++) {
                const point = pointIndex > contourEnd ? firstPoint : glyph.points[pointIndex]

                if(point.onCurve) {
                    if(lastPoint) {
                        area += 1 / 2 * (lastPoint.x * point.y - point.x * lastPoint.y)

                        if(lastControl) {
                            contour.lines.push({
                                start: lastPoint,
                                end: point,
                                control: lastControl
                            })
                        } else {
                            contour.lines.push({
                                start: lastPoint,
                                end: point
                            })
                        }
                    }

                    lastPoint = point
                    lastControl = null
                } else {
                    if(lastControl) {
                        const midPoint = {
                            x: lastControl.x / 2 + point.x / 2,
                            y: lastControl.y / 2 + point.y / 2
                        }

                        if(lastPoint) {
                            area += 1 / 2 * (lastPoint.x * midPoint.y - midPoint.x * lastPoint.y)

                            contour.lines.push({
                                start: lastPoint,
                                end: midPoint,
                                control: lastControl
                            })
                        }

                        lastPoint = midPoint
                    }

                    lastControl = point
                }
            }

            contour.cutout = area > 0
                        
            contours.push(contour)

            contourStart = contourEnd + 1
        }

        contours = contours.sort((a, b) => (a.cutout ? 1 : 0) - (b.cutout ? 1 : 0))
        
        let vertices: number[] = []
        const holes: number[] = []

        let outsideCurveVertexData: number[] = []
        let insideCurveVertexData: number[] = []

        for(const contour of contours) {
            if(contour.cutout) holes.push(vertices.length / 2)

            for(const line of contour.lines) {
                vertices = vertices.concat([ line.start.x, line.start.y ])

                if(line.control) {
                    const area = (line.control.x - line.start.x) * (line.end.y - line.start.y) - (line.control.y - line.start.y) * (line.end.x - line.start.x)

                    if(area > 0) {
                        vertices = vertices.concat([ line.control.x, line.control.y ])

                        insideCurveVertexData = insideCurveVertexData.concat([ line.start.x * scaler, line.start.y * scaler, 0, 0, 2, line.control.x * scaler, line.control.y * scaler, 0.5, 0, 2, line.end.x * scaler, line.end.y * scaler, 1, 1, 2])
                    } else {
                        outsideCurveVertexData = outsideCurveVertexData.concat([ line.start.x * scaler, line.start.y * scaler, 0, 0, 1, line.control.x * scaler, line.control.y * scaler, 0.5, 0, 1, line.end.x * scaler, line.end.y * scaler, 1, 1, 1])
                    }
                }
            }

            const lastLine = contour.lines[contour.lines.length - 1]
            vertices = vertices.concat([ lastLine.end.x, lastLine.end.y ])
        }

        const triangles = earcut(vertices, holes)

        return triangles.flatMap(index => [vertices[index * 2] * scaler, vertices[index * 2 + 1] * scaler, 0, 0, 0]).concat(outsideCurveVertexData).concat(insideCurveVertexData)
    }

    public requestInstanceBufferSize(): number {
        return 2 + 1 + 1 + 4
    }

    public render(device: GPUDevice, passEncoder: GPURenderPassEncoder, instanceBuffer: GPUBuffer, instancePointer: number): number {
        if(!Letter.renderPipeline || !Letter.cameraBindGroup || !Letter.vertexBuffer) throw new Error('Letter is not setup!')
        
        const position = this.position.value
        const size = this.size.value
        const rotation = this.rotation.value
        const color = this.color.value

        const vertices = this.buildMesh(device, passEncoder, instanceBuffer, instancePointer)

        const vertexData = new Float32Array(vertices)

        if(vertexData.byteLength > Letter.vertexBuffer.size) {
            Letter.vertexBuffer.destroy()

            Letter.vertexBuffer = device.createBuffer({
                size: vertexData.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            })
        }

        device.queue.writeBuffer(Letter.vertexBuffer, 0, vertexData, 0, vertexData.length)

        const instance = new Float32Array([ color.x, color.y, color.z, color.w, position.x, position.y, size, rotation ])

        device.queue.writeBuffer(instanceBuffer, instancePointer, instance, 0, instance.length)

        passEncoder.setPipeline(Letter.renderPipeline)
        passEncoder.setBindGroup(0, Letter.cameraBindGroup)
        passEncoder.setVertexBuffer(0, Letter.vertexBuffer)
        passEncoder.setVertexBuffer(1, instanceBuffer, instancePointer, instance.byteLength)
        passEncoder.draw(vertices.length / 5, 1)

        return instance.byteLength
	}
}