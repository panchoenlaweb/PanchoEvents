import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const STATIC_EVENTS = [
  'joongdunk', 'surfjava', 'seakeen', 'dmdland3', 'olympop',
  'loveoutloud', 'blushblossom', 'poohpavel', 'perthsanta',
  'sotus', 'starlympic', 'redworld',
];

const NOT_FOUND = new Response('Not Found', { status: 404 });

export function GET(_req: Request, { params }: { params: { event: string } }) {
  if (!STATIC_EVENTS.includes(params.event)) return NOT_FOUND;

  const filePath = join(process.cwd(), 'static', params.event, 'index.html');
  if (!existsSync(filePath)) return NOT_FOUND;

  const html = readFileSync(filePath, 'utf-8');
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
