export const vertexData = [ // 正方体vertex数据， 这里不使用齐次坐标，在shader中补充就行了
// face1
  +1, -1, +1,
  -1, -1, +1,
  -1, -1, -1,
  +1, -1, -1,
  +1, -1, +1,
  -1, -1, -1,
  // face2
  +1, +1, +1,
  +1, -1, +1,
  +1, -1, -1,
  +1, +1, -1,
  +1, +1, +1,
  +1, -1, -1,
  // face3
  -1, +1, +1,
  +1, +1, +1,
  +1, +1, -1,
  -1, +1, -1,
  -1, +1, +1,
  +1, +1, -1,
  // face4
  -1, -1, +1,
  -1, +1, +1,
  -1, +1, -1,
  -1, -1, -1,
  -1, -1, +1,
  -1, +1, -1,
  // face5
  +1, +1, +1,
  -1, +1, +1,
  -1, -1, +1,
  -1, -1, +1,
  +1, -1, +1,
  +1, +1, +1,
  // face6
  +1, -1, -1,
  -1, -1, -1,
  -1, +1, -1,
  +1, +1, -1,
  +1, -1, -1,
  -1, +1, -1
]