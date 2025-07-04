import {
  Form,
  Link,
  useRouteLoaderData,
  useActionData,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  useLoaderData,
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
import { prisma } from '#/utils/db.server';
import { processImage } from '#/utils/image.server';
import { parseFormData, type FileUpload } from '@mjackson/form-data-parser';
import { requirePermission } from '#/utils/permission.server';
import { getInitials } from '#/utils/misc';

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
  await requirePermission(request, 'update:user', params.id);
  const userToEdit = await prisma.user.findUniqueOrThrow({
    where: { id: params.id },
  });
  return {};
}

export async function action({ request, params }: ActionFunctionArgs) {
  const authorizedUserId = await requirePermission(
    request,
    'update:user',
    params.id
  );

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
      where: { id: authorizedUserId },
      data: userData,
    });

    // 2. If a new image was uploaded, we replace the old one entirely.
    if (imageData) {
      // First, delete the user's old image, if one exists.
      // We don't care if this fails (e.g., if they had no image before).
      await tx.userImage
        .delete({ where: { userId: authorizedUserId } })
        .catch(() => {});

      // Next, create a brand new UserImage row.
      // This row will have a new, unique, auto-generated `id`.
      await tx.user.update({
        where: { id: authorizedUserId },
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
        {/* Header - Fixed at top */}
        <header className="flex-shrink-0 border-b border-border/60 p-4 z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">
              Edit Profile
            </h1>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                asChild
                className="rounded-xl"
              >
                <Link to="..">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content - Scrollable */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-5 gap-12">
              <div className="lg:col-span-2 flex flex-col items-center">
                {/* Avatar Uploader */}
                <div className="relative group">
                  <Avatar className="w-40 h-40 rounded-full ring-4 ring-border overflow-hidden">
                    <AvatarImage
                      src={
                        previewImage ||
                        (user?.image
                          ? getUserImagePath(user.image.id)
                          : undefined)
                      }
                    />
                    <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                      {getInitials(user?.name ?? '')}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full flex items-center justify-center"
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

              <div className="lg:col-span-3 space-y-6">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor={fields.name.id}
                    className="text-sm font-medium text-foreground"
                  >
                    Full Name
                  </Label>
                  <Input {...getInputProps(fields.name, { type: 'text' })} />
                  <ErrorAlert
                    id={fields.name.errorId}
                    errors={fields.name.errors}
                  />
                </div>

                {/* Username Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor={fields.username.id}
                    className="text-sm font-medium text-foreground"
                  >
                    Username
                  </Label>
                  <Input
                    {...getInputProps(fields.username, { type: 'text' })}
                  />
                  <ErrorAlert
                    id={fields.username.errorId}
                    errors={fields.username.errors}
                  />
                </div>

                {/* Bio Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor={fields.bio.id}
                    className="text-sm font-medium text-foreground"
                  >
                    Bio
                  </Label>
                  <Textarea
                    {...getInputProps(fields.bio, { type: 'text' })}
                    placeholder="Tell us a bit about yourself..."
                    className="min-h-[100px]"
                  />
                  <ErrorAlert
                    id={fields.bio.errorId}
                    errors={fields.bio.errors}
                  />
                </div>

                {/* Read-only Email Field */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Email Address
                  </Label>
                  <Input
                    value={user?.email}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact support to change your email address
                  </p>
                </div>
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
