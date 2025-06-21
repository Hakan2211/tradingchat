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
import { getUserImagePath, useIsSubmitting } from '#/utils/misc';
import ErrorAlert from '#/components/errorAlert/errorAlert';
import type { loader as userLoader } from './user';
import { requireUser } from '#/utils/auth.server';
import { invariantResponse } from '#/utils/misc';
import { prisma } from '#/utils/db.server';
import { processImage } from '#/utils/image.server';
import { parseFormData, type FileUpload } from '@mjackson/form-data-parser';

const MAX_IMAGE_SIZE = 1024 * 1024 * 5; // 5MB

const UserFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
  profileImage: z
    .instanceof(File)
    .refine((file) => file.size > 0, 'A profile picture is required.')
    .refine(
      (file) => file.size <= MAX_IMAGE_SIZE,
      'Image size must be less than 5MB.'
    )
    .optional(),
});

const TransformedUserFormSchema = UserFormSchema.transform(
  async ({ profileImage, ...restOfData }) => {
    if (!profileImage) {
      return { ...restOfData, imageData: undefined };
    }
    const imageBuffer = Buffer.from(await profileImage.arrayBuffer());
    const optimizedImage = await processImage(imageBuffer);
    return {
      ...restOfData,
      imageData: {
        blob: optimizedImage.data,
        contentType: optimizedImage.contentType,
      },
    };
  }
);

export async function loader({ params, request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  invariantResponse(
    user.id === params.id,
    'You are not authorized to edit this profile.',
    { status: 403 }
  );
}

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireUser(request);
  invariantResponse(user.id === params.id, 'Forbidden', { status: 403 });

  let formData;
  try {
    formData = await parseFormData(request, {
      maxFileSize: MAX_IMAGE_SIZE,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('File size exceeds')) {
      return reply({
        initialValue: {
          profileImage: null,
        },
        error: {
          profileImage: [
            'The image you selected is too large. Please choose a file smaller than 5MB.',
          ],
        },
      });
    }
    // If it's a different, unexpected error, let the ErrorBoundary handle it.
    throw error;
  }

  const submission = await parseWithZod(formData, {
    schema: TransformedUserFormSchema,
    async: true,
  });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  const { imageData, ...userData } = submission.value;

  await prisma.$transaction(async (tx) => {
    // 1. Update the user's text fields.
    await tx.user.update({
      where: { id: user.id },
      data: userData,
    });

    // 2. If a new image was uploaded, we replace the old one entirely.
    if (imageData) {
      // First, delete the user's old image, if one exists.
      // We don't care if this fails (e.g., if they had no image before).
      await tx.userImage.delete({ where: { userId: user.id } }).catch(() => {});

      // Next, create a brand new UserImage row.
      // This row will have a new, unique, auto-generated `id`.
      await tx.user.update({
        where: { id: user.id },
        data: {
          image: {
            create: {
              altText: `${userData.name}'s avatar`,
              contentType: imageData.contentType,
              blob: imageData.blob,
            },
          },
        },
      });
    }
  });

  return redirect(`/user/${params.id}`);
}

// Flash messages and redirects remain the same.
//const session = await getSession(request.headers.get('Cookie'));
// session.flash('toast', { message: 'Profile updated successfully!' });
// const response = redirect(`/user/${loggedInUserId}`);
//response.headers.append('Set-Cookie', await commitSession(session));
//return response;}

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
    defaultValue: {
      ...user,
      profileImage: undefined,
    },
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
                      (user?.image
                        ? getUserImagePath(user.image.id)
                        : undefined)
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
                  {...getInputProps(fields.profileImage, { type: 'file' })}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <ErrorAlert
                id={fields.profileImage.errorId}
                errors={fields.profileImage.errors}
              />
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
function reply(arg0: {
  initialValue: { profileImage: null };
  error: { profileImage: string[] };
}) {
  throw new Error('Function not implemented.');
}
