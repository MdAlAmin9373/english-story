// Runs in <head> before first paint to apply the stored theme (no wrong-theme flash).
// A constant string with nothing interpolated: this is the app's only
// dangerouslySetInnerHTML. It must match parseTheme() and THEME_STORAGE_KEY in
// ./theme; tests/unit/theme-init-script.test.ts checks that they agree.
export const THEME_INIT_SCRIPT =
  '(function(){try{var t=localStorage.getItem("es-theme");if(t==="black"||t==="paper")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()';
