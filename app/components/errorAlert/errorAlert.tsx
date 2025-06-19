import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert';
import { TriangleAlert } from 'lucide-react';

/**
 * A reusable component for rendering a list of errors using the shadcn/ui Alert.
 * @param id The id of the error list, used for aria-describedby.
 * @param errors A list of strings.
 */

export default function ErrorAlert({
  id,
  errors,
}: {
  id?: string;
  errors?: Array<string> | null;
}) {
  if (!errors || errors.length === 0) return null;
  return (
    <Alert variant="destructive" className="mt-2">
      <TriangleAlert className="h-4 w-4" />
      {/* <AlertTitle>Error</AlertTitle> */}
      <AlertDescription>
        <ul>
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
