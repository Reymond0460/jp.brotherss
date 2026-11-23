/**
 * CONTRATO DE LA CAPA DE DATOS
 * ----------------------------
 * La interfaz (site/ y admin/) nunca habla con Firebase directamente: usa un "repositorio"
 * con los métodos descritos aquí. Hay dos implementaciones intercambiables:
 *
 *   - firebase-backend.js → Firestore + Authentication (QA y producción)
 *   - local-backend.js    → localStorage con datos de ejemplo (demo, pruebas, artefacto)
 *
 * Si mañana se cambia de Firebase a otra base de datos, solo se escribe otro backend
 * que cumpla este contrato. Este archivo no contiene código: solo tipos (JSDoc).
 *
 * @typedef {Object} Business
 * @property {string} name
 * @property {string} whatsapp          dígitos con código de país, ej. "56940916058"
 * @property {string} instagram
 * @property {string} street
 * @property {string} area
 * @property {number} maxDaysAhead
 * @property {number} minNoticeMinutes
 *
 * @typedef {Object} DayHours
 * @property {boolean} open
 * @property {string} start             "HH:MM"
 * @property {string} end
 * @property {string} [breakStart]
 * @property {string} [breakEnd]
 *
 * @typedef {Object} Schedule
 * @property {Record<number, DayHours>} weekly     0 = domingo … 6 = sábado
 * @property {{date:string, label?:string}[]} closedDates
 *
 * @typedef {Object} Service
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number} price             CLP
 * @property {number} durationMin
 * @property {boolean} active
 * @property {number} order
 *
 * @typedef {Object} Promo
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} badge
 * @property {string} serviceId         "" si es solo informativa
 * @property {number|null} promoPrice
 * @property {string} validUntil        "YYYY-MM-DD" o ""
 * @property {boolean} active
 *
 * @typedef {Object} GalleryItem
 * @property {string} id
 * @property {string} src               imagen ya reducida, como data URL (se guarda en el mismo documento)
 * @property {string} caption
 * @property {number} order
 * @property {boolean} active
 *
 * @typedef {Object} Booking
 * @property {string} id                código de reserva (8 caracteres)
 * @property {string} serviceId
 * @property {string} serviceName
 * @property {number} durationMin
 * @property {number} price
 * @property {number} [finalPrice]      cobro real si el barbero lo ajustó
 * @property {string} promoId
 * @property {string} promoTitle
 * @property {string} date              "YYYY-MM-DD"
 * @property {string} time              "HH:MM"
 * @property {string} clientName
 * @property {string} clientPhone
 * @property {string} notes
 * @property {'pending'|'confirmed'|'done'|'cancelled'|'noshow'} status
 * @property {'web'|'admin'} source
 * @property {string[]} slotKeys        bloques que ocupa, ej. ["2026-11-25_1030"]
 * @property {string} createdAt         ISO
 * @property {string} updatedAt         ISO
 *
 * @typedef {Object} Slot
 * @property {string} key
 * @property {string} date
 * @property {string} time
 * @property {'booking'|'block'} kind
 *
 * @typedef {Object} AdminUser
 * @property {string} email
 *
 * @typedef {Object} Repository
 * @property {'local'|'firebase'} kind
 *
 * // --- Lectura pública (clientes) ---
 * @property {() => Promise<Business>} getBusiness
 * @property {() => Promise<Schedule>} getSchedule
 * @property {() => Promise<Service[]>} listServices
 * @property {() => Promise<Promo[]>} listPromos
 * @property {() => Promise<GalleryItem[]>} listGallery                     fotos de trabajos para el carrusel
 * @property {(from:string, to:string) => Promise<Slot[]>} listSlots        bloques ocupados (sin datos personales)
 * @property {(id:string) => Promise<Booking|null>} getBooking              solo quien conoce el código
 *
 * // --- Escritura pública (clientes) ---
 * @property {(booking:Booking) => Promise<void>} createBooking             lanza SlotTakenError si la hora ya no está libre
 * @property {(id:string) => Promise<Booking>} cancelBooking
 *
 * // --- Solo administrador ---
 * @property {(from:string, to:string) => Promise<Booking[]>} listBookings
 * @property {(id:string, patch:Partial<Booking>) => Promise<Booking>} updateBooking   status 'cancelled' libera los bloques
 * @property {(id:string, to:{date:string,time:string}, newSlotKeys:string[]) => Promise<Booking>} moveBooking
 * @property {(keys:string[]) => Promise<void>} blockSlots
 * @property {(keys:string[]) => Promise<void>} unblockSlots
 * @property {(patch:Partial<Business>) => Promise<Business>} saveBusiness
 * @property {(schedule:Schedule) => Promise<Schedule>} saveSchedule
 * @property {(service:Partial<Service>) => Promise<string>} saveService    devuelve el id
 * @property {(id:string) => Promise<void>} deleteService
 * @property {(promo:Partial<Promo>) => Promise<string>} savePromo          devuelve el id
 * @property {(id:string) => Promise<void>} deletePromo
 * @property {(item:Partial<GalleryItem>) => Promise<string>} saveGalleryItem   devuelve el id
 * @property {(id:string) => Promise<void>} deleteGalleryItem
 *
 * // --- Sesión del administrador ---
 * @property {(email:string, password:string) => Promise<AdminUser>} signIn
 * @property {() => Promise<void>} signOut
 * @property {(callback:(user:AdminUser|null) => void) => (() => void)} onAuthChange   devuelve la función para dejar de escuchar
 * @property {(current:string, next:string) => Promise<void>} changePassword
 */

export {};
