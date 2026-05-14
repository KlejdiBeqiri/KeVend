let openReservationOverlayHandler: (() => void) | null = null;

export function registerReservationOverlayHandler(handler: (() => void) | null) {
  openReservationOverlayHandler = handler;
}

export function openReservationOverlay() {
  openReservationOverlayHandler?.();
}
