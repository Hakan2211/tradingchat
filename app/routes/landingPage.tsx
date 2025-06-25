import { Button } from '#/components/ui/button';
import { requireAnonymous } from '#/utils/auth.server';

import {
  Link,
  redirect,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';

export const meta: MetaFunction = () => {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAnonymous(request);
  return null;
}

export default function Home() {
  return (
    <>
      <div>Landing Page</div>
      <div>
        <h1>Welcome to the Landing Page</h1>
        <p>This is the landing page for the app.</p>
        <p>Lets get started</p>
        <Link to="/login">
          <Button>Login</Button>
        </Link>
        <Link to="/register">
          <Button>Signup</Button>
        </Link>
      </div>
    </>
  );
}
