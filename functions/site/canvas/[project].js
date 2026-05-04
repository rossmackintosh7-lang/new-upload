import { renderPublishedCanvasRequest } from '../../_lib/canvas-public.js';

export async function onRequestGet(context) {
  return renderPublishedCanvasRequest(context);
}
