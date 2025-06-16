import { Button } from '#/components/ui/button';
import type { Route } from './+types/home';
import { Link } from 'react-router';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export default function Home() {
  return (
    <>
      <div>Landing Page</div>
      <div>
        <h1>Welcome to the Landing Page</h1>
        <p>This is the landing page for the app.</p>
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
