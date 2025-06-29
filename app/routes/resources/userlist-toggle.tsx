// app/routes/resources/userlist-toggle.tsx
import { type ActionFunctionArgs } from 'react-router';
import { z } from 'zod';
import { parseWithZod } from '@conform-to/zod';
import { setUserListVisibility } from '#/utils/userlist.server';

const ToggleFormSchema = z.object({
  visible: z.enum(['true', 'false']).transform((val) => val === 'true'),
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: ToggleFormSchema });

  if (submission.status !== 'success') {
    return new Response(JSON.stringify({ error: 'Invalid submission' }), {
      status: 400,
    });
  }

  const { visible } = submission.value;

  const cookieHeader = await setUserListVisibility(visible);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Set-Cookie': cookieHeader },
  });
}
