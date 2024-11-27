import wgsl from './index.wgsl?raw';

async function init_device() {
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    throw new Error('找不到canvas节点');
  }

  if (!navigator.gpu) {
    throw new Error('该浏览器不支持WebGPU');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('WebGPU初始化失败');
  }

  const device = await adapter.requestDevice();

  const format = navigator.gpu.getPreferredCanvasFormat();

  const devicePixelRate = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRate;
  canvas.height = canvas.clientHeight * devicePixelRate;

  const content = canvas.getContext('webgpu')!;
  content.configure({
    device,
    format,
    alphaMode: 'premultiplied'
  });

  return { device, format, content };
}

async function init_pipeline(device: GPUDevice, format: GPUTextureFormat) {
  const pipeline = await device.createRenderPipelineAsync({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({ code: wgsl }),
      entryPoint: 'vertex_main',
      buffers: [
        {
          // 设置vertex中获取到的数据结构，以下配置，表示在vertex shader中可以通过 @location(0) 获取传入的数据
          attributes: [
            {
              shaderLocation: 0, // 对应vertex中的@location(0)。注意：vertex和fragment的@location(0)并不是一个意思
              offset: 0, // 数据偏移量
              format: 'float32x4'
            }
          ],
          arrayStride: 16 // 说明每个片段的大小，4个字节 * 4位数：rgba
        }
      ]
    },
    fragment: {
      module: device.createShaderModule({ code: wgsl }),
      entryPoint: 'fragment_main',
      targets: [{ format }]
    },
    primitive: {
      topology: 'triangle-list'
    }
  });

  const colorBuffer = device.createBuffer({
    // 创建一个buffer
    size: 48, // 设置创建与传入数据大小一样的buffer，也可以写成： 4 * 4 * 3（4个字节 * rgba * 3个点）
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST // 申请GPU的权限，如果没有申请，则无权限操作
  });

  return { pipeline, colorBuffer };
}

function draw(
  device: GPUDevice,
  pipeline: GPURenderPipeline,
  content: GPUCanvasContext,
  colorBuffer: GPUBuffer
) {
  const textureView = content.getCurrentTexture().createView();
  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }
    ]
  });

  passEncoder.setPipeline(pipeline);
  // 将shader gpu中vertex buffer的数据关联到pipeline，pipeline进行渲染
  passEncoder.setVertexBuffer(0, colorBuffer);
  passEncoder.draw(3);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
}

const color_data = [
  // 颜色是float类型，占4个字节，每一个行的数据表示color：rgba
  [1, 0, 0, 1],
  [0, 1, 0, 1],
  [0, 0, 1, 1]
];
async function init() {
  const { device, content, format } = await init_device();
  const { pipeline, colorBuffer } = await init_pipeline(device, format);

  const setBuffer2Draw = () => {
    const colorArray = new Float32Array(color_data.flat(2)); // 接收的数据类型是f32，所以，我们的数据也得是f32的
    // 将buffer写入queue（可以理解为shader gpu的内存），但是，还没有关联对应的pipeline
    device.queue.writeBuffer(colorBuffer, 0, colorArray, 0, colorArray.length);

    draw(device, pipeline, content, colorBuffer);
  };

  setBuffer2Draw();

  const getData2Draw = (e: Event, index: number) => {
    const color = (e.target as HTMLInputElement).value;
    const r = +('0x' + color.slice(1, 3)) / 255;
    const g = +('0x' + color.slice(3, 5)) / 255;
    const b = +('0x' + color.slice(5, 7)) / 255;
    color_data[index] = [r, g, b, 1];

    setBuffer2Draw();
  };

  document
    .querySelector('.color_top')
    ?.addEventListener('input', (e: Event) => {
      getData2Draw(e, 0);
    });
  document
    .querySelector('.color_left')
    ?.addEventListener('input', (e: Event) => {
      getData2Draw(e, 1);
    });
  document
    .querySelector('.color_right')
    ?.addEventListener('input', (e: Event) => {
      getData2Draw(e, 2);
    });
}
init();

// const pc: any = {
//   js: {
//     data: { a: 12 }, // js中的数据
//     createBuffer() {
//       // 步骤1: 在gpu内存声明空间（大小、权限）
//       pc.gpu.buffer = null
//     },
//     vertexAttr() {
//       // 步骤2: 告诉shader，从@location(x)获取数据
//       pc.shader.attr = '0'
//     },
//     writeBuffer() {
//       // 步骤3: 将js的数据拷贝到gpu内存中
//       pc.gpu.buffer = JSON.parse(JSON.stringify(pc.js.data))
//     },
//     setVertexBuffer() {
//       // 步骤4: gpu内存中的数据关联
//       pc.shader.attr['0'] = pc.gpu.buffer
//     }
//   },
//   gpu: {},
//   shader: {
//     attr: {}
//   }
// }
