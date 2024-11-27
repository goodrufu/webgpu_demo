import wgsl from './index.wgsl?raw';
import imgUrl from './1.jpeg?url';

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
    throw new Error('该浏览器不支持WebGPU');
  }

  const device = await adapter.requestDevice();
  if (!device) {
    throw new Error('该浏览器不支持WebGPU');
  }

  const context = canvas.getContext('webgpu');
  if (!context) {
    throw new Error('WebGPU初始化失败');
  }

  const format = navigator.gpu.getPreferredCanvasFormat();

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  context.configure({
    device,
    format,
    alphaMode: 'premultiplied'
  });

  return { device, context, format };
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
  });

  /** 通过fetch加载图片资源 */
  const res = await fetch(imgUrl);
  const bitmap = await createImageBitmap(await res.blob());

  const textureSize = [bitmap.width, bitmap.height];

  /** 创建纹理 */
  const texture = device.createTexture({
    size: textureSize /** 根据bitmap设置大小 */,
    format,
    /** 设置usage, TEXTURE_BINDING: 设置该权限，shader中才能获取；COPY_DST: 允许拷贝，创建在内存，需要拷贝到gpu；RENDER_ATTACHMENT: 纹理在gpu中是以attachment形式表现的 */
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT
  });
  /** 对于图像使用：copyExternalImageToTexture API， source不仅仅支持图像，也支持canvas */
  device.queue.copyExternalImageToTexture(
    { source: bitmap },
    { texture },
    textureSize
  );

  /** 创建采样规则 */
  const sampler = device.createSampler({
    /**
     * 自带采样算法：
     * nearest：临近采样，结果：图像放到最大时出现锯齿；
     * linear：线性采样，结果：图像放到最大时，图像边缘模糊过渡
     *
     * 通常处理方式：可以选择更高质量素材（图片）
     * */
    magFilter: 'linear',
    minFilter: 'linear',
    /** 图像uv小于显示面积，空白部分应该如何处理：
     * clamp-to-edge：临近采样，取空白部分最接近图像的片元颜色；
     * repeat：图像重复；
     * mirror-repeat：图像反转重复
     *  */
    addressModeU: 'repeat',
    addressModeV: 'mirror-repeat'
  });

  const textureGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: texture.createView() }
    ]
  });

  return { pipeline, textureGroup };
}

async function draw(
  device: GPUDevice,
  context: GPUCanvasContext,
  pipeline: GPURenderPipeline,
  textureGroup: GPUBindGroup,
  format: GPUTextureFormat
) {
  const textureView = context.getCurrentTexture().createView();
  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 }
      }
    ]
  });

  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, textureGroup);
  passEncoder.draw(6);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
}

async function init() {
  const { device, context, format } = await init_device();
  const { pipeline, textureGroup } = await init_pipeline(device, format);
  draw(device, context, pipeline, textureGroup, format);
}
init();
