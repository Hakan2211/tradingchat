import { useForm, getFormProps } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { invariantResponse } from '../../utils/misc';
import {
  data,
  redirect,
  useFetcher,
  useFetchers,
  type ActionFunctionArgs,
} from 'react-router';
import { ServerOnly } from 'remix-utils/server-only';
import { z } from 'zod';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useHints, useOptionalHints } from '../../utils/client-hints';
import {
  useOptionalRequestInfo,
  useRequestInfo,
} from '../../utils/request-info';
import { type Theme, setTheme } from '../../utils/theme.server';
import { Button } from '#/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
} from '#/components/ui/sidebar';

const ThemeFormSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']),
  // this is useful for progressive enhancement
  redirectTo: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, {
    schema: ThemeFormSchema,
  });

  invariantResponse(submission.status === 'success', 'Invalid theme received');

  const { theme, redirectTo } = submission.value;

  const responseInit = {
    headers: { 'set-cookie': await setTheme(theme) },
  };

  if (redirectTo) {
    return redirect(redirectTo, responseInit);
  } else {
    return data({ result: submission.reply() }, responseInit);
  }
}

export function ThemeSwitch({
  userPreference,
}: {
  userPreference?: Theme | null;
}) {
  const fetcher = useFetcher<typeof action>();
  const requestInfo = useRequestInfo();

  const [form] = useForm({
    id: 'theme-switch',
    lastResult: fetcher.data?.result,
  });

  const optimisticMode = useOptimisticThemeMode();
  const mode = optimisticMode ?? userPreference ?? 'system';

  const handleThemeChange = (theme: Theme) => {
    const formData = new FormData();
    formData.append('theme', theme);
    fetcher.submit(formData, {
      method: 'POST',
      action: '/resources/theme-switch',
    });
  };

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-4 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:gap-0"
                aria-label={`Switch theme. Current theme: ${mode}`}
              >
                {mode === 'light' && <Sun className="size-4" />}
                {mode === 'dark' && <Moon className="size-4" />}
                {mode === 'system' && <Laptop className="size-4" />}
                <span className="capitalize group-data-[collapsible=icon]:hidden">
                  {mode}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start">
              <DropdownMenuItem onSelect={() => handleThemeChange('light')}>
                <Sun className="mr-2 size-4" />
                <span>Light</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleThemeChange('dark')}>
                <Moon className="mr-2 size-4" />
                <span>Dark</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleThemeChange('system')}>
                <Laptop className="mr-2 size-4" />
                <span>System</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticThemeMode() {
  const fetchers = useFetchers();
  const themeFetcher = fetchers.find(
    (f) => f.formAction === '/resources/theme-switch'
  );

  if (themeFetcher && themeFetcher.formData) {
    const submission = parseWithZod(themeFetcher.formData, {
      schema: ThemeFormSchema,
    });

    if (submission.status === 'success') {
      return submission.value.theme;
    }
  }
}

/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
  const hints = useHints();
  const requestInfo = useRequestInfo();
  const optimisticMode = useOptimisticThemeMode();
  if (optimisticMode) {
    return optimisticMode === 'system' ? hints.theme : optimisticMode;
  }
  return requestInfo.userPrefs.theme ?? hints.theme;
}

export function useOptionalTheme() {
  const optionalHints = useOptionalHints();
  const optionalRequestInfo = useOptionalRequestInfo();
  const optimisticMode = useOptimisticThemeMode();
  if (optimisticMode) {
    return optimisticMode === 'system' ? optionalHints?.theme : optimisticMode;
  }
  return optionalRequestInfo?.userPrefs.theme ?? optionalHints?.theme;
}
