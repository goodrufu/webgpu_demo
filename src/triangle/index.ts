import vertex from './vertex.wgsl?raw';
import fragment from './fragment.wgsl?raw';

async function init_device(canvas: HTMLCanvasElement) {
  if (!canvas) {
    throw new Error('缺失canvas dom元素');
  }

  if (!navigator.gpu) {
    throw new Error('不支持webGPU');
  }

  // 获取适配器
  const adapter = await navigator.gpu.requestAdapter();

  if (!adapter) {
    throw new Error('获取不到 webGPU 适配器');
  }

  // 通过适配器获取设备
  const device = await adapter.requestDevice();

  // 设置canvas尺寸
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  // 关联canvas 和 gpu
  const content = canvas.getContext('webgpu') as GPUCanvasContext;
  content.configure({
    device,
    format: navigator.gpu.getPreferredCanvasFormat(), // 返回用于当前系统上显示 8 位色深、标准动态范围（SDR）内容的最佳 canvas 纹理格式
    alphaMode: 'premultiplied'
  });

  return { device, content, presentationFormat };
}

async function init_pipeline(
  device: GPUDevice,
  presentationFormat: GPUTextureFormat
) {
  const pipeline = await device.createRenderPipelineAsync({
    layout: 'auto',
    vertex: {
      // 顶点着色器
      module: device.createShaderModule({ code: vertex }), // 通过createShaderModule，将着色器代码传给WebGPU
      entryPoint: 'main' // 上面着色器代码执行的入口函数
    },
    fragment: {
      // 片元着色器
      module: device.createShaderModule({ code: fragment }),
      entryPoint: 'main',
      targets: [{ format: presentationFormat }]
    },
    primitive: {
      topology: 'triangle-list' // 顶点着色器渲染的规则，暂不需要管
    }
  });

  return { pipeline };
}

function draw(
  device: GPUDevice,
  content: GPUCanvasContext,
  pipeline: GPURenderPipeline
) {
  const commandEncoder = device.createCommandEncoder(); // 创建运行渲染通道
  const textureView = content.getCurrentTexture().createView(); // 创建用于WebGPU渲染的纹理视图

  const renderPassDesc: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 }, // 设置背景画板颜色，如果loadOp !== clear，则忽略
        loadOp: 'clear', // 在执行渲染前的加载操作，建议：clear
        storeOp: 'store' // 在执行渲染后对view的存储操作，store：保留渲染结果； discard： 丢弃
      }
    ]
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDesc); // 执行运行通道
  passEncoder.setPipeline(pipeline); // 给通道设置管线
  passEncoder.draw(3, 1, 0, 0); // 绘制的顶点个数、绘制实例的个数、第一个顶点的起始位置、第一个实例的位置
  passEncoder.end(); // 结束通道

  device.queue.submit([commandEncoder.finish()]); // 将执行过程提交到队列
}

async function run() {
  const canvas_dom: HTMLCanvasElement = document.querySelector('canvas')!;

  const { device, content, presentationFormat } = await init_device(canvas_dom);
  const { pipeline } = await init_pipeline(device, presentationFormat);

  draw(device, content, pipeline);
}

run();
