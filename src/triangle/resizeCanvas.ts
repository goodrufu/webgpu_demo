import vertex from './vertex.wgsl?raw'
import fragment from './fragment.wgsl?raw'

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

export const init_resize_canvas = (device: GPUDevice, content: GPUCanvasContext) => {
  const pipline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      entryPoint: 'main',
      module: device.createShaderModule({ code: vertex })
    },
    fragment: {
      entryPoint: 'main',
      module: device.createShaderModule({ code: fragment }),
      targets: [{ format: presentationFormat }]
    },
    primitive: {
      topology: 'triangle-list'
    }
  })

  const frame = () => {
    const commandEncoder = device.createCommandEncoder()
    const textureView = content.getCurrentTexture().createView()

    const renderPassDesc: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.2, g: 0.2, b: 0.2, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store'
        }
      ]
    }

    const passEnCoder = commandEncoder.beginRenderPass(renderPassDesc)
    passEnCoder.setPipeline(pipline)
    passEnCoder.draw(3, 1, 0, 0)
    passEnCoder.end()

    device.queue.submit([commandEncoder.finish()])
  }
  requestAnimationFrame(frame)
}
