// 矩阵的类型，数据依然是Float32，但是，WebGPU对矩阵有单独的类型
@group(0) @binding(0) var<uniform> matMatrix: mat4x4<f32>;

struct VertexObj { // 结构
  @builtin(position) position : vec4<f32>,
  @location(0) color : vec4<f32>
}

@vertex
fn vertex_main(
  // js中分配的是vec3<f32>，这里声明vec4<f32>会自动补充齐次坐标
  // @location(0) pos: vec4<f32>
  @location(0) pos: vec3<f32>
) -> VertexObj {
  var vertexOutput: VertexObj;
  // 采用vec4 的方式
  // vertexOutput.position = pos;
  // vertexOutput.color = 0.5 * (pos + vec4<f32>(1.0, 1.0, 1.0, 1.0));

  vertexOutput.position = matMatrix * vec4<f32>(pos, 1.0);
  // 让每个顶点的颜色保持一致，数据是-1到1，2个单位，所以，需要+1再乘0.5，保证在0-1范围 
  vertexOutput.color = 0.5 * (vec4<f32>(pos, 1.0) + vec4<f32>(1.0, 1.0, 1.0, 1.0));

  return vertexOutput; 
}

@fragment
fn fragment_main(fragData: VertexObj) -> @location(0) vec4<f32> {
  return fragData.color;
}
