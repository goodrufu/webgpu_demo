@group(0) @binding(0) var<uniform> colorArray : array<vec4<f32>, 3>; // 在这里获取数据

struct VertexObj { // 结构
  @builtin(position) position : vec4<f32>, // @builtin(position)内置指令 输出顶点坐标位置
  @location(0) color : vec4<f32>
}

@vertex
fn vertex_main( // 由于同一个文件，不能相同fn名称，故修改
  @builtin(vertex_index) VertexIndex : u32, // @builtin(vertex_index) 内置指令 当前绘制的顶点索引
) -> VertexObj {
  var pos = array<vec2<f32>, 3>(
    vec2(0.0, 0.5),
    vec2(-0.5, -0.5),
    vec2(0.5, -0.5),
  );

  var vertexOutput: VertexObj;
  vertexOutput.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  vertexOutput.color = colorArray[VertexIndex];

  return vertexOutput; 
}

@fragment
fn fragment_main(fragData: VertexObj) -> @location(0) vec4<f32> {
  return fragData.color;
}
