export interface RenderingElement {
    requestInstanceBufferSize(): number

    render(device: GPUDevice, passEncoder: GPURenderPassEncoder, instanceBuffer: GPUBuffer, instancePointer: number): number

    renderingOrder(): number
}