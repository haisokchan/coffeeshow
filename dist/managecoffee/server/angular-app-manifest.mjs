
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/login",
    "route": "/"
  },
  {
    "renderMode": 2,
    "route": "/login"
  },
  {
    "renderMode": 2,
    "route": "/register"
  },
  {
    "renderMode": 2,
    "route": "/dashboard"
  },
  {
    "renderMode": 2,
    "route": "/order"
  },
  {
    "renderMode": 2,
    "route": "/product"
  },
  {
    "renderMode": 2,
    "route": "/cart"
  },
  {
    "renderMode": 2,
    "route": "/customer"
  },
  {
    "renderMode": 2,
    "route": "/checkout"
  },
  {
    "renderMode": 2,
    "route": "/payment"
  },
  {
    "renderMode": 2,
    "route": "/supplier"
  },
  {
    "renderMode": 2,
    "redirectTo": "/login",
    "route": "/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 614, hash: 'db9236d0048ef369335b516617cfae39237a977642a0f4402f7508e6433200f2', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1127, hash: '126b87d19782c496d28aa48c3a76a432a4035805b03d4d8c7c645efa1d84d6be', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'register/index.html': {size: 3329, hash: 'f091d2ff65b68d9053863d1cc014fcfa0d5ebab5fa12806bbf173cb454861b5a', text: () => import('./assets-chunks/register_index_html.mjs').then(m => m.default)},
    'login/index.html': {size: 5403, hash: '3f14762a69cf3e316729e7ea136e0a8b1f38731218fb6244d640aa7aeb3da589', text: () => import('./assets-chunks/login_index_html.mjs').then(m => m.default)},
    'styles-5INURTSO.css': {size: 0, hash: 'menYUTfbRu8', text: () => import('./assets-chunks/styles-5INURTSO_css.mjs').then(m => m.default)}
  },
};
