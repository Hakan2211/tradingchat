import { Link, useLoaderData, type LoaderFunctionArgs } from 'react-router';
import { prisma } from '#/utils/db.server';
import { requireUserId } from '#/utils/auth.server';
import { Button } from '#/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card';
import {
  MessageSquare,
  Bookmark,
  Edit3,
  Trash2,
  Image,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Hash,
  Lock,
  Home as HomeIcon,
} from 'lucide-react';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    take: 6, // Limit to recent users for the welcome screen
  });

  const mainRoom = await prisma.room.findUnique({
    where: { name: 'Main' },
    select: { id: true },
  });

  return { users, currentUser, mainRoom };
}

export default function Home() {
  const { users, currentUser, mainRoom } = useLoaderData<typeof loader>();

  const handleGetStarted = () => {
    // This could navigate to the main chat or set a preference to hide welcome screen
    // For now, we'll scroll to the bottom or you can implement navigation logic
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="flex h-full w-full bg-card overflow-hidden">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Header - Fixed at top */}
        <header className="flex-shrink-0 border-b border-border/60 p-4 z-10">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold capitalize flex items-center gap-2">
              <HomeIcon className="size-6 text-muted-foreground" />
              Welcome Home
            </h1>
          </div>
        </header>

        {/* Main Content - Scrollable container */}
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="max-w-5xl mx-auto p-8 space-y-8">
            {/* Welcome Header */}
            <div className="text-center space-y-6 py-8">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold font-serif bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                  Welcome to BullBearz
                </h2>
                <div className="text-3xl md:text-4xl font-medium font-serif text-[#ccb389]">
                  {currentUser?.name || 'Trader'}
                </div>
              </div>
              <div className="max-w-3xl mx-auto space-y-4">
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                  You're now part of an exclusive community dedicated to
                  mastering the markets. We're thrilled to have you here.
                </p>
                <p className="text-base text-muted-foreground/80">
                  Before you dive in, here's your guide to unlocking the full
                  potential of your membership.
                </p>
              </div>
            </div>

            {/* Disclaimer Section */}
            <Card className="relative overflow-hidden bg-transparent shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br dark:from-slate-900/30 dark:to-slate-800/30" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-3 text-amber-800 dark:text-amber-200 text-lg">
                  <div className="p-2 rounded-lg dark:bg-slate-900/90 bg-slate-100/60">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  Our Purpose & Your Responsibility
                </CardTitle>
                <CardDescription className="text-amber-700 dark:text-amber-200/90 text-base mt-2">
                  The foundation of our community. BullBearz is a professional
                  environment for sharing{' '}
                  <span className="font-semibold">
                    ideas, analysis, and educational content
                  </span>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-4 text-amber-800 dark:text-amber-200">
                <div className="grid gap-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg ">
                    <div className="w-2 h-2 dark:bg-amber-600/70 bg-amber-800/80 rounded-full mt-3 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">
                        Not Financial Advisory
                      </p>
                      <p className="text-sm leading-relaxed">
                        Nothing here should be taken as direct recommendations
                        to buy or sell securities.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-lg ">
                    <div className="w-2 h-2 dark:bg-amber-600/70 bg-amber-800/80 rounded-full mt-3 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Educational Purpose</p>
                      <p className="text-sm leading-relaxed">
                        We share perspectives and experiences for learning and
                        growth only.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-lg ">
                    <div className="w-2 h-2 dark:bg-amber-600/70 bg-amber-800/80 rounded-full mt-3 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Your Responsibility</p>
                      <p className="text-sm leading-relaxed">
                        All trading decisions and outcomes are 100% yours. Trade
                        smart, manage risk.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-4 ">
                  <p className="text-sm leading-relaxed text-center font-medium ring-1 ring-slate-200/80 dark:ring-slate-800/80 rounded-lg p-4">
                    Our mission: Create an environment where we all learn and
                    grow together by navigating the markets with skill and
                    discipline.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Guide */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-muted/20 border border-border/50 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-lg dark:bg-primary/30 bg-primary/90">
                    <Hash className="w-6 h-6 dark:text-slate-100/20 text-slate-900/20" />
                  </div>
                  Navigation Guide
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Your sidebar is command central. Here's what awaits you:
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    {[
                      {
                        color: 'dark:bg-blue-900/90 bg-blue-900/50',
                        name: '#main',
                        desc: 'The main chat room',
                      },
                      {
                        color: 'dark:bg-rose-900/90 bg-rose-900/50',
                        name: '#support',
                        desc: 'Get help and support from the team',
                      },
                      {
                        color: 'bg-green-900/90',
                        name: '#watchlist',
                        desc: 'Your and other members watchlist',
                      },
                    ].map((room, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border/30 hover:border-border/60 transition-all"
                      >
                        <div
                          className={`w-3 h-3 ${room.color} rounded-full shadow-sm`}
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">
                            {room.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {room.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        color: 'dark:bg-purple-900/90 bg-purple-900/50',
                        name: '#announcements',
                        desc: 'Important updates from moderators (in consideration)',
                      },

                      {
                        color: 'dark:bg-pink-900/90 bg-pink-900/50',
                        name: '#introductions',
                        desc: 'Your first stop - say hello! (in consideration)',
                      },
                      {
                        color: 'dark:bg-orange-900/90 bg-orange-900/50',
                        name: '#crypto',
                        desc: 'Cryptocurrency insights (in consideration)',
                      },
                    ].map((room, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border/30 hover:border-border/60 transition-all"
                      >
                        <div
                          className={`w-3 h-3 ${room.color} rounded-full shadow-sm`}
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">
                            {room.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {room.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg dark:bg-primary/60 bg-primary/90">
                      <Lock className="w-5 h-5 dark:text-slate-100/20 text-slate-900/20" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">
                        Private Messages
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Connect directly with fellow traders. Click any profile
                        at the right sidebar in the chatroom to start a private
                        conversation.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chat Features */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-muted/20 border border-border/50 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-lg dark:bg-primary/30 bg-primary/90">
                    <MessageSquare className="w-6 h-6 dark:text-slate-100/20 text-slate-900/20" />
                  </div>
                  Know the Platform
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Powerful tools to enhance your trading discussions:
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="grid gap-6 lg:grid-cols-2">
                  {[
                    {
                      icon: Image,
                      title: 'Media Sharing',
                      desc: 'Share charts, screenshots, and analysis visuals instantly',
                      color: 'dark:text-blue-600/90 text-blue-600/50',
                    },
                    {
                      icon: Edit3,
                      title: 'Message Editing',
                      desc: 'Refine your thoughts with seamless message editing',
                      color: 'dark:text-green-600/90 text-green-600/50',
                    },
                    {
                      icon: Trash2,
                      title: 'Message Management',
                      desc: 'Keep discussions clean with message deletion',
                      color: 'dark:text-red-600/90 text-red-600/50',
                    },
                    {
                      icon: Bookmark,
                      title: 'Smart Bookmarking',
                      desc: 'Save brilliant insights and winning strategies for later',
                      color: 'dark:text-purple-600/90 text-purple-600/50',
                    },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-4 p-5 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 hover:border-border/60 transition-all"
                    >
                      <div
                        className={`p-3 rounded-lg bg-white/80 dark:bg-muted/80 ${feature.color}`}
                      >
                        <feature.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">
                          {feature.title}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Community Members */}
            {/* <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-muted/20 border border-border/50 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-lg dark:bg-primary/30 bg-primary/90">
                    <UserPlus className="w-6 h-6 dark:text-slate-100/20 text-slate-900/20" />
                  </div>
                  Your Trading Community
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Connect with experienced traders and fellow learners:
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {users.map((user) => (
                    <Link key={user.id} to={`/user/${user.id}`}>
                      <div className="group flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-muted/40 to-muted/20 border border-border/30 hover:border-border/60 hover:shadow-md transition-all duration-200">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
                          <span className="font-semibold text-primary text-lg">
                            {user.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {user.name}
                          </p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            Active Trader
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card> */}

            {/* Call to Action */}
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0" />
              <CardContent className="relative pt-8 pb-8">
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center gap-3">
                    <div className="p-3 rounded-full dark:bg-primary/30 bg-primary/90">
                      <TrendingUp className="w-8 h-8 dark:text-slate-100/20 text-slate-900/20" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">
                      Ready to Begin?
                    </h3>
                  </div>
                  <div className="max-w-2xl mx-auto space-y-3">
                    <p className="text-lg text-muted-foreground">
                      Your journey to market mastery starts now. Join the
                      conversation, ask questions, and share your insights.
                    </p>
                    <p className="text-sm text-muted-foreground/80">
                      The best traders never stop learning. Welcome to your new
                      edge.
                    </p>
                  </div>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
                    size="lg"
                  >
                    <Link
                      className="flex items-center justify-center"
                      to={`/chat/${mainRoom?.id}`}
                    >
                      Enter the Main Chatroom
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
