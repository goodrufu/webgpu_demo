export const init_device = async (canvas: HTMLCanvasElement) => {
  if (!navigator.gpu) {
    throw new Error('不支持webGPU')
  }

  // 获取适配器
  const adapter = await navigator.gpu.requestAdapter()

  if (!adapter) {
    throw new Error('获取不到 webGPU 适配器')
  }

  // 通过适配器获取设备
  const device = await adapter.requestDevice()

  if (!canvas) {
    throw new Error('缺失canvas dom元素')
  }

  // 设置canvas尺寸
  // const devicePixelRatio = window.devicePixelRatio || 1
  // canvas.width = canvas.clientWidth * devicePixelRatio
  // canvas.height = canvas.clientHeight * devicePixelRatio

  // 设置渲染目标、纹理、格式
  const content = canvas.getContext('webgpu') as GPUCanvasContext
  content.configure({
    device,
    format: navigator.gpu.getPreferredCanvasFormat(), // 返回用于当前系统上显示 8 位色深、标准动态范围（SDR）内容的最佳 canvas 纹理格式
    alphaMode: 'premultiplied'
  })

  return await Promise.resolve({
    device,
    content
  })
}
