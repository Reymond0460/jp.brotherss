/**
 * Direcciones de las páginas del sitio. Único lugar donde se escriben:
 * si una página cambia de dirección, se edita aquí (y en firebase.json si hace falta redirigir).
 *
 * Cada página vive en su carpeta (/admin/ → public/admin/index.html), lo que da URLs limpias.
 */
export const ROUTES = {
  home: '/',
  admin: '/admin/',
  privacy: '/privacidad/',
  cookies: '/cookies/',
};

/** Enlace a una sección de la portada desde otra página: "/#servicios". */
export const homeAnchor = (id) => `${ROUTES.home}#${id}`;
