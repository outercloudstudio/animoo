import { OptionallyReactable, react, Reactive } from "../react.ts"
import { Vector2, Vector4 } from "../vector.ts"
import { RenderingElement } from "./element.ts";
import { Font, Glyph } from "../font.ts";

import earcut from 'earcut';

type Line = { start: { x: number, y: number }, end: { x: number, y: number }, control?: { x: number, y: number } }
type Contour = { cutout: boolean, lines: Line[] }

export class Letter implements RenderingElement {
    private static renderPipeline: GPURenderPipeline | null = null
    private static cameraBindGroup: GPUBindGroup | null = null
    
    public font: Reactive<Font | null> = react(null)
    public character: Reactive<string> = react('a')
    public position: Reactive<Vector2> = react(new Vector2(0, 0))
    public origin: Reactive<Vector2> = react(new Vector2(0, 0))
    public positionMode: Reactive<'normal' | 'box'> = react('normal')
    public size: Reactive<Vector2> = react(new Vector2(100, 100))
    public rotation: Reactive<number> = react(0)
    public color: Reactive<Vector4> = react(new Vector4(1, 1, 1, 1))
    public order: Reactive<number> = react(0)
    
    private vertexBuffer: GPUBuffer | null = null
    private cachedFont: Font | null = null
    private cachedCharacter: string | null = null
    private cachedVertexData: number[] | null = null

    public constructor(options: {
        font?: OptionallyReactable<Font>
        character?: OptionallyReactable<string>
        position?: OptionallyReactable<Vector2>
        origin?: OptionallyReactable<Vector2>
        positionMode?: OptionallyReactable<'normal' | 'box'>
        size?: OptionallyReactable<Vector2>
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
            @location(4) origin: vec2f,
            @location(5) positionMode: u32,
            @location(6) size: vec2f,
            @location(7) rotation: f32,
            @location(8) color: vec4f,
            @location(9) unitsPerEm: f32,
            @location(10) xBounds: vec2f,
            @location(11) yBounds: vec2f,
        }

        struct VertexOut {
            @builtin(position) position : vec4f,

            @location(0) color : vec4f,
            @location(1) uv : vec2f,
            @location(2) mode : f32,
        }

        @vertex
        fn vertex_main(input: VertexInput) -> VertexOut {
            var output : VertexOut;

            var offset = -input.origin * input.unitsPerEm;

            if(input.positionMode == 1) {
                offset = input.origin * vec2f(input.xBounds.x - input.xBounds.y, input.yBounds.x - input.yBounds.y);
            }

            let local_position = (input.vertex_position + offset) / input.unitsPerEm * 96.0 / 72.0 * input.size;

            let c = cos(input.rotation);
            let s = sin(input.rotation);

            let rotated_position = vec2f(
                local_position.x * c - local_position.y * s,
                local_position.x * s + local_position.y * c
            );

            let world_position = rotated_position + input.position - camera.position;

            let camera_c = cos(-camera.rotation);
            let camera_s = sin(-camera.rotation);
            let rotated_view_position = vec2f(
                world_position.x * camera_c - world_position.y * camera_s,
                world_position.x * camera_s + world_position.y * camera_c
            );
            output.position = vec4f(rotated_view_position / vec2f(1920.0 / 2.0, 1200.0 / 2.0), 0.0, 1.0 / camera.scale);

            output.color = input.color;
            output.uv = input.uv;
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
                        shaderLocation: 8,
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
                        offset: 24,
                        format: "float32x2",
                    },
                    {
                        shaderLocation: 6,
                        offset: 32,
                        format: "float32x2",
                    },
                    {
                        shaderLocation: 10,
                        offset: 40,
                        format: "float32x2",
                    },
                    {
                        shaderLocation: 11,
                        offset: 48,
                        format: "float32x2",
                    },
                    {
                        shaderLocation: 7,
                        offset: 56,
                        format: "float32",
                    },
                    {
                        shaderLocation: 5,
                        offset: 60,
                        format: "uint32",
                    },
                    {
                        shaderLocation: 9,
                        offset: 64,
                        format: "float32",
                    },
                ],
                arrayStride: 68,
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
        this.cameraBindGroup = cameraBindGroup
    }

    private buildMesh(device: GPUDevice, passEncoder: GPURenderPassEncoder, instanceBuffer: GPUBuffer, instancePointer: number): number[] {
        const font = this.font.value
        const character = this.character.value

        if(font === this.cachedFont && character === this.cachedCharacter && this.cachedVertexData) return this.cachedVertexData

        if(!font) throw new Error('Tried to render Letter with no font!')

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

                        insideCurveVertexData = insideCurveVertexData.concat([ line.start.x, line.start.y, 0, 0, 2, line.control.x, line.control.y, 0.5, 0, 2, line.end.x, line.end.y, 1, 1, 2])
                    } else {
                        outsideCurveVertexData = outsideCurveVertexData.concat([ line.start.x, line.start.y, 0, 0, 1, line.control.x, line.control.y, 0.5, 0, 1, line.end.x, line.end.y, 1, 1, 1])
                    }
                }
            }

            const lastLine = contour.lines[contour.lines.length - 1]
            vertices = vertices.concat([ lastLine.end.x, lastLine.end.y ])
        }

        const triangles = earcut(vertices, holes)

        const vertexData = triangles.flatMap(index => [vertices[index * 2], vertices[index * 2 + 1], 0, 0, 0]).concat(outsideCurveVertexData).concat(insideCurveVertexData)

        this.cachedFont = font
        this.cachedCharacter = character
        this.cachedVertexData = vertexData
        
        return vertexData
    }

    public requestInstanceBufferSize(): number {
        return 68
    }

    public render(device: GPUDevice, passEncoder: GPURenderPassEncoder, instanceBuffer: GPUBuffer, instancePointer: number): number {
        if(!Letter.renderPipeline || !Letter.cameraBindGroup) throw new Error('Letter is not setup!')
        
        const font = this.font.value
        const character = this.character.value

        if(!font) throw new Error('Tried to render Letter with no font!')

        const glyph = font.getGlyph(character)

        if(!glyph) throw new Error('Failed to load glyphs!')

        const position = this.position.value
        const positionMode = this.positionMode.value
        const origin = this.origin.value
        const size = this.size.value
        const rotation = this.rotation.value
        const color = this.color.value

        const vertices = this.buildMesh(device, passEncoder, instanceBuffer, instancePointer)

        const vertexData = new Float32Array(vertices)

        if(!this.vertexBuffer || vertexData.byteLength > this.vertexBuffer.size) {
            if(this.vertexBuffer) this.vertexBuffer.destroy()

            this.vertexBuffer = device.createBuffer({
                size: vertexData.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            })
        }

        device.queue.writeBuffer(this.vertexBuffer, 0, vertexData, 0, vertexData.length)

        const instance = new Float32Array([ color.x, color.y, color.z, color.w, position.x, position.y, origin.x, origin.y, size.x, size.y, glyph.xMin, glyph.xMax, glyph.yMin, glyph.yMax, rotation, 0, font.unitsPerEm ])
        const instance2 = new Uint32Array([ positionMode === 'box' ? 1 : 0 ])

        device.queue.writeBuffer(instanceBuffer, instancePointer, instance, 0, instance.length)
        device.queue.writeBuffer(instanceBuffer, instancePointer + 15 * 4, instance2, 0, instance2.length)

        passEncoder.setPipeline(Letter.renderPipeline)
        passEncoder.setBindGroup(0, Letter.cameraBindGroup)
        passEncoder.setVertexBuffer(0, this.vertexBuffer)
        passEncoder.setVertexBuffer(1, instanceBuffer, instancePointer, instance.byteLength)
        passEncoder.draw(vertices.length / 5, 1)

        return instance.byteLength
	}

    public spacing(): { width: number, height: number, right: number, left: number } {
        const font = this.font.value
        const character = this.character.value

        if(!font) throw new Error('Tried to render Letter with no font!')

        const glyph = font.getGlyph(character)

        if(!glyph) throw new Error('Failed to load glyphs!')

        const size = this.size.value

        return { width: glyph.width / font.unitsPerEm * size.x * 96 / 72, height: glyph.height / font.unitsPerEm * size.x * 96 / 72, right: glyph.rsb / font.unitsPerEm * size.x * 96 / 72, left: glyph.lsb / font.unitsPerEm * size.x * 96 / 72 }
    }
}