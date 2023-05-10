import path from 'path'
import { type ConfigEnv, type UserConfig } from 'vite'

import pkg from './package.json'

export default ({ command }: ConfigEnv): UserConfig => {
  const isBuild = command === 'build'
  const config: UserConfig = {
    esbuild: {
      drop: isBuild ? ['console', 'debugger'] : []
    },

    resolve: {
      alias: [
        {
          find: '~src',
          replacement: path.resolve(__dirname, 'src')
        },
        {
          find: '~api',
          replacement: path.resolve(__dirname, 'src/api')
        },
        {
          find: '~store',
          replacement: path.resolve(__dirname, 'src/store')
        },
        {
          find: '~pages',
          replacement: path.resolve(__dirname, 'src/pages')
        },
        {
          find: '~components',
          replacement: path.resolve(__dirname, 'src/components')
        },
        {
          find: '~libs',
          replacement: path.resolve(__dirname, 'src/assets/libs')
        }
      ]
    },
    define: {
      __VERSION__: JSON.stringify(pkg.version)
    },
    build: {
      sourcemap: !isBuild,
      minify: isBuild,
      outDir: './dist'
    },
    server: {
      host: true /** 启动ip访问地址 */,
      proxy: {
        // '/api': {
        //   target: 'http://auto-scene.flymeauto.com',
        //   changeOrigin: true
        // }
      }
    }
  }

  return config
}
