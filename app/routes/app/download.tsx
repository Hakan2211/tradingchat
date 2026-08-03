import { useLoaderData, Link, type LoaderFunctionArgs } from 'react-router';
import { Download, Monitor, HardDrive, WifiOff, Cpu } from 'lucide-react';
import { Button } from '#/components/ui/button';
import { getChartLogAccess, CHARTLOG_VERSION } from '#/utils/chartlog.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const access = await getChartLogAccess(request);
  return { allowed: access.allowed, version: CHARTLOG_VERSION };
}

const requirements = [
  { icon: Monitor, label: 'Windows 10 / 11', detail: '64-bit' },
  { icon: HardDrive, label: '~6 MB installer', detail: 'Installs in seconds' },
  { icon: WifiOff, label: 'Works offline', detail: 'No account inside the app' },
  { icon: Cpu, label: 'Local AI (optional)', detail: 'Needs a GPU, downloads separately' },
];

export default function DownloadPage() {
  const { allowed, version } = useLoaderData<typeof loader>();

  return (
    <div className="h-full overflow-y-auto bg-card">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">ChartLog</h1>
        <p className="text-muted-foreground mt-2">
          The screenshot-first trading journal, included with your yearly
          membership.
        </p>

        {allowed ? (
          <>
            <div className="mt-8">
              <Button asChild size="lg">
                <a href="/resources/installer">
                  <Download className="mr-2 h-5 w-5" />
                  Download for Windows
                </a>
              </Button>
              <p className="text-muted-foreground mt-3 text-sm">
                Version {version} · Windows 10 and 11
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {requirements.map((req) => (
                <div
                  key={req.label}
                  className="flex items-start gap-3 rounded-lg border p-4"
                >
                  <req.icon className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">{req.label}</div>
                    <div className="text-muted-foreground text-sm">
                      {req.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 space-y-3 border-t pt-6">
              <h2 className="font-semibold">Good to know</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                ChartLog never asks you to sign in and never phones home. Your
                journal is a database file on your own disk — it keeps working
                whatever happens to your membership, and it is yours to back up
                or move whenever you like.
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Windows may warn you about an unrecognised publisher the first
                time you run the installer. Choose{' '}
                <span className="text-foreground font-medium">More info</span>{' '}
                then{' '}
                <span className="text-foreground font-medium">Run anyway</span>.
              </p>
            </div>
          </>
        ) : (
          <div className="mt-8 rounded-lg border p-6">
            <h2 className="font-semibold">Included with the yearly plan</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              ChartLog comes with a yearly membership. Switch your plan and the
              download appears here straight away.
            </p>
            <Button asChild className="mt-4">
              <Link to="/pricing">See plans</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
