import { init_device } from './init'

import { init_triangle } from './triangle'
import { init_resize_canvas } from './triangle/resizeCanvas'

const canvas_dom: HTMLCanvasElement = document.querySelector('#canvas')!

init_device(canvas_dom)
  .then(({ device, content }) => {
    // triangle
    // init_triangle(device, content)

    // resize canvas
    init_resize_canvas(device, content)
  })
  .catch(err => {
    console.error(err)
  })
