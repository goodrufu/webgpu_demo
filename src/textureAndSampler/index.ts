import { mat4 } from 'wgpu-matrix';
import imgTexture from '../assets/img/2.jpeg';
import { vertexAndUvData } from './data';
import wgsl from './index.wgsl?raw';

async function init_device() {
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    throw new Error('没找到canvas节点');
  }

  if (!navigator.gpu) {
    throw new Error('该设备不支持WebGPU');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('WebGPU初始化失败');
  }

  const device = await adapter.requestDevice();
  if (!device) {
    throw new Error('WebGPU初始化失败');
  }

  const content = canvas.getContext('webgpu');
  if (!content) {
    throw new Error('WebGPU初始化失败');
  }

  const format = navigator.gpu.getPreferredCanvasFormat();

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  content.configure({ device, format, alphaMode: 'premultiplied' });

  return {
    device,
    format,
    content,
    canvasInfo: { width: canvas.width, height: canvas.height }
  };
}

async function init_pipeline(device: GPUDevice, format: GPUTextureFormat) {
  const mvpGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {}
      }
    ]
  });
  const mvpBuffer = device.createBuffer({
    size: 4 * 4 * 4, // float32 占用4个字节，mvp矩阵是4*4个字节
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST // 设置uniform类型和设置copy权限
  });
  const mvpGroup = device.createBindGroup({
    layout: mvpGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: mvpBuffer }
      }
    ]
  });

  const res = await fetch(imgTexture);

  const img = await res.blob();

  const bitmap = await createImageBitmap(img);

  const textureSize = [bitmap.width, bitmap.height];

  const texture = device.createTexture({
    size: textureSize,
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT
  });
  device.queue.copyExternalImageToTexture(
    { source: bitmap },
    { texture },
    textureSize
  );

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear'
  });

  const textureGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {}
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {}
      }
    ]
  });
  const textureGroup = device.createBindGroup({
    layout: textureGroupLayout,
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: texture.createView() }
    ]
  });

  const pipeline = await device.createRenderPipelineAsync({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [mvpGroupLayout, textureGroupLayout]
    }),
    vertex: {
      module: device.createShaderModule({ code: wgsl }),
      entryPoint: 'vertex_main',
      buffers: [
        {
          arrayStride: 4 * 5,
          attributes: [
            {
              shaderLocation: 0,
              format: 'float32x3',
              offset: 0
            },
            {
              shaderLocation: 1,
              format: 'float32x2',
              offset: 4 * 3
            }
          ]
        }
      ]
    },
    fragment: {
      module: device.createShaderModule({ code: wgsl }),
      entryPoint: 'fragment_main',
      targets: [{ format }]
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back'
    }
  });

  return { mvpBuffer, mvpGroup, pipeline, textureGroup };
}

function write_vertex_buffer(device: GPUDevice) {
  const vertexDataF32 = new Float32Array(vertexAndUvData);
  const modelBuffer = device.createBuffer({
    size: vertexDataF32.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(
    modelBuffer,
    0,
    vertexDataF32,
    0,
    vertexDataF32.length
  );

  return { modelBuffer };
}

function draw(
  content: GPUCanvasContext,
  device: GPUDevice,
  pipeline: GPURenderPipeline,
  mvpGroup: GPUBindGroup,
  modelBuffer: GPUBuffer,
  textureGroup: GPUBindGroup
) {
  const textureView = content.getCurrentTexture().createView();
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
  passEncoder.setVertexBuffer(0, modelBuffer);
  passEncoder.setBindGroup(0, mvpGroup);
  passEncoder.setBindGroup(1, textureGroup);
  passEncoder.draw(36);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
}

async function init() {
  const { device, format, canvasInfo, content } = await init_device();
  const { mvpBuffer, mvpGroup, pipeline, textureGroup } = await init_pipeline(
    device,
    format
  );
  const { modelBuffer } = write_vertex_buffer(device);

  const perspective = mat4.perspective(
    Math.PI / 3,
    canvasInfo.width / canvasInfo.height,
    1,
    100
  );

  const pos = { x: 0, y: 0, z: -5 };
  // const rotation = { x: -0.5, y: 0.5, z: 0 }
  const rotation = { x: 0, y: 0, z: 0 };
  const scale = { x: 1, y: 1, z: 1 };

  function frame() {
    rotation.x += 0.01;
    rotation.y += 0.01;
    rotation.z += 0.01;

    /** 创建mat4 */
    const modelView = mat4.create();
    mat4.identity(modelView);

    /** 平移、旋转、缩放 */
    mat4.translate(modelView, [pos.x, pos.y, pos.z], modelView);

    mat4.rotateX(modelView, rotation.x, modelView);
    mat4.rotateY(modelView, rotation.y, modelView);
    mat4.rotateZ(modelView, rotation.z, modelView);

    mat4.scale(modelView, [scale.x, scale.y, scale.z], modelView);

    /** tranform后与投影矩阵相乘，得到最后的矩阵 */
    const mvpData = mat4.multiply(perspective, modelView);

    device.queue.writeBuffer(
      mvpBuffer,
      0,
      mvpData as Float32Array,
      0,
      mvpData.length
    );

    draw(content, device, pipeline, mvpGroup, modelBuffer, textureGroup);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
init();
