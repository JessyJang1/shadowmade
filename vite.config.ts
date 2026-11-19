import { defineConfig } from 'vite';
export default defineConfig({
  build:{rolldownOptions:{input:{game:'index.html',assets:'assets.html'},output:{codeSplitting:{groups:[{name:'three-core',test:/node_modules\/three\/src/},{name:'three-addons',test:/node_modules\/three\/examples/}]}}}},
});
