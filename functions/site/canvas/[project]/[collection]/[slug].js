import { renderPublishedCmsRequest } from '../../../../_lib/canvas-public.js';

export async function onRequestGet(context) {
  return renderPublishedCmsRequest(context);
}
