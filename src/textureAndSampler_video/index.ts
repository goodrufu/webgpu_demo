import wgsl from './index.wgsl?raw'
import videoUrl from './1.mp4?url'

async function init_device() {
  const canvas = document.querySelector('canvas')
  if (!canvas) { throw new Error('找不到canvas节点') }
  if (!navigator.gpu) { throw new Error('该浏览器不支持WebGPU') }

  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) { throw new Error('初始化失败') }

  const device = await adapter.requestDevice()
  if (!device) { throw new Error('初始化失败') }

  const context = canvas.getContext('webgpu')
  if (!context) { throw new Error('初始化失败') }

  const devicePixelRatio = window.devicePixelRatio || 1
  canvas.width = canvas.clientWidth * devicePixelRatio
  canvas.height = canvas.clientHeight * devicePixelRatio

  const format = navigator.gpu.getPreferredCanvasFormat()

  context.configure({
    device,
    format,
    alphaMode: 'premultiplied'
  })

  return { device, context, format }
}

async function init_pipeline(device: GPUDevice, format: GPUTextureFormat) {
  const pipeline = await device.createRenderPipelineAsync({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({ code: wgsl }),
      entryPoint: 'vertex_main'
    },
    fragment: {
      module: device.createShaderModule({ code: wgsl }),
      entryPoint: 'fragment_main',
      targets: [{ format }]
    },
    primitive: {
      topology: 'triangle-list'
    }
  })

  return { pipeline }
}

async function init_video() {
  const videoDom = document.createElement('video')
  videoDom.loop = true
  videoDom.muted = true
  videoDom.autoplay = true
  videoDom.src = videoUrl
  await videoDom.play()

  return { videoDom }
}

async function draw(device: GPUDevice, context: GPUCanvasContext, pipeline: GPURenderPipeline, textureGroup: GPUBindGroup) {
  const commandEncoder = device.createCommandEncoder()
  const passEncoder = commandEncoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      loadOp: 'clear',
      storeOp: 'store',
      clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 }
    }]
  })

  passEncoder.setPipeline(pipeline)
  passEncoder.setBindGroup(0, textureGroup)
  passEncoder.draw(6)
  passEncoder.end()

  device.queue.submit([commandEncoder.finish()])
}

async function init() {
  const { device, context, format } = await init_device()
  const { pipeline } = await init_pipeline(device, format)
  const { videoDom } = await init_video()

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear'
  })

  function iframe() {
    const texture = device.importExternalTexture({ source: videoDom })
    const textureGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: sampler
        },
        {
          binding: 1,
          resource: texture
        }
      ]
    })

    draw(device, context, pipeline, textureGroup)
    requestAnimationFrame(iframe)
  }
  iframe()
}
init()
