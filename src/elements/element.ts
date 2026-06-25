export interface RenderingElement {
    requestInstanceBufferSize(): number

    render(state: any, device: GPUDevice, passEncoder: GPURenderPassEncoder, instanceBuffer: GPUBuffer, instancePointer: number): number

    renderingOrder(): number
}