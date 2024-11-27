@group(0) @binding(0) var<uniform> matMatrix: mat4x4<f32>;
@group(1) @binding(0) var Sampler: sampler;
@group(1) @binding(1) var Texture: texture_2d<f32>;

struct VertexObj {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) uv: vec2<f32>
}

@vertex
fn vertex_main (@location(0) pos: vec3<f32>, @location(1) uv: vec2<f32>) -> VertexObj{
  var vertexOutput: VertexObj;

  vertexOutput.position = matMatrix * vec4<f32>(pos, 1.0);
  vertexOutput.color = 0.5 * (vec4<f32>(pos, 1.0) + vec4<f32>(1.0, 1.0, 1.0, 1.0));
  vertexOutput.uv = uv;

  return vertexOutput;
}

@fragment
fn fragment_main(fragData: VertexObj) -> @location(0) vec4<f32> {
  // return  textureSample(Texture, Sampler, fragData.uv) * fragData.color;
  return  textureSample(Texture, Sampler, fragData.uv);
}