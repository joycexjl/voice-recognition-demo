/**
 * Copyright (c) IBM, Corp. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { fileURLToPath } from 'url';

import replace from '@rollup/plugin-replace';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { fromRollup } from '@web/dev-server-rollup';

const NODE_ENV = process.env.NODE_ENV || 'development';

export default {
  appIndex: 'index.html',
  port: 8080,
  nodeResolve: {
    exportConditions: ['development'],
  },
  plugins: [
    esbuildPlugin({
      ts: true,
      tsconfig: fileURLToPath(new URL('./tsconfig.json', import.meta.url)),
    }),
    ...(NODE_ENV !== 'development'
      ? [
          fromRollup(replace)({
            preventAssignment: true,
            include: 'src/**/*.ts',
            exclude: 'src/config.*.ts',
            delimiters: ['', ''],
            values: {
              './config.js': `./config.${NODE_ENV}.js`,
            },
          }),
        ]
      : []),
  ],
  // Proxy configuration for API requests
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    },
    '/socket.io': {
      target: 'http://localhost:3000',
      ws: true,
      changeOrigin: true
    }
  }
};
