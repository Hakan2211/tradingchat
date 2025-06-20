import {
  Form,
  Link,
  useRouteLoaderData,
  useActionData,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import { useState, useRef } from 'react';
import { z } from 'zod';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Textarea } from '#/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { Camera } from 'lucide-react';
import { GeneralErrorBoundary } from '#/components/errorBoundary/errorBoundary';
import { useIsSubmitting } from '#/utils/misc';
import { getSession, commitSession } from '#/utils/session.server';
import ErrorAlert from '#/components/errorAlert/errorAlert';
import type { loader as userLoader } from './user';
import { requireUserId } from '#/utils/auth.server';
import { invariantResponse } from '#/utils/misc';
import { prisma } from '#/utils/db.server';

const UserFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
});

export async function loader({ params, request }: LoaderFunctionArgs) {
  const loggedInUserId = await requireUserId(request);
  invariantResponse(
    loggedInUserId === params.id,
    'You are not authorized to edit this profile.',
    { status: 403 }
  );
  return null;
}

export async function action({ request, params }: ActionFunctionArgs) {
  const loggedInUserId = await requireUserId(request);
  invariantResponse(loggedInUserId === params.id, 'Forbidden', { status: 403 });

  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: UserFormSchema });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  await prisma.user.update({
    where: { id: loggedInUserId },
    data: submission.value,
  });

  const session = await getSession(request.headers.get('Cookie'));
  //   session.flash('toast', { message: 'Profile updated successfully!' });
  const response = redirect(`/user/${loggedInUserId}`);
  response.headers.append('Set-Cookie', await commitSession(session));
  return response;
}

export default function ProfileEdit() {
  const { user } = useRouteLoaderData('routes/user/user') as Awaited<
    ReturnType<typeof userLoader>
  >;
  const lastResult = useActionData<typeof action>();
  const isSubmitting = useIsSubmitting();

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, fields] = useForm({
    lastResult,
    defaultValue: user,
    constraint: getZodConstraint(UserFormSchema),
    onValidate: ({ formData }) =>
      parseWithZod(formData, { schema: UserFormSchema }),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // This is a client-side only preview, it doesn't actually upload yet
    const file = event.target.files?.[0];
    if (file) setPreviewImage(URL.createObjectURL(file));
  };

  return (
    <>
      <Form method="POST" {...getFormProps(form)} encType="multipart/form-data">
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">
              Edit Profile
            </h1>
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" asChild className="...">
                <Link to="..">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting} className="...">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="grid lg:grid-cols-5 gap-12">
            <div className="lg:col-span-2 flex flex-col items-center">
              {/* Avatar Uploader */}
              <div className="relative group">
                <Avatar className="w-40 h-40 ...">
                  <AvatarImage
                    src={
                      previewImage ||
                      (user?.image ? `/api/images/${user.image.id}` : undefined)
                    }
                  />
                  <AvatarFallback>{/* ... */}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 ..."
                >
                  <Camera className="w-8 h-8 text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="profileImage" // Give it a name to be submitted
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="lg:col-span-3 space-y-8">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor={fields.name.id}>Full Name</Label>
                <Input {...getInputProps(fields.name, { type: 'text' })} />
                <ErrorAlert
                  id={fields.name.errorId}
                  errors={fields.name.errors}
                />
              </div>
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor={fields.username.id}>Username</Label>
                <Input {...getInputProps(fields.username, { type: 'text' })} />
                <ErrorAlert
                  id={fields.username.errorId}
                  errors={fields.username.errors}
                />
              </div>
              {/* Bio Field */}
              <div className="space-y-2">
                <Label htmlFor={fields.bio.id}>Bio</Label>
                <Textarea {...getInputProps(fields.bio, { type: 'text' })} />
                <ErrorAlert
                  id={fields.bio.errorId}
                  errors={fields.bio.errors}
                />
              </div>
              {/* Read-only Email Field */}
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={user?.email} readOnly disabled />
              </div>
            </div>
          </div>
        </div>
      </Form>
    </>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
