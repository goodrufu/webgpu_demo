@vertex // 表示是vertex代码
fn main( // vertex所有代码的入口函数，在创建pipeline是描述的：entryPoint
  @builtin(vertex_index) VertexIndex : u32
) -> @builtin(position) vec4<f32> {
  var pos = array<vec2<f32>, 6>(
    vec2(0.0, 0.5),
    vec2(-0.5, -0.5),
    vec2(0.5, -0.5),
    
    vec2(0.5, -0.5), // 添加了这三行
    vec2(0.75, 0.5),
    vec2(1, -0.5),
  );
  

  return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
}
