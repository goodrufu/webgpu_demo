// see https://webgpufundamentals.org/webgpu/lessons/webgpu-utils.html#wgpu-matrix
import { mat4 } from 'https://webgpufundamentals.org/3rdparty/wgpu-matrix.module.js';

async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }

  // Get a WebGPU context from the canvas and configure it
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat
  });

  const module = device.createShaderModule({
    label: 'our hardcoded textured quad shaders',
    code: `
      struct OurVertexShaderOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f,
      };

      struct Uniforms {
        matrix: mat4x4f,
      };

      @group(0) @binding(2) var<uniform> uni: Uniforms;

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> OurVertexShaderOutput {
        let pos = array(

          vec2f( 0.0,  0.0),  // center
          vec2f( 1.0,  0.0),  // right, center
          vec2f( 0.0,  1.0),  // center, top

          // 2st triangle
          vec2f( 0.0,  1.0),  // center, top
          vec2f( 1.0,  0.0),  // right, center
          vec2f( 1.0,  1.0),  // right, top
        );

        var vsOutput: OurVertexShaderOutput;
        let xy = pos[vertexIndex];
        vsOutput.position = uni.matrix * vec4f(xy, 0.0, 1.0);
        vsOutput.texcoord = xy * vec2f(1, 50);
        return vsOutput;
      }

      @group(0) @binding(0) var ourSampler: sampler;
      @group(0) @binding(1) var ourTexture: texture_2d<f32>;

      @fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
        return textureSample(ourTexture, ourSampler, fsInput.texcoord);
      }
    `
  });

  const pipeline = device.createRenderPipeline({
    label: 'hardcoded textured quad pipeline',
    layout: 'auto',
    vertex: {
      module
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }]
    }
  });

  const numMipLevels = (...sizes) => {
    const maxSize = Math.max(...sizes);
    return (1 + Math.log2(maxSize)) | 0;
  };

  async function loadImageBitmap(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
  }

  function copySourceToTexture(device, texture, source, { flipY } = {}) {
    device.queue.copyExternalImageToTexture(
      { source, flipY },
      { texture },
      { width: source.width, height: source.height }
    );

    if (texture.mipLevelCount > 1) {
      generateMips(device, texture);
    }
  }

  function createTextureFromSource(device, source, options = {}) {
    const texture = device.createTexture({
      format: 'rgba8unorm',
      mipLevelCount: options.mips
        ? numMipLevels(source.width, source.height)
        : 1,
      size: [source.width, source.height],
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT
    });
    copySourceToTexture(device, texture, source, options);
    return texture;
  }

  const generateMips = (() => {
    let sampler;
    let module;
    const pipelineByFormat = {};

    return function generateMips(device, texture) {
      if (!module) {
        module = device.createShaderModule({
          label: 'textured quad shaders for mip level generation',
          code: `
            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
              let pos = array(

                vec2f( 0.0,  0.0),  // center
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 0.0,  1.0),  // center, top

                // 2st triangle
                vec2f( 0.0,  1.0),  // center, top
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 1.0,  1.0),  // right, top
              );

              var vsOutput: VSOutput;
              let xy = pos[vertexIndex];
              vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
              vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
              return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;
            @group(0) @binding(1) var ourTexture: texture_2d<f32>;

            @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(ourTexture, ourSampler, fsInput.texcoord);
            }
          `
        });

        sampler = device.createSampler({
          minFilter: 'linear'
        });
      }

      if (!pipelineByFormat[texture.format]) {
        pipelineByFormat[texture.format] = device.createRenderPipeline({
          label: 'mip level generator pipeline',
          layout: 'auto',
          vertex: {
            module
          },
          fragment: {
            module,
            targets: [{ format: texture.format }]
          }
        });
      }
      const pipeline = pipelineByFormat[texture.format];

      const encoder = device.createCommandEncoder({
        label: 'mip gen encoder'
      });

      let width = texture.width;
      let height = texture.height;
      let baseMipLevel = 0;
      while (width > 1 || height > 1) {
        width = Math.max(1, (width / 2) | 0);
        height = Math.max(1, (height / 2) | 0);

        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: sampler },
            {
              binding: 1,
              resource: texture.createView({ baseMipLevel, mipLevelCount: 1 })
            }
          ]
        });

        ++baseMipLevel;

        const renderPassDescriptor = {
          label: 'our basic canvas renderPass',
          colorAttachments: [
            {
              view: texture.createView({ baseMipLevel, mipLevelCount: 1 }),
              loadOp: 'clear',
              storeOp: 'store'
            }
          ]
        };

        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(6); // call our vertex shader 6 times
        pass.end();
      }

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    };
  })();

  async function createTextureFromImage(device, url, options) {
    const imgBitmap = await loadImageBitmap(url);
    return createTextureFromSource(device, imgBitmap, options);
  }

  const textures = await Promise.all([
    await createTextureFromImage(
      device,
      'https://webgpufundamentals.org/webgpu/resources/images/f-texture.png',
      { mips: true, flipY: false }
    ),
    await createTextureFromImage(
      device,
      'https://webgpufundamentals.org/webgpu/resources/images/coins.jpg',
      { mips: true }
    ),
    await createTextureFromImage(
      device,
      'https://webgpufundamentals.org/webgpu/resources/images/Granite_paving_tileable_512x512.jpeg',
      { mips: true }
    )
  ]);

  // offsets to the various uniform values in float32 indices
  const kMatrixOffset = 0;

  const objectInfos = [];
  for (let i = 0; i < 8; ++i) {
    const sampler = device.createSampler({
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: i & 1 ? 'linear' : 'nearest',
      minFilter: i & 2 ? 'linear' : 'nearest',
      mipmapFilter: i & 4 ? 'linear' : 'nearest'
    });

    // create a buffer for the uniform values
    const uniformBufferSize = 16 * 4; // matrix is 16 32bit floats (4bytes each)
    const uniformBuffer = device.createBuffer({
      label: 'uniforms for quad',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // create a typedarray to hold the values for the uniforms in JavaScript
    const uniformValues = new Float32Array(uniformBufferSize / 4);
    const matrix = uniformValues.subarray(kMatrixOffset, 16);

    const bindGroups = textures.map((texture) =>
      device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: texture.createView() },
          { binding: 2, resource: { buffer: uniformBuffer } }
        ]
      })
    );

    // Save the data we need to render this object.
    objectInfos.push({
      bindGroups,
      matrix,
      uniformValues,
      uniformBuffer
    });
  }

  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store'
      }
    ]
  };

  let texNdx = 0;

  function render() {
    const fov = (60 * Math.PI) / 180; // 60 degrees in radians
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const zNear = 1;
    const zFar = 2000;
    const projectionMatrix = mat4.perspective(fov, aspect, zNear, zFar);

    const cameraPosition = [0, 0, 2];
    const up = [0, 1, 0];
    const target = [0, 0, 0];
    const viewMatrix = mat4.lookAt(cameraPosition, target, up);
    const viewProjectionMatrix = mat4.multiply(projectionMatrix, viewMatrix);

    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const encoder = device.createCommandEncoder({
      label: 'render quad encoder'
    });
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

    objectInfos.forEach(
      ({ bindGroups, matrix, uniformBuffer, uniformValues }, i) => {
        const bindGroup = bindGroups[texNdx];

        const xSpacing = 1.2;
        const ySpacing = 0.7;
        const zDepth = 50;

        const x = (i % 4) - 1.5;
        const y = i < 4 ? 1 : -1;

        mat4.translate(
          viewProjectionMatrix,
          [x * xSpacing, y * ySpacing, -zDepth * 0.5],
          matrix
        );
        mat4.rotateX(matrix, 0.5 * Math.PI, matrix);
        mat4.scale(matrix, [1, zDepth * 2, 1], matrix);
        mat4.translate(matrix, [-0.5, -0.5, 0], matrix);

        // copy the values from JavaScript to the GPU
        device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

        pass.setBindGroup(0, bindGroup);
        pass.draw(6); // call our vertex shader 6 times
      }
    );

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const canvas = entry.target;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(
        1,
        Math.min(width, device.limits.maxTextureDimension2D)
      );
      canvas.height = Math.max(
        1,
        Math.min(height, device.limits.maxTextureDimension2D)
      );
      render();
    }
  });
  observer.observe(canvas);

  canvas.addEventListener('click', () => {
    texNdx = (texNdx + 1) % textures.length;
    render();
  });
}

function fail(msg) {
  // eslint-disable-next-line no-alert
  alert(msg);
}

main();
