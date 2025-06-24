import { Button } from '#/components/ui/button';
import {
  Form,
  Link,
  useLoaderData,
  useRouteLoaderData,
  type LoaderFunctionArgs,
} from 'react-router';
import { prisma } from '#/utils/db.server';
import { requireUserId } from '#/utils/auth.server';
import { useTheme, ThemeSwitch } from '#/routes/resources/theme-switch';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const users = await prisma.user.findMany();
  return { userId, users };
}

export default function Home() {
  const data = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData('root');
  const { userId, users } = data;

  return (
    <div>
      <div>Home</div>

      <Form method="post" action="/logout">
        <Button type="submit">Logout</Button>
      </Form>

      <div style={{ marginTop: '20px' }}>
        <Link to={`/user/${userId}`}>
          <Button>Go to My Profile</Button>
        </Link>
      </div>
      <div className="flex flex-col gap-2 mt-4  p-4">
        {users.map((user) => (
          <Link className="" to={`/user/${user.id}`} key={user.id}>
            <div className="text-2xl p-2 border border-gray-300 rounded-md w-fit">
              {user.name}
            </div>
          </Link>
        ))}
      </div>
      <ThemeSwitch userPreference={rootData?.requestInfo?.userPrefs?.theme} />
    </div>
  );
}
