import { Button } from '#/components/ui/button';
import {
  Form,
  Link,
  redirect,
  useLoaderData,
  type LoaderFunctionArgs,
} from 'react-router';
import { requireUserId } from '#/utils/auth.server';
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  return { userId };
}

export default function Home() {
  const { userId } = useLoaderData();

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
    </div>
  );
}
