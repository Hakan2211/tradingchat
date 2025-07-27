// app/components/journal/TradeForm.tsx
import * as React from 'react';
import { useFetcher } from 'react-router';
import { JournalImageUploader } from './journalImageUploader';
import { Button } from '#/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '#/components/ui/card';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import { Textarea } from '#/components/ui/textarea';
import { Separator } from '#/components/ui/separator';
import { toast } from 'sonner';

import {
  CalendarIcon,
  Loader2,
  TrendingUp,
  DollarSign,
  BookOpen,
  Target,
  Lightbulb,
  Trash2,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover';
import { Calendar } from '#/components/ui/calendar';
import { RedirectBackButton } from '#/components/navigationTracker/redirect-back-button';
import { cn } from '#/lib/utils';
import { format } from 'date-fns';
import { TimePicker } from '#/components/ui/time-picker';
import type { TradeEntry, TradeImage } from '@prisma/client';

type TradeWithImages = TradeEntry & { images: TradeImage[] };
interface TradeFormProps {
  initialData?: TradeWithImages;
}

export function TradeForm({ initialData }: TradeFormProps) {
  const fetcher = useFetcher();
  const isEditing = !!initialData;

  const [tradeDate, setTradeDate] = React.useState<Date | undefined>(
    initialData ? new Date(initialData.tradeDate) : new Date()
  );
  const [existingImages, setExistingImages] = React.useState(
    initialData?.images || []
  );
  const [filesToUpload, setFilesToUpload] = React.useState<File[]>([]);
  const [imagesToDelete, setImagesToDelete] = React.useState<string[]>([]);

  const isSubmitting = fetcher.state !== 'idle';

  const handleRemoveExistingImage = (imageId: string) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
    setImagesToDelete((prev) => [...prev, imageId]);
  };

  const handleFilesChange = React.useCallback((files: File[]) => {
    setFilesToUpload(files);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const finalImageCount = existingImages.length + filesToUpload.length;
    if (finalImageCount === 0) {
      toast.error('Please upload or keep at least one chart image.');
      return;
    }

    if (!tradeDate) {
      toast.error('Please select a valid trade date and time.');
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    filesToUpload.forEach((file) => {
      formData.append('chartImage', file);
    });

    formData.set('tradeDate', tradeDate.toISOString());

    toast.info(`Submitting ${filesToUpload.length} images...`);

    imagesToDelete.forEach((id) => formData.append('imagesToDelete', id));
    const actionPath = isEditing
      ? `/journal/edit/${initialData.id}`
      : '/journal/new';

    fetcher.submit(formData, {
      method: 'POST',
      encType: 'multipart/form-data',
      action: actionPath,
    });
  };

  React.useEffect(() => {
    if (fetcher.data) {
      // @ts-ignore
      if (fetcher.data.success) {
        // @ts-ignore
        toast.success(
          `${fetcher.data.images.length} images uploaded successfully!`
        );
      } else {
        // @ts-ignore
        toast.error(fetcher.data.error || 'Something went wrong.');
      }
    }
  }, [fetcher.data]);

  return (
    <div className="bg-card h-full">
      {/* Header with Back Button */}
      <div className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Back Button */}
              <RedirectBackButton
                variant="outline"
                fallback="/journal"
                className="bg-transparent border-border/50 hover:border-border transition-colors cursor-pointer"
              />

              {/* Page Title */}
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold">
                    {isEditing
                      ? 'Edit Journal Entry'
                      : 'Create New Journal Entry'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Document your trading experience and learn from each trade
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        <fetcher.Form onSubmit={handleSubmit} encType="multipart/form-data">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <div className="sr-only">
                <CardTitle>
                  {isEditing
                    ? 'Edit Journal Entry'
                    : 'Create New Journal Entry'}
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-8">
              {/* Chart Images Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <Label className="text-base font-medium">
                    Chart Screenshots
                  </Label>
                </div>
                {isEditing && existingImages.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <Label className="text-base font-medium">
                      Current Images
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {existingImages.map((image) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={`/resources/journal-images/${image.id}`}
                            className="rounded-md aspect-video object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => handleRemoveExistingImage(image.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <JournalImageUploader onFilesChange={handleFilesChange} />
              </div>

              <Separator />

              {/* Basic Trade Info Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h3 className="text-base font-medium">Trade Details</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="ticker"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Ticker Symbol
                    </Label>
                    <Input
                      id="ticker"
                      name="ticker"
                      placeholder="e.g., AAPL, TSLA"
                      required
                      className="h-11"
                      defaultValue={initialData?.ticker}
                    />
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Trade Date & Time
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full sm:flex-1 justify-start text-left font-normal h-11 bg-transparent dark:bg-input/30 border-input hover:bg-transparent dark:hover:bg-input/30 hover:border-input focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                              !tradeDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              {tradeDate
                                ? format(tradeDate, 'PPP')
                                : 'Pick a date'}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={tradeDate}
                            onSelect={(day) => day && setTradeDate(day)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {tradeDate && (
                        <TimePicker
                          date={tradeDate}
                          setDate={setTradeDate}
                          className="w-full sm:w-[180px] flex-shrink-0"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Direction</Label>
                    <Select
                      name="direction"
                      required
                      defaultValue={initialData?.direction}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select direction..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LONG">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Long
                          </div>
                        </SelectItem>
                        <SelectItem value="SHORT">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            Short
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Outcome</Label>
                    <Select
                      name="outcome"
                      required
                      defaultValue={initialData?.outcome}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select outcome..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WIN">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Win
                          </div>
                        </SelectItem>
                        <SelectItem value="LOSS">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            Loss
                          </div>
                        </SelectItem>
                        <SelectItem value="BREAKEVEN">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            Breakeven
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="pnl"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <DollarSign className="h-4 w-4" />
                      Profit/Loss ($)
                    </Label>
                    <Input
                      id="pnl"
                      name="pnl"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 150.50 or -75.25"
                      className="h-11"
                      defaultValue={initialData?.pnl ?? ''}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Analysis Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h3 className="text-base font-medium">Trade Analysis</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="tradeThesis"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <Target className="h-4 w-4" />
                      Trade Thesis (The "Why")
                    </Label>
                    <Textarea
                      id="tradeThesis"
                      name="tradeThesis"
                      placeholder="Why did you take this trade? What was your plan?"
                      rows={4}
                      className="resize-none"
                      defaultValue={initialData?.tradeThesis ?? ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="executionQuality"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Execution Notes (The "How")
                    </Label>
                    <Textarea
                      id="executionQuality"
                      name="executionQuality"
                      placeholder="What actually happened? Did you follow your plan?"
                      rows={4}
                      className="resize-none"
                      defaultValue={initialData?.executionQuality ?? ''}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="lessonsLearned"
                    className="text-sm font-medium flex items-center gap-2"
                  >
                    <Lightbulb className="h-4 w-4" />
                    Lessons & Improvements (The "What If")
                  </Label>
                  <Textarea
                    id="lessonsLearned"
                    name="lessonsLearned"
                    placeholder="What could you have done better? What's the key takeaway?"
                    rows={3}
                    className="resize-none"
                    defaultValue={initialData?.lessonsLearned ?? ''}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-3 pt-6 border-t bg-muted/20">
              <input
                type="hidden"
                name="_intent"
                value={isEditing ? 'update' : 'create'}
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-8 cursor-pointer hover:bg-muted-foreground/10"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isSubmitting ? 'Saving Entry...' : 'Save Journal Entry'}
              </Button>
            </CardFooter>
          </Card>
        </fetcher.Form>
      </div>
    </div>
  );
}
