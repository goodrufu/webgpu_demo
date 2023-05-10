import vertex from './vertex.wgsl?raw'
import fragment from './fragment.wgsl?raw'

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

export const init_triangle = (device: GPUDevice, content: GPUCanvasContext) => {
  const pipline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({ code: vertex }),
      entryPoint: 'main'
    },
    fragment: {
      module: device.createShaderModule({ code: fragment }),
      entryPoint: 'main',
      targets: [
        { format: presentationFormat }
      ]
    },
    primitive: {
      topology: 'triangle-list'
    }
  })

  const frame = () => {
    const commandEncoder = device.createCommandEncoder()
    const textureView = content.getCurrentTexture().createView()

    const renderPassDesc: GPURenderPassDescriptor = {
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    }

    const passEncoder = commandEncoder.beginRenderPass(renderPassDesc)
    passEncoder.setPipeline(pipline)
    passEncoder.draw(3, 1, 0, 0)
    passEncoder.end()

    device.queue.submit([commandEncoder.finish()])

    // requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
}
