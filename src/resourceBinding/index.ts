import wgsl from './index.wgsl?raw'

async function init_device() {
  const canvas = document.querySelector('canvas')
  if (!canvas) {
    throw new Error('找不到canvas节点')
  }

  if (!navigator.gpu) {
    throw new Error('该浏览器不支持WebGPU')
  }

  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) {
    throw new Error('WebGPU初始化失败')
  }

  const device = await adapter.requestDevice()

  const format = navigator.gpu.getPreferredCanvasFormat()

  const devicePixelRate = window.devicePixelRatio || 1
  canvas.width = canvas.clientWidth * devicePixelRate
  canvas.height = canvas.clientHeight * devicePixelRate

  const content = canvas.getContext('webgpu')!
  content.configure({
    device,
    format,
    alphaMode: 'premultiplied'
  })

  return { device, format, content }
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

  const colorBuffer = device.createBuffer({ // 创建一个buffer
    size: 48, // 设置创建与传入数据大小一样的buffer，也可以写成： 4 * 4（4个字节 * rgba * 3）
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST // 申请GPU的权限，如果没有申请，则无权限操作
  })

  const colorGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{
      binding: 0,
      resource: {
        buffer: colorBuffer
      }
    }]
  })

  return { pipeline, colorBuffer, colorGroup }
}

function draw(device: GPUDevice, pipeline: GPURenderPipeline, content: GPUCanvasContext, colorGroup: GPUBindGroup) {
  const textureView = content.getCurrentTexture().createView()
  const commandEncoder = device.createCommandEncoder()
  const passEncoder = commandEncoder.beginRenderPass({
    colorAttachments: [{
      view: textureView,
      clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
      loadOp: 'clear',
      storeOp: 'store'
    }]
  })

  passEncoder.setPipeline(pipeline)
  // 设置group在当前pipeline的位置：0，并将内存区域设置进去，shader中@group(0) 就可以获取group了
  passEncoder.setBindGroup(0, colorGroup)
  passEncoder.draw(3)
  passEncoder.end()

  device.queue.submit([commandEncoder.finish()])
}

const color_data = [ // 颜色是float类型，占4个字节，每一个行的数据表示color：rgba
  [1, 0, 0, 1],
  [0, 1, 0, 1],
  [0, 0, 1, 1]
]
async function init() {
  const { device, content, format } = await init_device()
  const { pipeline, colorBuffer, colorGroup } = await init_pipeline(device, format)

  const setBuffer2Draw = () => {
    const colorArray = new Float32Array(color_data.flat(2)) // 接收的数据类型是f32，所以，我们的数据也得是f32的
    // 将buffer写入queue（可以理解为shader gpu的内存），但是，还没有关联对应的pipeline
    device.queue.writeBuffer(colorBuffer, 0, colorArray, 0, colorArray.length)

    draw(device, pipeline, content, colorGroup)
  }

  setBuffer2Draw()

  const getData2Draw = (e: Event, index: number) => {
    const color = (e.target as HTMLInputElement).value
    const r = +('0x' + color.slice(1, 3)) / 255
    const g = +('0x' + color.slice(3, 5)) / 255
    const b = +('0x' + color.slice(5, 7)) / 255
    color_data[index] = [r, g, b, 1]

    setBuffer2Draw()
  }

  document.querySelector('.color_top')?.addEventListener('input', (e: Event) => {
    getData2Draw(e, 0)
  })
  document.querySelector('.color_left')?.addEventListener('input', (e: Event) => {
    getData2Draw(e, 1)
  })
  document.querySelector('.color_right')?.addEventListener('input', (e: Event) => {
    getData2Draw(e, 2)
  })
}
init()

// const pc: any = {
//   js: {
//     data: { a: 12 }, // js中的数据
//     createRenderPipelineAsync() { // 先创建pipeline
//       pc.gpu.pipeline = []
//     },
//     createBuffer() {
//       // 步骤1: 在gpu内存声明空间（大小、权限）
//       pc.gpu.buffer = null
//     },
//     createBindGroup() {
//       // 步骤2: 创建group、关联pipeline
//       pc.gpu.group = []
//       pc.gpu.group[0] = {}

//       pc.gpu.group.binding = []
//       pc.gpu.group.binding[0] = pc.gpu.buffer

//       // pipeline包含：vertex和fragment，所以shader能直接获取数据
//       pc.gpu.pipeline[0] = pc.gpu.group.binding[0]
//     },
//     writeBuffer() {
//       // 步骤3: 将js的数据拷贝到gpu内存中
//       pc.gpu.buffer = JSON.parse(JSON.stringify(pc.js.data))
//     }
//   },
//   gpu: {},
//   shader: {
//     // @group(0) @binding(0) 获取到数据
//   }
// }
