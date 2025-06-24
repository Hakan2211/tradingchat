import { useNavigate } from 'react-router';
import { hasInAppHistory } from '#/utils/client-history';
import { Button } from '#/components/ui/button';

type RedirectBackButtonProps = {
  /** The path to redirect to if no in-app history exists. @default '/' */
  fallback?: string;
} & React.ComponentProps<typeof Button>;

export function RedirectBackButton({
  fallback = '/',
  children = 'Go Back',
  ...props
}: RedirectBackButtonProps) {
  const navigate = useNavigate();

  const goBack = () => {
    if (hasInAppHistory()) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <Button onClick={goBack} {...props}>
      {children}
    </Button>
  );
}
