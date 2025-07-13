import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog';
import { Button } from '#/components/ui/button';
import { Label } from '#/components/ui/label';
import { Input } from '#/components/ui/input';
import { useFetcher } from 'react-router';
import { getFormProps, useForm, getInputProps } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import ErrorAlert from '#/components/errorAlert/errorAlert';
import { useEffect, useRef, useState } from 'react';
import { ChangePasswordSchema } from '#/types/changePasswordTypes';
import { Lock, Eye, EyeOff } from 'lucide-react';

export function ChangePasswordDialog() {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === 'submitting';

  const [open, setOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [form, fields] = useForm({
    lastResult: fetcher.data,
    constraint: getZodConstraint(ChangePasswordSchema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: ChangePasswordSchema });
    },
    shouldValidate: 'onBlur',
    id: 'change-password-form',
  });

  const previousStateRef = useRef(fetcher.state);

  useEffect(() => {
    if (previousStateRef.current === 'submitting' && fetcher.state === 'idle') {
      if (!fetcher.data) {
        setOpen(false);
        form.reset();
      }
    }

    previousStateRef.current = fetcher.state;
  }, [fetcher.state, fetcher.data, form]);

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 !bg-card !text-card-foreground cursor-pointer"
        >
          <Lock className="size-4" />
          Change Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold text-card-foreground">
            Change Your Password
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter your current password to set a new one. Your new password must
            be secure and different from your current one.
          </DialogDescription>
        </DialogHeader>
        <fetcher.Form
          method="POST"
          action="/resources/change-password"
          className="space-y-6"
          {...getFormProps(form)}
        >
          <ErrorAlert id={form.errorId} errors={form.errors} />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor={fields.currentPassword.id}
                className="text-sm font-medium text-card-foreground"
              >
                Current Password
              </Label>
              <div className="relative">
                <Input
                  {...getInputProps(fields.currentPassword, {
                    type: 'password',
                  })}
                  type={showPasswords.current ? 'text' : 'password'}
                  className="pr-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/50"
                  placeholder="Enter your current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-accent/50"
                  onClick={() => togglePasswordVisibility('current')}
                >
                  {showPasswords.current ? (
                    <EyeOff className="size-4 text-muted-foreground" />
                  ) : (
                    <Eye className="size-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <ErrorAlert
                id={fields.currentPassword.errorId}
                errors={fields.currentPassword.errors}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor={fields.newPassword.id}
                className="text-sm font-medium text-card-foreground"
              >
                New Password
              </Label>
              <div className="relative">
                <Input
                  {...getInputProps(fields.newPassword, { type: 'password' })}
                  type={showPasswords.new ? 'text' : 'password'}
                  className="pr-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/50"
                  placeholder="Enter your new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-accent/50"
                  onClick={() => togglePasswordVisibility('new')}
                >
                  {showPasswords.new ? (
                    <EyeOff className="size-4 text-muted-foreground" />
                  ) : (
                    <Eye className="size-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <ErrorAlert
                id={fields.newPassword.errorId}
                errors={fields.newPassword.errors}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor={fields.confirmPassword.id}
                className="text-sm font-medium text-card-foreground"
              >
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  {...getInputProps(fields.confirmPassword, {
                    type: 'password',
                  })}
                  type={showPasswords.confirm ? 'text' : 'password'}
                  className="pr-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/50"
                  placeholder="Confirm your new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-accent/50"
                  onClick={() => togglePasswordVisibility('confirm')}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="size-4 text-muted-foreground" />
                  ) : (
                    <Eye className="size-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <ErrorAlert
                id={fields.confirmPassword.errorId}
                errors={fields.confirmPassword.errors}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 bg-transparent hover:bg-accent/50 hover:text-accent-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-accent-foreground"
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
