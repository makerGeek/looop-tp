// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Todo',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'A beautifully crafted todo app with liquid glass design' },
        { name: 'theme-color', content: '#d9c8ee' }
      ],
      script: [
        {
          // Inline script to apply saved theme before hydration to prevent FOUC
          innerHTML: `(function(){try{var p=localStorage.getItem('todo-app-color-mode')||'system';var t=p;if(p==='system'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.classList.add(t);if(t==='dark'){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#1a1025')}}catch(e){}})()`,
          type: 'text/javascript'
        }
      ]
    }
  }
})
