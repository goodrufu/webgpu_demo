import wgsl from './index.wgsl?raw';
import { mat4 } from 'wgpu-matrix';

async function init_device() {
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    throw new Error('没找到canvas节点');
  }

  if (!navigator.gpu) {
    throw new Error('该浏览器不支持WebGPU');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('WebGPU初始化失败');
  }

  const device = await adapter.requestDevice();
  if (!device) {
    throw new Error('WebGPU初始化失败');
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

  return {
    device,
    format,
    context,
    canvasInfo: { width: canvas.width, height: canvas.height }
  };
}

async function init_pipeline(device: GPUDevice, format: GPUTextureFormat) {
  const modelData = new Float32Array([
    // 正方体vertex数据， 这里不使用齐次坐标，在shader中补充就行了
    // face1
    +1, -1, +1, -1, -1, +1, -1, -1, -1, +1, -1, -1, +1, -1, +1, -1, -1, -1,
    // face2
    +1, +1, +1, +1, -1, +1, +1, -1, -1, +1, +1, -1, +1, +1, +1, +1, -1, -1,
    // face3
    -1, +1, +1, +1, +1, +1, +1, +1, -1, -1, +1, -1, -1, +1, +1, +1, +1, -1,
    // face4
    -1, -1, +1, -1, +1, +1, -1, +1, -1, -1, -1, -1, -1, -1, +1, -1, +1, -1,
    // face5
    +1, +1, +1, -1, +1, +1, -1, -1, +1, -1, -1, +1, +1, -1, +1, +1, +1, +1,
    // face6
    +1, -1, -1, -1, -1, -1, -1, +1, -1, +1, +1, -1, +1, -1, -1, -1, +1, -1
  ]);

  // 创建buffer
  const mvpBuffer = device.createBuffer({
    size: 4 * 4 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  // 创建绑定组的布局
  const groupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {} // 不能删除
      }
    ]
  });

  // 创建组
  const mvpGroup = device.createBindGroup({
    layout: groupLayout, // 关联创建组布局
    entries: [
      {
        binding: 0,
        resource: { buffer: mvpBuffer }
      }
    ]
  });

  const pipeline = await device.createRenderPipelineAsync({
    // pipeline 设置对应的布局
    layout: device.createPipelineLayout({ bindGroupLayouts: [groupLayout] }),
    vertex: {
      module: device.createShaderModule({ code: wgsl }),
      entryPoint: 'vertex_main',
      buffers: [
        {
          arrayStride: 4 * 3,
          attributes: [
            {
              shaderLocation: 0,
              format: 'float32x3',
              offset: 0
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

  const modelBuffer = device.createBuffer({
    size: modelData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(modelBuffer, 0, modelData, 0, modelData.length);

  return {
    pipeline,
    modelStore: { modelBuffer, modelData },
    mvpStore: { mvpGroup, mvpBuffer }
  };
}

function draw(
  device: GPUDevice,
  context: GPUCanvasContext,
  pipeline: GPURenderPipeline,
  modelStore: { modelBuffer: GPUBuffer; modelData: Float32Array },
  mvpStore: { mvpGroup: GPUBindGroup; mvpBuffer: GPUBuffer }
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
  passEncoder.setVertexBuffer(0, modelStore.modelBuffer);
  passEncoder.setBindGroup(0, mvpStore.mvpGroup);
  passEncoder.draw(36);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
}

async function init() {
  const { device, format, context, canvasInfo } = await init_device();
  const { pipeline, modelStore, mvpStore } = await init_pipeline(
    device,
    format
  );

  // 投影矩阵： 相机视野角度、剪裁宽高比、近平面、远平面
  const perspective = mat4.perspective(
    Math.PI / 3,
    canvasInfo.width / canvasInfo.height,
    0.1,
    1000
  );

  // 相机的默认位置是世界坐标原点，如果不更改正方体的z坐标，正方体将包裹相机，仅能看到一个面
  // 如果：cullMode: 'back'的话，那么，将什么都看不到
  const pos = { x: 0, y: 0, z: -5 }; // NDC坐标
  const rotation = { x: -0.5, y: 0.5, z: 0 }; // 弧度
  const scale = { x: 1, y: 1, z: 1 }; // NDC坐标

  function frame() {
    rotation.x += 0.01;
    rotation.y += 0.01;

    const modelView = mat4.create(); // modelView = new mat4
    mat4.identity(modelView); // modelView = identity

    mat4.translate(modelView, [pos.x, pos.y, pos.z], modelView); // modelView *= translation([1, 2, 3])

    mat4.rotateX(modelView, rotation.x, modelView); // modelView *= rotationX(rotation.x)
    mat4.rotateY(modelView, rotation.y, modelView);
    mat4.rotateZ(modelView, rotation.z, modelView);

    mat4.scale(modelView, [scale.x, scale.y, scale.z], modelView); // modelView *= scaling([1, 2, 3])

    const mvpData = mat4.multiply(perspective, modelView); // 投影矩阵 * modelView

    device.queue.writeBuffer(
      mvpStore.mvpBuffer,
      0,
      mvpData as Float32Array,
      0,
      mvpData.length
    );

    draw(device, context, pipeline, modelStore, mvpStore);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
init();
