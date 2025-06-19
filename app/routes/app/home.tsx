import { Button } from '#/components/ui/button';
import { Form } from 'react-router';

export default function Home() {
  return (
    <div>
      <div>Home</div>
      <Form method="post" action="/logout">
        <Button type="submit">Logout</Button>
      </Form>
    </div>
  );
}
