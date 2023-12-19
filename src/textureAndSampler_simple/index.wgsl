@group(0) @binding(0) var Sampler: sampler;
@group(0) @binding(1) var Texture: texture_2d<f32>;

struct VertexObj {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>
}

@vertex
fn vertex_main(@builtin(vertex_index) VertexIndex: u32) -> VertexObj {
  var pos = array<vec2<f32>, 6>( // 建立1个四边形， 由2个三角形组成
    vec2(-0.5, -0.5),
    vec2(0.5, -0.5),
    vec2(-0.5, 0.5),
    vec2(0.5, -0.5),
    vec2(-0.5, 0.5),
    vec2(0.5, 0.5)
  );

  var uvList = array<vec2<f32>, 6>(
    /** 上面四边形四个顶点对应uv值，uv表示2d图像的xy，u=1,v=1表示图像的右下角 */
    // vec2(0, 1),
    // vec2(1, 1),
    // vec2(0, 0),
    // vec2(1, 1),
    // vec2(0, 0),
    // vec2(1, 0)

    /** 
    * uv大于四边形面积，则表示缩小图像，空白地方的处理，
    * 根据device.createSampler的配置处理，
    * uv小于四边形面积，则表示放大图像
    * */
    vec2(0, 2),
    vec2(2, 2),
    vec2(0, 0),
    vec2(2, 2),
    vec2(0, 0),
    vec2(2, 0)

    // vec2(0, 0.5),
    // vec2(0.5, 0.5),
    // vec2(0, 0),
    // vec2(0.5, 0.5),
    // vec2(0, 0),
    // vec2(0.5, 0)
  );

  var vertexOutput: VertexObj;

  vertexOutput.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  vertexOutput.uv = uvList[VertexIndex];

  return vertexOutput;
}

@fragment
fn fragment_main(fragData: VertexObj) -> @location(0) vec4<f32> {
  return textureSample(Texture, Sampler, fragData.uv);
}